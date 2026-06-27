import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { getBlocks, type Block } from '@/db/database';
import HierarchyCard from '@/components/HierarchyCard';
import BreadcrumbBar from '@/components/BreadcrumbBar';
import EmptyState from '@/components/EmptyState';

export default function RegistrarQuadras() {
  const router = useRouter();
  const { project, setCaptureNav } = useApp();
  const [blocks, setBlocks] = useState<Block[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      if (project) setBlocks(await getBlocks(project.id));
    })();
  }, [project]));

  const select = (block: Block) => {
    setCaptureNav({ block, building: null, floor: null, unit: null, service: null, photoGroupId: null });
    router.push('/registrar/predios');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <BreadcrumbBar items={[]} />
      {blocks.length === 0 ? (
        <EmptyState icon="grid" title="Nenhuma quadra" message="Cadastre quadras na aba Estrutura." />
      ) : (
        <FlatList
          data={blocks}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <HierarchyCard
              title={item.name}
              left={<View style={styles.icon} />}
              onPress={() => select(item)}
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
  icon: { width: 8, height: 40, borderRadius: 4, backgroundColor: c.primary },
});
