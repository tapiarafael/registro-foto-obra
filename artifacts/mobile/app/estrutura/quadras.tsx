import React, { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { getBlocks, createBlock, updateBlock, deleteBlock, type Block } from '@/db/database';
import CrudList from '@/components/CrudList';

export default function EstruturaQuadras() {
  const router = useRouter();
  const { project } = useApp();
  const [items, setItems] = useState<Block[]>([]);

  const reload = useCallback(async () => {
    if (project) setItems(await getBlocks(project.id));
  }, [project]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return (
    <CrudList<Block>
      items={items}
      icon="grid"
      emptyTitle="Nenhuma quadra"
      emptyMessage="Crie a primeira quadra da obra."
      addLabel="Nova quadra"
      headerNote="Toque em uma quadra para gerenciar seus prédios."
      onPressItem={(b) => router.push({ pathname: '/estrutura/predios', params: { blockId: String(b.id), blockName: b.name } })}
      onCreate={async (name) => { if (project) { await createBlock(project.id, name); await reload(); } }}
      onRename={async (b, name) => { await updateBlock(b.id, { name }); await reload(); }}
      onDelete={async (b) => { await deleteBlock(b.id); await reload(); }}
    />
  );
}
