import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { getUnitsLite, createUnit, updateUnit, deleteUnit, deleteUnits, cloneUnit, type Unit } from '@/db/database';
import CrudList from '@/components/CrudList';
import colors from '@/constants/colors';

export default function EstruturaUnidades() {
  const { floorId } = useLocalSearchParams<{ floorId: string; floorName: string }>();
  const id = Number(floorId);
  const [items, setItems] = useState<Unit[]>([]);
  const [cloneTarget, setCloneTarget] = useState<Unit | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [cloneVisible, setCloneVisible] = useState(false);
  const [cloneBusy, setCloneBusy] = useState(false);

  const reload = useCallback(async () => {
    if (id) setItems(await getUnitsLite(id));
  }, [id]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const openClone = (item: Unit) => {
    setCloneTarget(item);
    setCloneName(`${item.name} (cópia)`);
    setCloneVisible(true);
  };

  const executeClone = async () => {
    if (!cloneTarget) return;
    const name = cloneName.trim();
    if (!name) return;
    setCloneBusy(true);
    try {
      await cloneUnit(cloneTarget.id, id, name);
      setCloneVisible(false);
      await reload();
    } catch {
      Alert.alert('Erro', 'Não foi possível duplicar a unidade.');
    } finally { setCloneBusy(false); }
  };

  return (
    <>
      <CrudList<Unit>
        items={items}
        icon="box"
        emptyTitle="Nenhuma unidade"
        emptyMessage="Crie a primeira unidade deste pavimento."
        addLabel="Nova unidade"
        structureKind="unit"
        structureScopeId={id}
        onItemsReordered={reload}
        onCreate={async (name) => { await createUnit(id, name); await reload(); }}
        onRename={async (u, name) => { await updateUnit(u.id, { name }); await reload(); }}
        onDelete={async (u) => { await deleteUnit(u.id); await reload(); }}
        onBatchDelete={async (ids) => { await deleteUnits(ids); await reload(); }}
        onDuplicate={openClone}
      />
      <Modal visible={cloneVisible} transparent animationType="fade" onRequestClose={() => setCloneVisible(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modal}>
            <Text style={s.title}>Duplicar unidade</Text>
            <TextInput style={s.input} value={cloneName} onChangeText={setCloneName} placeholder="Nome da cópia" placeholderTextColor={colors.light.mutedForeground} autoFocus onSubmitEditing={executeClone} />
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
  title: { fontSize: 17, fontWeight: '700', color: c.foreground, marginBottom: 16 },
  input: { backgroundColor: c.background, borderWidth: 1, borderColor: c.border, borderRadius: colors.radius, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.foreground, minHeight: 48 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 20 },
  cancel: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: colors.radius, minHeight: 48, justifyContent: 'center' },
  cancelTxt: { fontSize: 15, color: c.mutedForeground, fontWeight: '600' },
  confirm: { backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: colors.radius, minHeight: 48, justifyContent: 'center' },
  confirmTxt: { fontSize: 15, color: '#fff', fontWeight: '600' },
  disabled: { opacity: 0.4 },
});
