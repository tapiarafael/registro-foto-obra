import React, { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { getFloors, createFloor, updateFloor, deleteFloor, type Floor } from '@/db/database';
import CrudList from '@/components/CrudList';

export default function EstruturaPavimentos() {
  const router = useRouter();
  const { buildingId } = useLocalSearchParams<{ buildingId: string; buildingName: string }>();
  const id = Number(buildingId);
  const [items, setItems] = useState<Floor[]>([]);

  const reload = useCallback(async () => {
    if (id) setItems(await getFloors(id));
  }, [id]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return (
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
    />
  );
}
