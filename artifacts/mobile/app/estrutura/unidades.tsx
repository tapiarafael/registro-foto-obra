import React, { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { getUnits, createUnit, updateUnit, deleteUnit, type Unit } from '@/db/database';
import CrudList from '@/components/CrudList';

export default function EstruturaUnidades() {
  const { floorId } = useLocalSearchParams<{ floorId: string; floorName: string }>();
  const id = Number(floorId);
  const [items, setItems] = useState<Unit[]>([]);

  const reload = useCallback(async () => {
    if (id) setItems(await getUnits(id));
  }, [id]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return (
    <CrudList<Unit>
      items={items}
      icon="box"
      emptyTitle="Nenhuma unidade"
      emptyMessage="Crie a primeira unidade deste pavimento."
      addLabel="Nova unidade"
      onCreate={async (name) => { await createUnit(id, name); await reload(); }}
      onRename={async (u, name) => { await updateUnit(u.id, { name }); await reload(); }}
      onDelete={async (u) => { await deleteUnit(u.id); await reload(); }}
    />
  );
}
