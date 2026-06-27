import React, { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { getBuildings, createBuilding, updateBuilding, deleteBuilding, type Building } from '@/db/database';
import CrudList from '@/components/CrudList';

export default function EstruturaPredios() {
  const router = useRouter();
  const { blockId } = useLocalSearchParams<{ blockId: string; blockName: string }>();
  const id = Number(blockId);
  const [items, setItems] = useState<Building[]>([]);

  const reload = useCallback(async () => {
    if (id) setItems(await getBuildings(id));
  }, [id]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return (
    <CrudList<Building>
      items={items}
      icon="home"
      emptyTitle="Nenhum prédio"
      emptyMessage="Crie o primeiro prédio desta quadra."
      addLabel="Novo prédio"
      headerNote="Toque em um prédio para gerenciar seus pavimentos."
      onPressItem={(b) => router.push({ pathname: '/estrutura/pavimentos', params: { buildingId: String(b.id), buildingName: b.name } })}
      onCreate={async (name) => { await createBuilding(id, name); await reload(); }}
      onRename={async (b, name) => { await updateBuilding(b.id, { name }); await reload(); }}
      onDelete={async (b) => { await deleteBuilding(b.id); await reload(); }}
    />
  );
}
