import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { getServices, getOrCreatePhotoGroup, type Service } from '@/db/database';
import HierarchyCard from '@/components/HierarchyCard';
import BreadcrumbBar from '@/components/BreadcrumbBar';
import EmptyState from '@/components/EmptyState';

export default function RegistrarServicos() {
  const router = useRouter();
  const { project, captureNav, setCaptureNav, setPhotoGroupId } = useApp();
  const [items, setItems] = useState<Service[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      if (project) setItems(await getServices(project.id));
    })();
  }, [project]));

  const select = async (service: Service) => {
    if (!captureNav.sessionId || !captureNav.unit) return;
    const groupId = await getOrCreatePhotoGroup(captureNav.sessionId, captureNav.unit.id, service.id);
    setCaptureNav({ service });
    setPhotoGroupId(groupId);
    router.push('/registrar/camera');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <BreadcrumbBar items={[
        captureNav.block?.name ?? '', captureNav.building?.name ?? '',
        captureNav.floor?.name ?? '', captureNav.unit?.name ?? '',
      ]} />
      {items.length === 0 ? (
        <EmptyState
          icon="tool"
          title="Nenhum serviço"
          message="Cadastre serviços na aba Estrutura."
          actionLabel="Cadastrar serviços"
          onAction={() => router.push('/estrutura/servicos')}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <HierarchyCard
              title={item.name}
              left={<View style={styles.icon} />}
              onPress={() => select(item)}
              showChevron={false}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  list: { padding: 16, gap: 10 },
  icon: { width: 8, height: 40, borderRadius: 4, backgroundColor: c.accent },
});
