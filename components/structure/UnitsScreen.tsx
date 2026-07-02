import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import {
  getUnitsLite, getUnitsForDate, createUnit, updateUnit, deleteUnit, deleteUnits,
  cloneUnit, type Unit,
} from '@/db/database';
import { todayDateString } from '@/utils/datetime';
import CrudList from '@/components/CrudList';
import BreadcrumbBar from '@/components/BreadcrumbBar';
import CloneNameModal from '@/components/structure/CloneNameModal';

type Props = { mode: 'capture' | 'manage' };

export default function UnitsScreen({ mode }: Props) {
  const router = useRouter();
  const { captureNav, setCaptureNav } = useApp();
  const { floorId } = useLocalSearchParams<{ floorId: string; floorName: string }>();
  const manageFloorId = Number(floorId);
  const scopeId = mode === 'capture' ? captureNav.floor?.id : manageFloorId;
  const [items, setItems] = useState<Unit[]>([]);
  const [doneIds, setDoneIds] = useState<Set<number>>(new Set());
  const [cloneTarget, setCloneTarget] = useState<Unit | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [cloneVisible, setCloneVisible] = useState(false);
  const [cloneBusy, setCloneBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!scopeId) return;
    setItems(await getUnitsLite(scopeId));
    if (mode === 'capture') {
      const done = await getUnitsForDate(scopeId, todayDateString());
      setDoneIds(new Set(done.map((u) => u.id)));
    }
  }, [scopeId, mode]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const openClone = (item: Unit) => {
    setCloneTarget(item);
    setCloneName(`${item.name} (cópia)`);
    setCloneVisible(true);
  };

  const executeClone = async () => {
    if (!cloneTarget || !scopeId) return;
    const name = cloneName.trim();
    if (!name) return;
    setCloneBusy(true);
    try {
      await cloneUnit(cloneTarget.id, scopeId, name);
      setCloneVisible(false);
      await reload();
    } catch {
      Alert.alert('Erro', 'Não foi possível duplicar a unidade.');
    } finally {
      setCloneBusy(false);
    }
  };

  const selectCapture = (unit: Unit) => {
    setCaptureNav({ unit, service: null, photoGroupId: null });
    router.push('/registrar/servicos');
  };

  return (
    <>
      <CrudList<Unit>
        items={items}
        icon="box"
        emptyTitle="Nenhuma unidade"
        emptyMessage="Crie a primeira unidade deste pavimento."
        addLabel="Nova unidade"
        header={mode === 'capture'
          ? <BreadcrumbBar items={[
            captureNav.block?.name ?? '',
            captureNav.building?.name ?? '',
            captureNav.floor?.name ?? '',
          ]} />
          : undefined}
        structureKind="unit"
        structureScopeId={scopeId}
        itemDone={mode === 'capture' ? (u) => doneIds.has(u.id) : undefined}
        onItemsReordered={reload}
        onPressItem={mode === 'capture' ? selectCapture : undefined}
        onCreate={async (name) => { if (scopeId) { await createUnit(scopeId, name); await reload(); } }}
        onRename={async (u, name) => { await updateUnit(u.id, { name }); await reload(); }}
        onDelete={async (u) => { await deleteUnit(u.id); await reload(); }}
        onBatchDelete={async (ids) => { await deleteUnits(ids); await reload(); }}
        onDuplicate={mode === 'manage' ? openClone : undefined}
      />
      {mode === 'manage' && (
        <CloneNameModal
          visible={cloneVisible}
          title="Duplicar unidade"
          name={cloneName}
          onChangeName={setCloneName}
          onConfirm={executeClone}
          onCancel={() => setCloneVisible(false)}
          busy={cloneBusy}
        />
      )}
    </>
  );
}
