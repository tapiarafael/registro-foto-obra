import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import {
  getServices, createService, updateService, deleteService, deleteServices,
  getServicesForDateUnit, getOrCreatePhotoGroup, type Service,
} from '@/db/database';
import { todayDateString } from '@/services/photoService';
import CrudList from '@/components/CrudList';
import BreadcrumbBar from '@/components/BreadcrumbBar';

const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

export default function RegistrarServicos() {
  const router = useRouter();
  const { project, captureNav, setCaptureNav, setPhotoGroupId } = useApp();
  const [items, setItems] = useState<Service[]>([]);
  const [doneIds, setDoneIds] = useState<Set<number>>(new Set());

  const reload = useCallback(async () => {
    if (!project) return;
    const svcs = await getServices(project.id);
    setItems(svcs);
    if (captureNav.unit) {
      const done = await getServicesForDateUnit(captureNav.unit.id, todayDateString());
      setDoneIds(new Set(done.map((s) => s.id)));
    } else {
      setDoneIds(new Set());
    }
  }, [project, captureNav.unit]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const select = async (service: Service) => {
    if (!captureNav.sessionId || !captureNav.unit) return;
    const groupId = await getOrCreatePhotoGroup(captureNav.sessionId, captureNav.unit.id, service.id);
    setCaptureNav({ service });
    setPhotoGroupId(groupId);
    router.push('/registrar/camera');
  };

  const createAndMaybeOpen = async (name: string) => {
    if (!project) return;
    const trimmed = name.trim().replace(/\s+/g, ' ');
    if (trimmed.length > 80) {
      Alert.alert('Nome inválido', 'Nome muito longo (máximo 80 caracteres).');
      throw new Error('validation');
    }
    const dup = items.find(s => normalize(s.name) === normalize(trimmed));
    if (dup) {
      Alert.alert('Nome duplicado', 'Já existe um serviço com este nome.');
      throw new Error('validation');
    }
    const serviceId = await createService(project.id, trimmed);
    await reload();
    if (captureNav.sessionId && captureNav.unit) {
      const groupId = await getOrCreatePhotoGroup(captureNav.sessionId, captureNav.unit.id, serviceId);
      const newService = (await getServices(project.id)).find(s => s.id === serviceId);
      if (newService) setCaptureNav({ service: newService });
      setPhotoGroupId(groupId);
      router.push('/registrar/camera');
    }
  };

  return (
    <CrudList<Service>
      items={items}
      icon="tool"
      emptyTitle="Nenhum serviço"
      emptyMessage="Cadastre os serviços que serão fotografados."
      addLabel="Novo serviço"
      header={<BreadcrumbBar items={[
        captureNav.block?.name ?? '',
        captureNav.building?.name ?? '',
        captureNav.floor?.name ?? '',
        captureNav.unit?.name ?? '',
      ]} />}
      structureKind="service"
      structureScopeId={project?.id}
      itemDone={(s) => doneIds.has(s.id)}
      onItemsReordered={reload}
      onPressItem={(s) => { void select(s); }}
      onCreate={createAndMaybeOpen}
      onRename={async (s, name) => { await updateService(s.id, { name }); await reload(); }}
      onDelete={async (s) => { await deleteService(s.id); await reload(); }}
      onBatchDelete={async (ids) => { await deleteServices(ids); await reload(); }}
    />
  );
}
