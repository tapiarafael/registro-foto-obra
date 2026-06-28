import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import {
  getServices, createService, getServicesForDateUnit, getOrCreatePhotoGroup,
  type Service,
} from '@/db/database';
import { todayDateString } from '@/services/photoService';
import HierarchyCard from '@/components/HierarchyCard';
import BreadcrumbBar from '@/components/BreadcrumbBar';
import EmptyState from '@/components/EmptyState';

const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

export default function RegistrarServicos() {
  const c = colors.light;
  const router = useRouter();
  const { project, captureNav, setCaptureNav, setPhotoGroupId } = useApp();
  const [items, setItems] = useState<Service[]>([]);
  const [doneIds, setDoneIds] = useState<Set<number>>(new Set());

  const [addVisible, setAddVisible] = useState(false);
  const [addName, setAddName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const reload = useCallback(async () => {
    if (!project) return;
    const svcs = await getServices(project.id);
    setItems(svcs);
    if (captureNav.unit) {
      const done = await getServicesForDateUnit(captureNav.unit.id, todayDateString());
      setDoneIds(new Set(done.map((s) => s.id)));
    } else {
      setDoneIds(new Set());
    }
  }, [project, captureNav.unit]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const select = async (service: Service) => {
    if (!captureNav.sessionId || !captureNav.unit) return;
    const groupId = await getOrCreatePhotoGroup(captureNav.sessionId, captureNav.unit.id, service.id);
    setCaptureNav({ service });
    setPhotoGroupId(groupId);
    router.push('/registrar/camera');
  };

  const openAdd = () => {
    setAddName('');
    setAddError(null);
    setAddVisible(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const saveNewService = async () => {
    const name = addName.trim().replace(/\s+/g, ' ');
    if (!name) { setAddError('Informe o nome do serviço.'); return; }
    if (name.length > 80) { setAddError('Nome muito longo (máximo 80 caracteres).'); return; }
    const dup = items.find(s => normalize(s.name) === normalize(name));
    if (dup) {
      setAddError('Já existe um serviço com este nome.');
      return;
    }
    if (!project) return;
    setAddBusy(true);
    try {
      const serviceId = await createService(project.id, name);
      const newItems = await getServices(project.id);
      setItems(newItems);
      setAddVisible(false);
      setAddName('');
      setAddError(null);
      if (captureNav.sessionId && captureNav.unit) {
        const groupId = await getOrCreatePhotoGroup(captureNav.sessionId, captureNav.unit.id, serviceId);
        const newService = newItems.find(s => s.id === serviceId);
        if (newService) setCaptureNav({ service: newService });
        setPhotoGroupId(groupId);
        router.push('/registrar/camera');
      }
    } finally { setAddBusy(false); }
  };

  const AddButton = (
    <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.75}>
      <Feather name="plus-circle" size={20} color={c.primary} />
      <Text style={styles.addBtnText}>Adicionar novo serviço</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <BreadcrumbBar items={[
        captureNav.block?.name ?? '', captureNav.building?.name ?? '',
        captureNav.floor?.name ?? '', captureNav.unit?.name ?? '',
      ]} />

      {items.length === 0 ? (
        <View style={{ flex: 1 }}>
          <EmptyState
            icon="tool"
            title="Nenhum serviço"
            message="Cadastre serviços na aba Estrutura ou adicione um agora."
          />
          <View style={styles.emptyAdd}>{AddButton}</View>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.list}
          ListFooterComponent={<View style={styles.footer}>{AddButton}</View>}
          renderItem={({ item }) => (
            <HierarchyCard
              title={item.name}
              left={<View style={styles.icon} />}
              onPress={() => select(item)}
              showChevron={false}
              done={doneIds.has(item.id)}
            />
          )}
        />
      )}

      <Modal visible={addVisible} transparent animationType="fade" onRequestClose={() => setAddVisible(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Adicionar novo serviço</Text>
            <TextInput
              ref={inputRef}
              style={[styles.input, addError ? styles.inputError : null]}
              value={addName}
              onChangeText={(t) => { setAddName(t); setAddError(null); }}
              placeholder="Nome do serviço"
              placeholderTextColor={colors.light.mutedForeground}
              maxLength={80}
              onSubmitEditing={saveNewService}
              returnKeyType="done"
            />
            {addError ? <Text style={styles.errorText}>{addError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddVisible(false)} disabled={addBusy}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!addName.trim() || addBusy) && styles.disabled]}
                onPress={saveNewService}
                disabled={!addName.trim() || addBusy}
              >
                {addBusy
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveText}>Adicionar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  list: { padding: 16, gap: 10, paddingBottom: 16 },
  icon: { width: 8, height: 40, borderRadius: 4, backgroundColor: c.accent },
  footer: { marginTop: 4 },
  emptyAdd: { paddingHorizontal: 16, paddingBottom: 24 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: c.primary,
    borderStyle: 'dashed', backgroundColor: c.card, minHeight: 52,
  },
  addBtnText: { fontSize: 15, color: c.primary, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: c.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 380 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: c.foreground, marginBottom: 16 },
  input: {
    backgroundColor: c.background, borderWidth: 1, borderColor: c.border, borderRadius: colors.radius,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.foreground, minHeight: 48,
  },
  inputError: { borderColor: c.destructive },
  errorText: { fontSize: 13, color: c.destructive, marginTop: 6 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 20 },
  cancelBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: colors.radius, minHeight: 48, justifyContent: 'center' },
  cancelText: { fontSize: 15, color: c.mutedForeground, fontWeight: '600' },
  saveBtn: { backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: colors.radius, minHeight: 48, justifyContent: 'center' },
  saveText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  disabled: { opacity: 0.4 },
});
