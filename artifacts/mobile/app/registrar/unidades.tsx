import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { getUnits, type Unit } from '@/db/database';
import HierarchyCard from '@/components/HierarchyCard';
import BreadcrumbBar from '@/components/BreadcrumbBar';
import EmptyState from '@/components/EmptyState';

export default function RegistrarUnidades() {
  const router = useRouter();
  const { captureNav, setCaptureNav } = useApp();
  const [items, setItems] = useState<Unit[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      if (captureNav.floor) setItems(await getUnits(captureNav.floor.id));
    })();
  }, [captureNav.floor]));

  const select = (unit: Unit) => {
    setCaptureNav({ unit, service: null, photoGroupId: null });
    router.push('/registrar/servicos');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <BreadcrumbBar items={[captureNav.block?.name ?? '', captureNav.building?.name ?? '', captureNav.floor?.name ?? '']} />
      {items.length === 0 ? (
        <EmptyState icon="box" title="Nenhuma unidade" message="Cadastre unidades na aba Estrutura." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(u) => String(u.id)}
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
