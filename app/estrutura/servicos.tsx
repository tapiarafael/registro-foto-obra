import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { getServices, createService, updateService, deleteService, deleteServices, type Service } from '@/db/database';
import CrudList from '@/components/CrudList';

export default function EstruturaServicos() {
  const { project } = useApp();
  const [items, setItems] = useState<Service[]>([]);

  const reload = useCallback(async () => {
    if (project) setItems(await getServices(project.id));
  }, [project]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return (
    <CrudList<Service>
      items={items}
      icon="tool"
      emptyTitle="Nenhum serviço"
      emptyMessage="Cadastre os serviços que serão fotografados."
      addLabel="Novo serviço"
      structureKind="service"
      structureScopeId={project?.id}
      onItemsReordered={reload}
      onCreate={async (name) => { if (project) { await createService(project.id, name); await reload(); } }}
      onRename={async (s, name) => { await updateService(s.id, { name }); await reload(); }}
      onDelete={async (s) => { await deleteService(s.id); await reload(); }}
      onBatchDelete={async (ids) => { await deleteServices(ids); await reload(); }}
    />
  );
}
