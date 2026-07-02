import React, { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import {
  getBuildingsLite, createBuilding, updateBuilding, deleteBuilding, deleteBuildings,
  type Building,
} from '@/db/database';
import CrudList from '@/components/CrudList';
import BreadcrumbBar from '@/components/BreadcrumbBar';

export default function RegistrarPredios() {
  const router = useRouter();
  const { captureNav, setCaptureNav } = useApp();
  const [items, setItems] = useState<Building[]>([]);

  const reload = useCallback(async () => {
    if (captureNav.block) setItems(await getBuildingsLite(captureNav.block.id));
  }, [captureNav.block]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const select = (building: Building) => {
    setCaptureNav({ building, floor: null, unit: null, service: null, photoGroupId: null });
    router.push('/registrar/pavimentos');
  };

  return (
    <CrudList<Building>
      items={items}
      icon="home"
      emptyTitle="Nenhum prédio"
      emptyMessage="Crie o primeiro prédio desta quadra."
      addLabel="Novo prédio"
      header={<BreadcrumbBar items={[captureNav.block?.name ?? '']} />}
      structureKind="building"
      structureScopeId={captureNav.block?.id}
      onItemsReordered={reload}
      onPressItem={select}
      onCreate={async (name) => {
        if (captureNav.block) { await createBuilding(captureNav.block.id, name); await reload(); }
      }}
      onRename={async (b, name) => { await updateBuilding(b.id, { name }); await reload(); }}
      onDelete={async (b) => { await deleteBuilding(b.id); await reload(); }}
      onBatchDelete={async (ids) => { await deleteBuildings(ids); await reload(); }}
    />
  );
}
