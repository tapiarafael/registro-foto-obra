import React, { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import {
  getUnitsLite, getUnitsForDate, createUnit, updateUnit, deleteUnit, deleteUnits, type Unit,
} from '@/db/database';
import { todayDateString } from '@/services/photoService';
import CrudList from '@/components/CrudList';
import BreadcrumbBar from '@/components/BreadcrumbBar';

export default function RegistrarUnidades() {
  const router = useRouter();
  const { captureNav, setCaptureNav } = useApp();
  const [items, setItems] = useState<Unit[]>([]);
  const [doneIds, setDoneIds] = useState<Set<number>>(new Set());

  const reload = useCallback(async () => {
    if (!captureNav.floor) return;
    setItems(await getUnitsLite(captureNav.floor.id));
    const done = await getUnitsForDate(captureNav.floor.id, todayDateString());
    setDoneIds(new Set(done.map((u) => u.id)));
  }, [captureNav.floor]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const select = (unit: Unit) => {
    setCaptureNav({ unit, service: null, photoGroupId: null });
    router.push('/registrar/servicos');
  };

  return (
    <CrudList<Unit>
      items={items}
      icon="box"
      emptyTitle="Nenhuma unidade"
      emptyMessage="Crie a primeira unidade deste pavimento."
      addLabel="Nova unidade"
      header={<BreadcrumbBar items={[
        captureNav.block?.name ?? '',
        captureNav.building?.name ?? '',
        captureNav.floor?.name ?? '',
      ]} />}
      structureKind="unit"
      structureScopeId={captureNav.floor?.id}
      itemDone={(u) => doneIds.has(u.id)}
      onItemsReordered={reload}
      onPressItem={select}
      onCreate={async (name) => {
        if (captureNav.floor) { await createUnit(captureNav.floor.id, name); await reload(); }
      }}
      onRename={async (u, name) => { await updateUnit(u.id, { name }); await reload(); }}
      onDelete={async (u) => { await deleteUnit(u.id); await reload(); }}
      onBatchDelete={async (ids) => { await deleteUnits(ids); await reload(); }}
    />
  );
}
