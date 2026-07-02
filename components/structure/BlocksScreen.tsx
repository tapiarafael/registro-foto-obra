import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import {
  getBlocksLite, createBlock, updateBlock, deleteBlock, deleteBlocks,
  cloneBlock, getBlockCloneStats, type Block,
} from '@/db/database';
import { deleteReportArtifactFiles } from '@/services/reportService';
import CrudList from '@/components/CrudList';
import CloneNameModal from '@/components/structure/CloneNameModal';
import ProgressModal from '@/components/ProgressModal';

type Props = { mode: 'capture' | 'manage' };

export default function BlocksScreen({ mode }: Props) {
  const router = useRouter();
  const { project, setCaptureNav } = useApp();
  const [items, setItems] = useState<Block[]>([]);
  const [cloneTarget, setCloneTarget] = useState<Block | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [cloneVisible, setCloneVisible] = useState(false);
  const [cloneBusy, setCloneBusy] = useState(false);
  const [cloneStats, setCloneStats] = useState<{ buildings: number; floors: number; units: number } | null>(null);
  const [cloneProgress, setCloneProgress] = useState<{ current: number; total: number } | null>(null);

  const reload = useCallback(async () => {
    if (project) setItems(await getBlocksLite(project.id));
  }, [project]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const openClone = async (item: Block) => {
    setCloneTarget(item);
    setCloneName(`${item.name} (cópia)`);
    setCloneStats(null);
    setCloneVisible(true);
    setCloneStats(await getBlockCloneStats(item.id));
  };

  const executeClone = async () => {
    if (!cloneTarget || !project) return;
    const name = cloneName.trim();
    if (!name) return;
    setCloneBusy(true);
    setCloneVisible(false);
    const total = 1 + (cloneStats?.buildings ?? 0) + (cloneStats?.floors ?? 0) + (cloneStats?.units ?? 0);
    setCloneProgress({ current: 0, total });
    try {
      await cloneBlock(cloneTarget.id, project.id, name, (current, t) => setCloneProgress({ current, total: t }));
      await reload();
    } catch {
      Alert.alert('Erro', 'Não foi possível duplicar a quadra.');
    } finally {
      setCloneBusy(false);
      setCloneProgress(null);
    }
  };

  const selectCapture = (block: Block) => {
    setCaptureNav({ block, building: null, floor: null, unit: null, service: null, photoGroupId: null });
    router.push('/registrar/predios');
  };

  const cloneStatsText = cloneStats === null
    ? null
    : `${cloneStats.buildings} prédio(s) · ${cloneStats.floors} pavimento(s) · ${cloneStats.units} unidade(s)`;

  return (
    <>
      <CrudList<Block>
        items={items}
        icon="grid"
        emptyTitle="Nenhuma quadra"
        emptyMessage={mode === 'capture' ? 'Crie a primeira quadra para começar o registro.' : 'Crie a primeira quadra da obra.'}
        addLabel="Nova quadra"
        headerNote={mode === 'manage' ? 'Toque em uma quadra para gerenciar seus prédios.' : undefined}
        structureKind="block"
        structureScopeId={project?.id}
        onItemsReordered={reload}
        onPressItem={mode === 'capture'
          ? selectCapture
          : (b) => router.push({ pathname: '/estrutura/predios', params: { blockId: String(b.id), blockName: b.name } })}
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
        onDuplicate={mode === 'manage' && !cloneBusy ? openClone : undefined}
      />
      {mode === 'manage' && (
        <>
          <CloneNameModal
            visible={cloneVisible}
            title="Duplicar quadra"
            subtitle="Copia a estrutura completa (prédios, pavimentos e unidades), sem fotos."
            name={cloneName}
            onChangeName={setCloneName}
            onConfirm={executeClone}
            onCancel={() => setCloneVisible(false)}
            busy={cloneBusy}
            statsText={cloneVisible ? cloneStatsText : undefined}
          />
          <ProgressModal
            visible={cloneProgress !== null}
            title="Duplicando quadra"
            current={cloneProgress?.current}
            total={cloneProgress?.total}
            detailUnit="itens"
          />
        </>
      )}
    </>
  );
}
