import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  getFloors, createFloor, updateFloor, deleteFloor,
  cloneFloor, getFloorCloneStats, type Floor,
} from '@/db/database';
import CrudList from '@/components/CrudList';
import colors from '@/constants/colors';

export default function EstruturaPavimentos() {
  const router = useRouter();
  const { buildingId } = useLocalSearchParams<{ buildingId: string; buildingName: string }>();
  const id = Number(buildingId);
  const [items, setItems] = useState<Floor[]>([]);
  const [cloneTarget, setCloneTarget] = useState<Floor | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [cloneVisible, setCloneVisible] = useState(false);
  const [cloneBusy, setCloneBusy] = useState(false);
  const [cloneStats, setCloneStats] = useState<{ units: number } | null>(null);

  const reload = useCallback(async () => {
    if (id) setItems(await getFloors(id));
  }, [id]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const openClone = async (item: Floor) => {
    setCloneTarget(item);
    setCloneName(`${item.name} (cópia)`);
    setCloneStats(null);
    setCloneVisible(true);
    const stats = await getFloorCloneStats(item.id);
    setCloneStats(stats);
  };

  const executeClone = async () => {
    if (!cloneTarget) return;
    const name = cloneName.trim();
    if (!name) return;
    setCloneBusy(true);
    try {
      await cloneFloor(cloneTarget.id, id, name);
      setCloneVisible(false);
      await reload();
    } catch {
      Alert.alert('Erro', 'Não foi possível duplicar o pavimento.');
    } finally { setCloneBusy(false); }
  };

  return (
    <>
      <CrudList<Floor>
        items={items}
        icon="layers"
        emptyTitle="Nenhum pavimento"
        emptyMessage="Crie o primeiro pavimento deste prédio."
        addLabel="Novo pavimento"
        headerNote="Toque em um pavimento para gerenciar suas unidades."
        onPressItem={(f) => router.push({ pathname: '/estrutura/unidades', params: { floorId: String(f.id), floorName: f.name } })}
        onCreate={async (name) => { await createFloor(id, name); await reload(); }}
        onRename={async (f, name) => { await updateFloor(f.id, { name }); await reload(); }}
        onDelete={async (f) => { await deleteFloor(f.id); await reload(); }}
        onDuplicate={openClone}
      />
      <Modal visible={cloneVisible} transparent animationType="fade" onRequestClose={() => setCloneVisible(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modal}>
            <Text style={s.title}>Duplicar pavimento</Text>
            <Text style={s.sub}>Copia todas as unidades do pavimento, sem fotos.</Text>
            <TextInput style={s.input} value={cloneName} onChangeText={setCloneName} placeholder="Nome da cópia" placeholderTextColor={colors.light.mutedForeground} autoFocus onSubmitEditing={executeClone} />
            {cloneStats === null
              ? <ActivityIndicator size="small" style={{ marginTop: 8 }} />
              : <Text style={s.stats}>{cloneStats.units} unidade(s)</Text>}
            <View style={s.actions}>
              <TouchableOpacity style={s.cancel} onPress={() => setCloneVisible(false)} disabled={cloneBusy}><Text style={s.cancelTxt}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[s.confirm, (!cloneName.trim() || cloneBusy) && s.disabled]} onPress={executeClone} disabled={!cloneName.trim() || cloneBusy}>
                {cloneBusy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmTxt}>Duplicar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const c = colors.light;
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: c.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 380 },
  title: { fontSize: 17, fontWeight: '700', color: c.foreground, marginBottom: 6 },
  sub: { fontSize: 13, color: c.mutedForeground, marginBottom: 14, lineHeight: 18 },
  input: { backgroundColor: c.background, borderWidth: 1, borderColor: c.border, borderRadius: colors.radius, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.foreground, minHeight: 48 },
  stats: { fontSize: 12, color: c.mutedForeground, marginTop: 8, fontStyle: 'italic' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 20 },
  cancel: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: colors.radius, minHeight: 48, justifyContent: 'center' },
  cancelTxt: { fontSize: 15, color: c.mutedForeground, fontWeight: '600' },
  confirm: { backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: colors.radius, minHeight: 48, justifyContent: 'center' },
  confirmTxt: { fontSize: 15, color: '#fff', fontWeight: '600' },
  disabled: { opacity: 0.4 },
});
