import React, { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import {
  getFloorsLite, createFloor, updateFloor, deleteFloor, deleteFloors, type Floor,
} from '@/db/database';
import CrudList from '@/components/CrudList';
import BreadcrumbBar from '@/components/BreadcrumbBar';

export default function RegistrarPavimentos() {
  const router = useRouter();
  const { captureNav, setCaptureNav } = useApp();
  const [items, setItems] = useState<Floor[]>([]);

  const reload = useCallback(async () => {
    if (captureNav.building) setItems(await getFloorsLite(captureNav.building.id));
  }, [captureNav.building]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const select = (floor: Floor) => {
    setCaptureNav({ floor, unit: null, service: null, photoGroupId: null });
    router.push('/registrar/unidades');
  };

  return (
    <CrudList<Floor>
      items={items}
      icon="layers"
      emptyTitle="Nenhum pavimento"
      emptyMessage="Crie o primeiro pavimento deste prédio."
      addLabel="Novo pavimento"
      header={<BreadcrumbBar items={[captureNav.block?.name ?? '', captureNav.building?.name ?? '']} />}
      structureKind="floor"
      structureScopeId={captureNav.building?.id}
      onItemsReordered={reload}
      onPressItem={select}
      onCreate={async (name) => {
        if (captureNav.building) { await createFloor(captureNav.building.id, name); await reload(); }
      }}
      onRename={async (f, name) => { await updateFloor(f.id, { name }); await reload(); }}
      onDelete={async (f) => { await deleteFloor(f.id); await reload(); }}
      onBatchDelete={async (ids) => { await deleteFloors(ids); await reload(); }}
    />
  );
}
