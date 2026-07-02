import React, { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import {
  getBlocksLite, createBlock, updateBlock, deleteBlock, deleteBlocks, type Block,
} from '@/db/database';
import { deleteReportArtifactFiles } from '@/services/reportService';
import CrudList from '@/components/CrudList';

export default function RegistrarQuadras() {
  const router = useRouter();
  const { project, setCaptureNav } = useApp();
  const [blocks, setBlocks] = useState<Block[]>([]);

  const reload = useCallback(async () => {
    if (project) setBlocks(await getBlocksLite(project.id));
  }, [project]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const select = (block: Block) => {
    setCaptureNav({ block, building: null, floor: null, unit: null, service: null, photoGroupId: null });
    router.push('/registrar/predios');
  };

  return (
    <CrudList<Block>
      items={blocks}
      icon="grid"
      emptyTitle="Nenhuma quadra"
      emptyMessage="Crie a primeira quadra para começar o registro."
      addLabel="Nova quadra"
      structureKind="block"
      structureScopeId={project?.id}
      onItemsReordered={reload}
      onPressItem={select}
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
    />
  );
}
