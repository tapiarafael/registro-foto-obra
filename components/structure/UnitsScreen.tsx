import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import {
  getUnitsLite, getUnitsForDate, createUnit, updateUnit, deleteUnit, deleteUnits,
  cloneUnit, getServices, getServicesForDateLocation, type Unit, type Service,
} from '@/db/database';
import { effectiveCaptureDate } from '@/utils/datetime';
import { openCaptureCamera } from '@/utils/openCaptureCamera';
import { useShowServices } from '@/hooks/useShowServices';
import CrudList from '@/components/CrudList';
import CaptureListHeader from '@/components/CaptureListHeader';
import CloneNameModal from '@/components/structure/CloneNameModal';

type Props = { mode: 'capture' | 'manage' };

export default function UnitsScreen({ mode }: Props) {
  const router = useRouter();
  const { project, captureNav, setCaptureNav, setPhotoGroupId } = useApp();
  const { showServices, setShowServicesPref } = useShowServices();
  const { floorId } = useLocalSearchParams<{ floorId: string; floorName: string }>();
  const manageFloorId = Number(floorId);
  const scopeId = mode === 'capture' ? captureNav.floor?.id : manageFloorId;
  const [items, setItems] = useState<Unit[]>([]);
  const [doneIds, setDoneIds] = useState<Set<number>>(new Set());
  const [services, setServices] = useState<Service[]>([]);
  const [doneServiceIds, setDoneServiceIds] = useState<Set<number>>(new Set());
  const [cloneTarget, setCloneTarget] = useState<Unit | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [cloneVisible, setCloneVisible] = useState(false);
  const [cloneBusy, setCloneBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!scopeId) return;
    setItems(await getUnitsLite(scopeId));
    if (mode === 'capture') {
      const date = effectiveCaptureDate(captureNav.captureDate);
      const done = await getUnitsForDate(scopeId, date);
      setDoneIds(new Set(done.map((u) => u.id)));
      if (project && showServices && captureNav.floor) {
        setServices(await getServices(project.id));
        const svcDone = await getServicesForDateLocation('floor', captureNav.floor.id, date);
        setDoneServiceIds(new Set(svcDone.map((s) => s.id)));
      } else {
        setServices([]);
      }
    }
  }, [scopeId, mode, project, showServices, captureNav.floor, captureNav.captureDate]);

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
    if (showServices) {
      setCaptureNav({ unit, service: null, photoGroupId: null });
      router.push('/registrar/servicos');
      return;
    }
    if (!captureNav.sessionId) return;
    void openCaptureCamera({
      sessionId: captureNav.sessionId,
      location: { kind: 'unit', id: unit.id },
      service: null,
      navPatch: { unit },
      setCaptureNav,
      setPhotoGroupId,
      router,
    });
  };

  const openHere = () => {
    if (!captureNav.sessionId || !captureNav.floor) return;
    void openCaptureCamera({
      sessionId: captureNav.sessionId,
      location: { kind: 'floor', id: captureNav.floor.id },
      service: null,
      navPatch: { unit: null },
      setCaptureNav,
      setPhotoGroupId,
      router,
    });
  };

  const openService = (service: Service) => {
    if (!captureNav.sessionId || !captureNav.floor) return;
    void openCaptureCamera({
      sessionId: captureNav.sessionId,
      location: { kind: 'floor', id: captureNav.floor.id },
      service,
      navPatch: { unit: null },
      setCaptureNav,
      setPhotoGroupId,
      router,
    });
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
          ? <CaptureListHeader
              crumbs={[
                captureNav.block?.name ?? '',
                captureNav.building?.name ?? '',
                captureNav.floor?.name ?? '',
              ]}
              showServices={showServices}
              onToggleServices={(v) => { void setShowServicesPref(v); }}
            />
          : undefined}
        structureKind="unit"
        structureScopeId={scopeId}
        itemDone={mode === 'capture' ? (u) => doneIds.has(u.id) : undefined}
        onItemsReordered={reload}
        onPressItem={mode === 'capture' ? selectCapture : undefined}
        onCapturePress={mode === 'capture' ? openHere : undefined}
        extraSection={mode === 'capture' && showServices
          ? {
              title: 'Serviços',
              items: services,
              icon: 'tool',
              onPressItem: (s) => openService(s as Service),
              itemDone: (s) => doneServiceIds.has(s.id),
            }
          : undefined}
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
