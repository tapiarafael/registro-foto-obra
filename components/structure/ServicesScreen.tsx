import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import {
  getServices, createService, updateService, deleteService, deleteServices,
  getServicesForDateUnit, type Service,
} from '@/db/database';
import { effectiveCaptureDate } from '@/utils/datetime';
import { openCaptureCamera } from '@/utils/openCaptureCamera';
import { useShowServices } from '@/hooks/useShowServices';
import CrudList from '@/components/CrudList';
import CaptureListHeader from '@/components/CaptureListHeader';

const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

type Props = { mode: 'capture' | 'manage' };

export default function ServicesScreen({ mode }: Props) {
  const router = useRouter();
  const { project, captureNav, setCaptureNav, setPhotoGroupId } = useApp();
  const { showServices, setShowServicesPref } = useShowServices();
  const [items, setItems] = useState<Service[]>([]);
  const [doneIds, setDoneIds] = useState<Set<number>>(new Set());

  const reload = useCallback(async () => {
    if (!project) return;
    setItems(await getServices(project.id));
    if (mode === 'capture' && captureNav.unit) {
      const done = await getServicesForDateUnit(captureNav.unit.id, effectiveCaptureDate(captureNav.captureDate));
      setDoneIds(new Set(done.map((s) => s.id)));
    } else if (mode === 'capture') {
      setDoneIds(new Set());
    }
  }, [project, mode, captureNav.unit, captureNav.captureDate]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const openUnitCamera = (service: Service | null) => {
    if (!captureNav.sessionId || !captureNav.unit) return;
    void openCaptureCamera({
      sessionId: captureNav.sessionId,
      location: { kind: 'unit', id: captureNav.unit.id },
      service,
      navPatch: {},
      setCaptureNav,
      setPhotoGroupId,
      router,
    });
  };

  const createAndMaybeOpen = async (name: string) => {
    if (!project) return;
    const trimmed = name.trim().replace(/\s+/g, ' ');
    if (trimmed.length > 80) {
      Alert.alert('Nome inválido', 'Nome muito longo (máximo 80 caracteres).');
      throw new Error('validation');
    }
    const dup = items.find((s) => normalize(s.name) === normalize(trimmed));
    if (dup) {
      Alert.alert('Nome duplicado', 'Já existe um serviço com este nome.');
      throw new Error('validation');
    }
    const serviceId = await createService(project.id, trimmed);
    await reload();
    const newService = (await getServices(project.id)).find((s) => s.id === serviceId) ?? null;
    if (captureNav.sessionId && captureNav.unit && newService) {
      openUnitCamera(newService);
    }
  };

  const listItems = mode === 'capture' && !showServices ? [] : items;
  const hidden = mode === 'capture' && !showServices;

  return (
    <CrudList<Service>
      items={listItems}
      icon="tool"
      emptyTitle={hidden ? 'Serviços ocultos' : 'Nenhum serviço'}
      emptyMessage={hidden
        ? 'Toque na câmera para fotografar esta unidade sem serviço.'
        : 'Cadastre os serviços que serão fotografados.'}
      addLabel="Novo serviço"
      header={mode === 'capture'
        ? <CaptureListHeader
            crumbs={[
              captureNav.block?.name ?? '',
              captureNav.building?.name ?? '',
              captureNav.floor?.name ?? '',
              captureNav.unit?.name ?? '',
            ]}
            showServices={showServices}
            onToggleServices={(v) => { void setShowServicesPref(v); }}
          />
        : undefined}
      structureKind="service"
      structureScopeId={project?.id}
      showFabOutsideEditMode={!hidden}
      itemDone={mode === 'capture' ? (s) => doneIds.has(s.id) : undefined}
      onItemsReordered={reload}
      onPressItem={mode === 'capture' ? (s) => openUnitCamera(s) : undefined}
      onCapturePress={mode === 'capture' ? () => openUnitCamera(null) : undefined}
      onCreate={mode === 'capture'
        ? createAndMaybeOpen
        : async (name) => { if (project) { await createService(project.id, name); await reload(); } }}
      onRename={async (s, name) => { await updateService(s.id, { name }); await reload(); }}
      onDelete={async (s) => { await deleteService(s.id); await reload(); }}
      onBatchDelete={async (ids) => { await deleteServices(ids); await reload(); }}
    />
  );
}
