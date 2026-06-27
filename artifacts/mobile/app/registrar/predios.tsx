import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { getBuildings, type Building } from '@/db/database';
import HierarchyCard from '@/components/HierarchyCard';
import BreadcrumbBar from '@/components/BreadcrumbBar';
import EmptyState from '@/components/EmptyState';

export default function RegistrarPredios() {
  const router = useRouter();
  const { captureNav, setCaptureNav } = useApp();
  const [items, setItems] = useState<Building[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      if (captureNav.block) setItems(await getBuildings(captureNav.block.id));
    })();
  }, [captureNav.block]));

  const select = (building: Building) => {
    setCaptureNav({ building, floor: null, unit: null, service: null, photoGroupId: null });
    router.push('/registrar/pavimentos');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <BreadcrumbBar items={[captureNav.block?.name ?? '']} />
      {items.length === 0 ? (
        <EmptyState icon="home" title="Nenhum prédio" message="Cadastre prédios na aba Estrutura." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <HierarchyCard title={item.name} left={<View style={styles.icon} />} onPress={() => select(item)} />
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
