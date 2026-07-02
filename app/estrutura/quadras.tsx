import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import {
  getBlocksLite, createBlock, updateBlock, deleteBlock, deleteBlocks,
  cloneBlock, getBlockCloneStats, type Block,
} from '@/db/database';
import { deleteReportArtifactFiles } from '@/services/reportService';
import CrudList from '@/components/CrudList';
import ProgressModal from '@/components/ProgressModal';
import colors from '@/constants/colors';

export default function EstruturaQuadras() {
  const router = useRouter();
  const { project } = useApp();
  const [items, setItems] = useState<Block[]>([]);
  const [cloneTarget, setCloneTarget] = useState<Block | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [cloneVisible, setCloneVisible] = useState(false);
  const [cloneBusy, setCloneBusy] = useState(false);
  const [cloneStats, setCloneStats] = useState<{ buildings: number; floors: number; units: number } | null>(null);
  const [cloneProgress, setCloneProgress] = useState<{ current: number; total: number } | null>(null);

  const handleCloneProgress = (current: number, total: number) => {
    setCloneProgress({ current, total });
  };

  const reload = useCallback(async () => {
    if (project) setItems(await getBlocksLite(project.id));
  }, [project]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const openClone = async (item: Block) => {
    setCloneTarget(item);
    setCloneName(`${item.name} (cópia)`);
    setCloneStats(null);
    setCloneVisible(true);
    const stats = await getBlockCloneStats(item.id);
    setCloneStats(stats);
  };

  const executeClone = async () => {
    if (!cloneTarget || !project) return;
    const name = cloneName.trim();
    if (!name) return;
    setCloneBusy(true);
    setCloneVisible(false);
    const total = 1
      + (cloneStats?.buildings ?? 0)
      + (cloneStats?.floors ?? 0)
      + (cloneStats?.units ?? 0);
    setCloneProgress({ current: 0, total });
    try {
      await cloneBlock(cloneTarget.id, project.id, name, handleCloneProgress);
      await reload();
    } catch {
      Alert.alert('Erro', 'Não foi possível duplicar a quadra.');
    } finally {
      setCloneBusy(false);
      setCloneProgress(null);
    }
  };

  return (
    <>
      <CrudList<Block>
        items={items}
        icon="grid"
        emptyTitle="Nenhuma quadra"
        emptyMessage="Crie a primeira quadra da obra."
        addLabel="Nova quadra"
        headerNote="Toque em uma quadra para gerenciar seus prédios."
        structureKind="block"
        structureScopeId={project?.id}
        onItemsReordered={reload}
        onPressItem={(b) => router.push({ pathname: '/estrutura/predios', params: { blockId: String(b.id), blockName: b.name } })}
        onCreate={async (name) => { if (project) { await createBlock(project.id, name); await reload(); } }}
        onRename={async (b, name) => { await updateBlock(b.id, { name }); await reload(); }}
        onDelete={async (b) => {
          const reports = await deleteBlock(b.id);
          await deleteReportArtifactFiles(reports);
          await reload();
        }}
        onBatchDelete={async (ids) => {
          const reports = await deleteBlocks(ids);
          await deleteReportArtifactFiles(reports);
          await reload();
        }}
        onDuplicate={cloneBusy ? undefined : openClone}
      />
      <Modal visible={cloneVisible} transparent animationType="fade" onRequestClose={() => setCloneVisible(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modal}>
            <Text style={s.title}>Duplicar quadra</Text>
            <Text style={s.sub}>Copia a estrutura completa (prédios, pavimentos e unidades), sem fotos.</Text>
            <TextInput style={s.input} value={cloneName} onChangeText={setCloneName} placeholder="Nome da cópia" placeholderTextColor={colors.light.mutedForeground} autoFocus onSubmitEditing={executeClone} />
            {cloneStats === null
              ? <ActivityIndicator size="small" style={{ marginTop: 8 }} />
              : <Text style={s.stats}>{cloneStats.buildings} prédio(s) · {cloneStats.floors} pavimento(s) · {cloneStats.units} unidade(s)</Text>}
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
        title="Duplicando quadra"
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
