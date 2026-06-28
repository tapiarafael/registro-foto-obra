import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { getUnits, getUnitsForDate, type Unit } from '@/db/database';
import { todayDateString } from '@/services/photoService';
import HierarchyCard from '@/components/HierarchyCard';
import BreadcrumbBar from '@/components/BreadcrumbBar';
import EmptyState from '@/components/EmptyState';

export default function RegistrarUnidades() {
  const router = useRouter();
  const { captureNav, setCaptureNav } = useApp();
  const [items, setItems] = useState<Unit[]>([]);
  const [doneIds, setDoneIds] = useState<Set<number>>(new Set());

  useFocusEffect(useCallback(() => {
    (async () => {
      if (!captureNav.floor) return;
      setItems(await getUnits(captureNav.floor.id));
      const done = await getUnitsForDate(captureNav.floor.id, todayDateString());
      setDoneIds(new Set(done.map((u) => u.id)));
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
        <EmptyState
          icon="box"
          title="Nenhuma unidade"
          message="Cadastre unidades na aba Estrutura."
          actionLabel="Cadastrar unidades"
          onAction={() => captureNav.floor && router.push({
            pathname: '/estrutura/unidades',
            params: { floorId: String(captureNav.floor.id), floorName: captureNav.floor.name },
          })}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(u) => String(u.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <HierarchyCard title={item.name} left={<View style={styles.icon} />} onPress={() => select(item)} done={doneIds.has(item.id)} />
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
