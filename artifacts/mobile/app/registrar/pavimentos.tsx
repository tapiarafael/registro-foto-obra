import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { getFloors, type Floor } from '@/db/database';
import HierarchyCard from '@/components/HierarchyCard';
import BreadcrumbBar from '@/components/BreadcrumbBar';
import EmptyState from '@/components/EmptyState';

export default function RegistrarPavimentos() {
  const router = useRouter();
  const { captureNav, setCaptureNav } = useApp();
  const [items, setItems] = useState<Floor[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      if (captureNav.building) setItems(await getFloors(captureNav.building.id));
    })();
  }, [captureNav.building]));

  const select = (floor: Floor) => {
    setCaptureNav({ floor, unit: null, service: null, photoGroupId: null });
    router.push('/registrar/unidades');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <BreadcrumbBar items={[captureNav.block?.name ?? '', captureNav.building?.name ?? '']} />
      {items.length === 0 ? (
        <EmptyState icon="layers" title="Nenhum pavimento" message="Cadastre pavimentos na aba Estrutura." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(f) => String(f.id)}
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
