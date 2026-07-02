import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import {
  getBuildingsLite, createBuilding, updateBuilding, deleteBuilding, deleteBuildings,
  duplicateBuilding, getBuildingCloneStats, type Building,
} from '@/db/database';
import CrudList from '@/components/CrudList';
import BreadcrumbBar from '@/components/BreadcrumbBar';
import CloneNameModal from '@/components/structure/CloneNameModal';
import ProgressModal from '@/components/ProgressModal';

type Props = { mode: 'capture' | 'manage' };

export default function BuildingsScreen({ mode }: Props) {
  const router = useRouter();
  const { captureNav, setCaptureNav } = useApp();
  const { blockId } = useLocalSearchParams<{ blockId: string; blockName: string }>();
  const manageBlockId = Number(blockId);
  const scopeId = mode === 'capture' ? captureNav.block?.id : manageBlockId;
  const [items, setItems] = useState<Building[]>([]);
  const [cloneTarget, setCloneTarget] = useState<Building | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [cloneVisible, setCloneVisible] = useState(false);
  const [cloneBusy, setCloneBusy] = useState(false);
  const [cloneStats, setCloneStats] = useState<{ floors: number; units: number } | null>(null);
  const [cloneProgress, setCloneProgress] = useState<{ current: number; total: number } | null>(null);

  const reload = useCallback(async () => {
    if (scopeId) setItems(await getBuildingsLite(scopeId));
  }, [scopeId]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const openClone = async (item: Building) => {
    setCloneTarget(item);
    setCloneName(`${item.name} (cópia)`);
    setCloneStats(null);
    setCloneVisible(true);
    setCloneStats(await getBuildingCloneStats(item.id));
  };

  const executeClone = async () => {
    if (!cloneTarget || !scopeId) return;
    const name = cloneName.trim();
    if (!name) return;
    setCloneBusy(true);
    setCloneVisible(false);
    const total = 1 + (cloneStats?.floors ?? 0) + (cloneStats?.units ?? 0);
    setCloneProgress({ current: 0, total });
    try {
      await duplicateBuilding(cloneTarget.id, scopeId, name, (current, t) => setCloneProgress({ current, total: t }));
      await reload();
    } catch {
      Alert.alert('Erro', 'Não foi possível duplicar o prédio.');
    } finally {
      setCloneBusy(false);
      setCloneProgress(null);
    }
  };

  const selectCapture = (building: Building) => {
    setCaptureNav({ building, floor: null, unit: null, service: null, photoGroupId: null });
    router.push('/registrar/pavimentos');
  };

  const cloneStatsText = cloneStats === null
    ? null
    : `${cloneStats.floors} pavimento(s) · ${cloneStats.units} unidade(s)`;

  return (
    <>
      <CrudList<Building>
        items={items}
        icon="home"
        emptyTitle="Nenhum prédio"
        emptyMessage="Crie o primeiro prédio desta quadra."
        addLabel="Novo prédio"
        header={mode === 'capture'
          ? <BreadcrumbBar items={[captureNav.block?.name ?? '']} />
          : undefined}
        headerNote={mode === 'manage' ? 'Toque em um prédio para gerenciar seus pavimentos.' : undefined}
        structureKind="building"
        structureScopeId={scopeId}
        onItemsReordered={reload}
        onPressItem={mode === 'capture'
          ? selectCapture
          : (b) => router.push({ pathname: '/estrutura/pavimentos', params: { buildingId: String(b.id), buildingName: b.name } })}
        onCreate={async (name) => { if (scopeId) { await createBuilding(scopeId, name); await reload(); } }}
        onRename={async (b, name) => { await updateBuilding(b.id, { name }); await reload(); }}
        onDelete={async (b) => { await deleteBuilding(b.id); await reload(); }}
        onBatchDelete={async (ids) => { await deleteBuildings(ids); await reload(); }}
        onDuplicate={mode === 'manage' && !cloneBusy ? openClone : undefined}
      />
      {mode === 'manage' && (
        <>
          <CloneNameModal
            visible={cloneVisible}
            title="Duplicar prédio"
            subtitle="Copia todos os pavimentos e unidades, sem fotos."
            name={cloneName}
            onChangeName={setCloneName}
            onConfirm={executeClone}
            onCancel={() => setCloneVisible(false)}
            busy={cloneBusy}
            statsText={cloneVisible ? cloneStatsText : undefined}
          />
          <ProgressModal
            visible={cloneProgress !== null}
            title="Duplicando prédio"
            current={cloneProgress?.current}
            total={cloneProgress?.total}
            detailUnit="itens"
          />
        </>
      )}
    </>
  );
}
