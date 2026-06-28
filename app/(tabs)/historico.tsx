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
type HierarchyLevel = 'blocks' | 'buildings' | 'floors' | 'units' | 'services';

interface Crumb { id: number; name: string }

interface PathState {
  block?: Crumb;
  building?: Crumb;
  floor?: Crumb;
  unit?: Crumb;
}

interface HierarchyItem {
  id: number;
  name: string;
  photo_count: number;
}

const HIERARCHY_LEVELS: HierarchyLevel[] = ['blocks', 'buildings', 'floors', 'units', 'services'];

const LEVEL_CONFIG: Record<HierarchyLevel, {
  pathKey: keyof PathState;
  icon: keyof typeof Feather.glyphMap;
  loadItems: (date: string, path: PathState) => Promise<HierarchyItem[]>;
  loadChildren: (item: HierarchyItem, date: string) => Promise<HierarchyItem[]>;
}> = {
  blocks: {
    pathKey: 'block',
    icon: 'grid',
    loadItems: (date) => getBlocksForDate(date),
    loadChildren: (item, date) => getBuildingsForDate(item.id, date),
  },
  buildings: {
    pathKey: 'building',
    icon: 'home',
    loadItems: (date, path) => getBuildingsForDate(path.block!.id, date),
    loadChildren: (item, date) => getFloorsForDate(item.id, date),
  },
  floors: {
    pathKey: 'floor',
    icon: 'layers',
    loadItems: (date, path) => getFloorsForDate(path.building!.id, date),
    loadChildren: (item, date) => getUnitsForDate(item.id, date),
  },
  units: {
    pathKey: 'unit',
    icon: 'box',
    loadItems: (date, path) => getUnitsForDate(path.floor!.id, date),
    loadChildren: (item, date) => getServicesForDateUnit(item.id, date),
  },
  services: {
    pathKey: 'unit',
    icon: 'tool',
    loadItems: (date, path) => getServicesForDateUnit(path.unit!.id, date),
    loadChildren: async () => [],
  },
};

function isHierarchyLevel(level: Level): level is HierarchyLevel {
  return HIERARCHY_LEVELS.includes(level as HierarchyLevel);
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.backRow}>
      <TouchableOpacity style={styles.backBtn} onPress={onPress}>
        <Feather name="arrow-left" size={18} color={c.primary} />
        <Text style={styles.backText}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}

const ListSeparator = () => <View style={styles.listSeparator} />;

export default function HistoricoScreen() {
  const [level, setLevel] = useState<Level>('dates');
  const [date, setDate] = useState('');
  const [path, setPath] = useState<PathState>({});
  const [items, setItems] = useState<(DateSummary | HierarchyItem)[]>([]);
  const [photos, setPhotos] = useState<PhotoWithHierarchy[]>([]);
  const [preview, setPreview] = useState<PhotoWithHierarchy | null>(null);

  const loadDates = useCallback(async () => {
    setItems(await getDateSummaries());
  }, []);

  useFocusEffect(useCallback(() => {
    if (level === 'dates') loadDates();
  }, [level, loadDates]));

  const goDates = async () => {
    setLevel('dates');
    setPath({});
    setItems(await getDateSummaries());
  };

  const openDate = async (d: DateSummary) => {
    const blocks = await getBlocksForDate(d.date);
    setDate(d.date);
    setPath({});
    setItems(blocks);
    setLevel('blocks');
  };

  const openHierarchyItem = async (item: HierarchyItem) => {
    if (level === 'services') {
      const nextPhotos = await getPhotosForDateUnitService(path.unit!.id, item.id, date);
      setPhotos(nextPhotos);
      setLevel('photos');
      return;
    }
    if (!isHierarchyLevel(level)) return;

    const cfg = LEVEL_CONFIG[level];
    const nextLevel = HIERARCHY_LEVELS[HIERARCHY_LEVELS.indexOf(level) + 1];
    const nextPath = { ...path, [cfg.pathKey]: { id: item.id, name: item.name } };
    const nextItems = await cfg.loadChildren(item, date);
    setPath(nextPath);
    setItems(nextItems);
    setLevel(nextLevel);
  };

  const back = async () => {
    if (level === 'blocks') return goDates();
    if (level === 'photos') {
      const services = await LEVEL_CONFIG.services.loadItems(date, path);
      setPhotos([]);
      setItems(services);
      setLevel('services');
      return;
    }
    if (!isHierarchyLevel(level)) return;

    const prevLevel = HIERARCHY_LEVELS[HIERARCHY_LEVELS.indexOf(level) - 1];
    const prevItems = await LEVEL_CONFIG[prevLevel].loadItems(date, path);
    setItems(prevItems);
    setLevel(prevLevel);
  };

  const crumbs = [
    date ? formatDateLong(date) : '',
    path.block?.name,
    path.building?.name,
    path.floor?.name,
    path.unit?.name,
  ].filter(Boolean) as string[];

  if (level === 'dates') {
    const dates = items as DateSummary[];
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {dates.length === 0 ? (
          <EmptyState icon="clock" title="Sem registros" message="As fotos capturadas aparecerão aqui agrupadas por data." />
        ) : (
          <FlatList
            key="dates"
            data={dates}
            keyExtractor={(d) => d.date}
            ItemSeparatorComponent={ListSeparator}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
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

  const hierarchyItems = items as HierarchyItem[];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <BackButton onPress={back} />
      <BreadcrumbBar items={crumbs} />
      {level === 'photos' ? (
        photos.length === 0 ? (
          <EmptyState icon="image" title="Sem fotos" />
        ) : (
          <FlatList
            key="photos-grid"
            data={photos}
            keyExtractor={(p) => `photo-${p.id}`}
            numColumns={3}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            renderItem={({ item }) => (
              <Pressable style={styles.gridItem} onPress={() => setPreview(item)}>
                <Image source={{ uri: getThumbnailUri(item.thumbnail_filename) }} style={styles.gridImg} />
                <View style={styles.gridBadge}>
                  <Text style={styles.gridBadgeText}>{formatDateTime(item.captured_at).split(' ')[1]}</Text>
                </View>
              </Pressable>
            )}
          />
        )
      ) : isHierarchyLevel(level) ? (
        <FlatList
          key={`hierarchy-${level}`}
          data={hierarchyItems}
          keyExtractor={(x, index) => `${level}-${x.id ?? index}`}
          ItemSeparatorComponent={ListSeparator}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <HierarchyCard
              title={item.name}
              subtitle={`${item.photo_count} foto(s)`}
              badge={item.photo_count}
              left={<Feather name={LEVEL_CONFIG[level].icon} size={22} color={c.primary} />}
              onPress={() => openHierarchyItem(item)}
            />
          )}
        />
      ) : null}
      {level === 'photos' && <PhotoPreview preview={preview} onClose={() => setPreview(null)} />}
    </SafeAreaView>
  );
}

interface PhotoPreviewProps {
  preview: PhotoWithHierarchy | null;
  onClose: () => void;
}

function PhotoPreview({ preview, onClose }: PhotoPreviewProps) {
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
  list: { padding: 16 },
  listSeparator: { height: 10 },
  grid: { padding: 12 },
  gridRow: { gap: 6, marginBottom: 6 },
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
