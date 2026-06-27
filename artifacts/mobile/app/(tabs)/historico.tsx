import React, { useCallback, useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import {
  getDateSummaries, getBlocksForDate, getBuildingsForDate, getFloorsForDate,
  getUnitsForDate, getServicesForDateUnit, getPhotosForDateUnitService,
  type DateSummary, type PhotoWithHierarchy,
} from '@/db/database';
import { getPhotoUri, getThumbnailUri, formatDateLong, formatDateTime } from '@/services/photoService';
import HierarchyCard from '@/components/HierarchyCard';
import BreadcrumbBar from '@/components/BreadcrumbBar';
import EmptyState from '@/components/EmptyState';

type Level = 'dates' | 'blocks' | 'buildings' | 'floors' | 'units' | 'services' | 'photos';

interface Crumb { id: number; name: string }

export default function HistoricoScreen() {
  const c = colors.light;
  const [level, setLevel] = useState<Level>('dates');
  const [date, setDate] = useState<string>('');
  const [path, setPath] = useState<Record<string, Crumb>>({});
  const [items, setItems] = useState<any[]>([]);
  const [photos, setPhotos] = useState<PhotoWithHierarchy[]>([]);
  const [preview, setPreview] = useState<PhotoWithHierarchy | null>(null);

  const loadDates = useCallback(async () => {
    setItems(await getDateSummaries());
  }, []);

  useFocusEffect(useCallback(() => {
    if (level === 'dates') loadDates();
  }, [level, loadDates]));

  const goDates = async () => { setLevel('dates'); setPath({}); setItems(await getDateSummaries()); };
  const openDate = async (d: DateSummary) => {
    setDate(d.date); setLevel('blocks'); setItems(await getBlocksForDate(d.date));
  };
  const openBlock = async (b: any) => {
    setPath(p => ({ ...p, block: { id: b.id, name: b.name } }));
    setLevel('buildings'); setItems(await getBuildingsForDate(b.id, date));
  };
  const openBuilding = async (b: any) => {
    setPath(p => ({ ...p, building: { id: b.id, name: b.name } }));
    setLevel('floors'); setItems(await getFloorsForDate(b.id, date));
  };
  const openFloor = async (f: any) => {
    setPath(p => ({ ...p, floor: { id: f.id, name: f.name } }));
    setLevel('units'); setItems(await getUnitsForDate(f.id, date));
  };
  const openUnit = async (u: any) => {
    setPath(p => ({ ...p, unit: { id: u.id, name: u.name } }));
    setLevel('services'); setItems(await getServicesForDateUnit(u.id, date));
  };
  const openService = async (s: any) => {
    setLevel('photos');
    setPhotos(await getPhotosForDateUnitService(path.unit.id, s.id, date));
  };

  const back = async () => {
    if (level === 'blocks') return goDates();
    if (level === 'buildings') { setLevel('blocks'); setItems(await getBlocksForDate(date)); return; }
    if (level === 'floors') { setLevel('buildings'); setItems(await getBuildingsForDate(path.block.id, date)); return; }
    if (level === 'units') { setLevel('floors'); setItems(await getFloorsForDate(path.building.id, date)); return; }
    if (level === 'services') { setLevel('units'); setItems(await getUnitsForDate(path.floor.id, date)); return; }
    if (level === 'photos') { setLevel('services'); setItems(await getServicesForDateUnit(path.unit.id, date)); return; }
  };

  const crumbs = [
    date ? formatDateLong(date) : '',
    path.block?.name, path.building?.name, path.floor?.name, path.unit?.name,
  ].filter(Boolean) as string[];

  if (level === 'dates') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {items.length === 0 ? (
          <EmptyState icon="clock" title="Sem registros" message="As fotos capturadas aparecerão aqui agrupadas por data." />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(d: DateSummary) => d.date}
            contentContainerStyle={styles.list}
            renderItem={({ item }: { item: DateSummary }) => (
              <HierarchyCard
                title={formatDateLong(item.date)}
                subtitle={`${item.photo_count} foto(s)`}
                badge={item.photo_count}
                left={<Feather name="calendar" size={22} color={c.primary} />}
                onPress={() => openDate(item)}
              />
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  if (level === 'photos') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.backRow}>
          <TouchableOpacity style={styles.backBtn} onPress={back}>
            <Feather name="arrow-left" size={18} color={c.primary} />
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>
        </View>
        <BreadcrumbBar items={crumbs} />
        {photos.length === 0 ? (
          <EmptyState icon="image" title="Sem fotos" />
        ) : (
          <FlatList
            data={photos}
            keyExtractor={(p) => String(p.id)}
            numColumns={3}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={{ gap: 6 }}
            renderItem={({ item }) => (
              <Pressable style={styles.gridItem} onPress={() => setPreview(item)}>
                <Image source={{ uri: getThumbnailUri(item.thumbnail_filename) }} style={styles.gridImg} />
                <View style={styles.gridBadge}>
                  <Text style={styles.gridBadgeText}>{formatDateTime(item.captured_at).split(' ')[1]}</Text>
                </View>
              </Pressable>
            )}
          />
        )}
        <PhotoPreview preview={preview} onClose={() => setPreview(null)} />
      </SafeAreaView>
    );
  }

  const handlers: Record<string, (x: any) => void> = {
    blocks: openBlock, buildings: openBuilding, floors: openFloor, units: openUnit, services: openService,
  };
  const iconFor: Record<string, keyof typeof Feather.glyphMap> = {
    blocks: 'grid', buildings: 'home', floors: 'layers', units: 'box', services: 'tool',
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.backRow}>
        <TouchableOpacity style={styles.backBtn} onPress={back}>
          <Feather name="arrow-left" size={18} color={c.primary} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
      </View>
      <BreadcrumbBar items={crumbs} />
      <FlatList
        data={items}
        keyExtractor={(x) => String(x.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <HierarchyCard
            title={item.name}
            subtitle={`${item.photo_count} foto(s)`}
            badge={item.photo_count}
            left={<Feather name={iconFor[level]} size={22} color={c.primary} />}
            onPress={() => handlers[level](item)}
          />
        )}
      />
    </SafeAreaView>
  );
}

function PhotoPreview({ preview, onClose }: { preview: PhotoWithHierarchy | null; onClose: () => void }) {
  return (
    <Modal visible={!!preview} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pStyles.wrap}>
        {preview && (
          <>
            <Image source={{ uri: getPhotoUri(preview.internal_filename) }} style={pStyles.img} resizeMode="contain" />
            <View style={pStyles.badge}>
              <Text style={pStyles.badgeText}>{formatDateTime(preview.captured_at)}</Text>
            </View>
            <TouchableOpacity style={pStyles.close} onPress={onClose}>
              <Feather name="x" size={22} color="#fff" />
              <Text style={pStyles.closeText}>Fechar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  list: { padding: 16, gap: 10 },
  grid: { padding: 12, gap: 6 },
  gridItem: { flex: 1 / 3, aspectRatio: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: c.secondary, position: 'relative' },
  gridImg: { width: '100%', height: '100%' },
  gridBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  gridBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  backRow: { paddingHorizontal: 12, paddingTop: 10 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  backText: { color: c.primary, fontSize: 15, fontWeight: '600' },
});

const pStyles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: '75%' },
  badge: { position: 'absolute', top: 60, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  close: { position: 'absolute', bottom: 60, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)' },
  closeText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
