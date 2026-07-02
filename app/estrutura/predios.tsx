import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  getBuildingsLite, createBuilding, updateBuilding, deleteBuilding, deleteBuildings,
  duplicateBuilding, getBuildingCloneStats, type Building,
} from '@/db/database';
import CrudList from '@/components/CrudList';
import ProgressModal from '@/components/ProgressModal';
import colors from '@/constants/colors';

export default function EstruturaPredios() {
  const router = useRouter();
  const { blockId } = useLocalSearchParams<{ blockId: string; blockName: string }>();
  const id = Number(blockId);
  const [items, setItems] = useState<Building[]>([]);
  const [cloneTarget, setCloneTarget] = useState<Building | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [cloneVisible, setCloneVisible] = useState(false);
  const [cloneBusy, setCloneBusy] = useState(false);
  const [cloneStats, setCloneStats] = useState<{ floors: number; units: number } | null>(null);
  const [cloneProgress, setCloneProgress] = useState<{ current: number; total: number } | null>(null);

  const handleCloneProgress = (current: number, total: number) => {
    setCloneProgress({ current, total });
  };

  const reload = useCallback(async () => {
    if (id) setItems(await getBuildingsLite(id));
  }, [id]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const openClone = async (item: Building) => {
    setCloneTarget(item);
    setCloneName(`${item.name} (cópia)`);
    setCloneStats(null);
    setCloneVisible(true);
    const stats = await getBuildingCloneStats(item.id);
    setCloneStats(stats);
  };

  const executeClone = async () => {
    if (!cloneTarget) return;
    const name = cloneName.trim();
    if (!name) return;
    setCloneBusy(true);
    setCloneVisible(false);
    const total = 1 + (cloneStats?.floors ?? 0) + (cloneStats?.units ?? 0);
    setCloneProgress({ current: 0, total });
    try {
      await duplicateBuilding(cloneTarget.id, id, name, handleCloneProgress);
      await reload();
    } catch {
      Alert.alert('Erro', 'Não foi possível duplicar o prédio.');
    } finally {
      setCloneBusy(false);
      setCloneProgress(null);
    }
  };

  return (
    <>
      <CrudList<Building>
        items={items}
        icon="home"
        emptyTitle="Nenhum prédio"
        emptyMessage="Crie o primeiro prédio desta quadra."
        addLabel="Novo prédio"
        headerNote="Toque em um prédio para gerenciar seus pavimentos."
        structureKind="building"
        structureScopeId={id}
        onItemsReordered={reload}
        onPressItem={(b) => router.push({ pathname: '/estrutura/pavimentos', params: { buildingId: String(b.id), buildingName: b.name } })}
        onCreate={async (name) => { await createBuilding(id, name); await reload(); }}
        onRename={async (b, name) => { await updateBuilding(b.id, { name }); await reload(); }}
        onDelete={async (b) => { await deleteBuilding(b.id); await reload(); }}
        onBatchDelete={async (ids) => { await deleteBuildings(ids); await reload(); }}
        onDuplicate={cloneBusy ? undefined : openClone}
      />
      <Modal visible={cloneVisible} transparent animationType="fade" onRequestClose={() => setCloneVisible(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modal}>
            <Text style={s.title}>Duplicar prédio</Text>
            <Text style={s.sub}>Copia todos os pavimentos e unidades, sem fotos.</Text>
            <TextInput style={s.input} value={cloneName} onChangeText={setCloneName} placeholder="Nome da cópia" placeholderTextColor={colors.light.mutedForeground} autoFocus onSubmitEditing={executeClone} />
            {cloneStats === null
              ? <ActivityIndicator size="small" style={{ marginTop: 8 }} />
              : <Text style={s.stats}>{cloneStats.floors} pavimento(s) · {cloneStats.units} unidade(s)</Text>}
            <View style={s.actions}>
              <TouchableOpacity style={s.cancel} onPress={() => setCloneVisible(false)} disabled={cloneBusy}><Text style={s.cancelTxt}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[s.confirm, (!cloneName.trim() || cloneBusy) && s.disabled]} onPress={executeClone} disabled={!cloneName.trim() || cloneBusy}>
                {cloneBusy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmTxt}>Duplicar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <ProgressModal
        visible={cloneProgress !== null}
        title="Duplicando prédio"
        current={cloneProgress?.current}
        total={cloneProgress?.total}
        detailUnit="itens"
      />
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
