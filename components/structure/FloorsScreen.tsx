import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import {
  getFloorsLite, createFloor, updateFloor, deleteFloor, deleteFloors,
  cloneFloor, getFloorCloneStats, type Floor,
} from '@/db/database';
import CrudList from '@/components/CrudList';
import BreadcrumbBar from '@/components/BreadcrumbBar';
import CloneNameModal from '@/components/structure/CloneNameModal';
import ProgressModal from '@/components/ProgressModal';

type Props = { mode: 'capture' | 'manage' };

export default function FloorsScreen({ mode }: Props) {
  const router = useRouter();
  const { captureNav, setCaptureNav } = useApp();
  const { buildingId } = useLocalSearchParams<{ buildingId: string; buildingName: string }>();
  const manageBuildingId = Number(buildingId);
  const scopeId = mode === 'capture' ? captureNav.building?.id : manageBuildingId;
  const [items, setItems] = useState<Floor[]>([]);
  const [cloneTarget, setCloneTarget] = useState<Floor | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [cloneVisible, setCloneVisible] = useState(false);
  const [cloneBusy, setCloneBusy] = useState(false);
  const [cloneStats, setCloneStats] = useState<{ units: number } | null>(null);
  const [cloneProgress, setCloneProgress] = useState<{ current: number; total: number } | null>(null);

  const reload = useCallback(async () => {
    if (scopeId) setItems(await getFloorsLite(scopeId));
  }, [scopeId]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const openClone = async (item: Floor) => {
    setCloneTarget(item);
    setCloneName(`${item.name} (cópia)`);
    setCloneStats(null);
    setCloneVisible(true);
    setCloneStats(await getFloorCloneStats(item.id));
  };

  const executeClone = async () => {
    if (!cloneTarget || !scopeId) return;
    const name = cloneName.trim();
    if (!name) return;
    setCloneBusy(true);
    setCloneVisible(false);
    const total = 1 + (cloneStats?.units ?? 0);
    setCloneProgress({ current: 0, total });
    try {
      await cloneFloor(cloneTarget.id, scopeId, name, (current, t) => setCloneProgress({ current, total: t }));
      await reload();
    } catch {
      Alert.alert('Erro', 'Não foi possível duplicar o pavimento.');
    } finally {
      setCloneBusy(false);
      setCloneProgress(null);
    }
  };

  const selectCapture = (floor: Floor) => {
    setCaptureNav({ floor, unit: null, service: null, photoGroupId: null });
    router.push('/registrar/unidades');
  };

  const cloneStatsText = cloneStats === null ? null : `${cloneStats.units} unidade(s)`;

  return (
    <>
      <CrudList<Floor>
        items={items}
        icon="layers"
        emptyTitle="Nenhum pavimento"
        emptyMessage="Crie o primeiro pavimento deste prédio."
        addLabel="Novo pavimento"
        header={mode === 'capture'
          ? <BreadcrumbBar items={[captureNav.block?.name ?? '', captureNav.building?.name ?? '']} />
          : undefined}
        headerNote={mode === 'manage' ? 'Toque em um pavimento para gerenciar suas unidades.' : undefined}
        structureKind="floor"
        structureScopeId={scopeId}
        onItemsReordered={reload}
        onPressItem={mode === 'capture'
          ? selectCapture
          : (f) => router.push({ pathname: '/estrutura/unidades', params: { floorId: String(f.id), floorName: f.name } })}
        onCreate={async (name) => { if (scopeId) { await createFloor(scopeId, name); await reload(); } }}
        onRename={async (f, name) => { await updateFloor(f.id, { name }); await reload(); }}
        onDelete={async (f) => { await deleteFloor(f.id); await reload(); }}
        onBatchDelete={async (ids) => { await deleteFloors(ids); await reload(); }}
        onDuplicate={mode === 'manage' && !cloneBusy ? openClone : undefined}
      />
      {mode === 'manage' && (
        <>
          <CloneNameModal
            visible={cloneVisible}
            title="Duplicar pavimento"
            subtitle="Copia todas as unidades do pavimento, sem fotos."
            name={cloneName}
            onChangeName={setCloneName}
            onConfirm={executeClone}
            onCancel={() => setCloneVisible(false)}
            busy={cloneBusy}
            statsText={cloneVisible ? cloneStatsText : undefined}
          />
          <ProgressModal
            visible={cloneProgress !== null}
            title="Duplicando pavimento"
            current={cloneProgress?.current}
            total={cloneProgress?.total}
            detailUnit="itens"
          />
        </>
      )}
    </>
  );
}
