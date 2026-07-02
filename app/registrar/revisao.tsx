import React, { useCallback, useState } from 'react';
import {
  Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import BreadcrumbBar from '@/components/BreadcrumbBar';
import EmptyState from '@/components/EmptyState';
import { deletePhoto, getPhotosInGroup, type Photo } from '@/db/database';
import { deletePhotoFiles, getPhotoUri, getThumbnailUri } from '@/services/photoService';
import { formatDateTime } from '@/utils/datetime';

export default function RevisaoScreen() {
  const c = colors.light;
  const router = useRouter();
  const { captureNav, refreshDashboard } = useApp();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [preview, setPreview] = useState<Photo | null>(null);

  const groupId = captureNav.photoGroupId;

  const reload = useCallback(async () => {
    if (groupId) setPhotos(await getPhotosInGroup(groupId));
  }, [groupId]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  const removePhoto = (photo: Photo) => {
    Alert.alert('Excluir foto', 'Deseja remover esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          const deleted = await deletePhoto(photo.id);
          if (deleted) await deletePhotoFiles(deleted.internal_filename, deleted.thumbnail_filename);
          setPreview(null);
          await reload();
          await refreshDashboard();
        },
      },
    ]);
  };

  const finish = () => {
    router.replace('/registrar/servicos');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <BreadcrumbBar items={[
        captureNav.block?.name ?? '',
        captureNav.building?.name ?? '',
        captureNav.floor?.name ?? '',
        captureNav.unit?.name ?? '',
        captureNav.service?.name ?? '',
      ]} />

      <View style={styles.header}>
        <Text style={styles.count}>
          {photos.length} foto{photos.length === 1 ? '' : 's'}
        </Text>
        <TouchableOpacity
          style={styles.backToCamera}
          onPress={() => router.back()}
          accessibilityLabel="Voltar à câmera"
        >
          <Feather name="camera" size={18} color={c.primary} />
          <Text style={styles.backToCameraText}>Voltar à câmera</Text>
        </TouchableOpacity>
      </View>

      {photos.length === 0 ? (
        <EmptyState icon="image" title="Sem fotos" message="Volte à câmera para registrar fotos." />
      ) : (
        <FlatList
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
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.finishBtn, photos.length === 0 && styles.finishBtnMuted]}
          onPress={finish}
          accessibilityLabel="Concluir"
        >
          <Feather name="check" size={20} color="#fff" />
          <Text style={styles.finishBtnText}>Concluir</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={pStyles.wrap}>
          {preview && (
            <>
              <Image source={{ uri: getPhotoUri(preview.internal_filename) }} style={pStyles.img} resizeMode="contain" />
              <View style={pStyles.badge}>
                <Text style={pStyles.badgeText}>{formatDateTime(preview.captured_at)}</Text>
              </View>
              <View style={pStyles.actions}>
                <TouchableOpacity style={pStyles.close} onPress={() => setPreview(null)}>
                  <Feather name="x" size={22} color="#fff" />
                  <Text style={pStyles.btnText}>Fechar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pStyles.delete} onPress={() => removePhoto(preview)}>
                  <Feather name="trash-2" size={22} color="#fff" />
                  <Text style={pStyles.btnText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  count: { fontSize: 15, fontWeight: '600', color: c.foreground },
  backToCamera: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10, minHeight: 48, justifyContent: 'center',
  },
  backToCameraText: { fontSize: 14, color: c.primary, fontWeight: '600' },
  grid: { padding: 12, paddingBottom: 8 },
  gridRow: { gap: 6, marginBottom: 6 },
  gridItem: { flex: 1 / 3, aspectRatio: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: c.secondary, position: 'relative' },
  gridImg: { width: '100%', height: '100%' },
  gridBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  gridBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.card },
  finishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: c.success, paddingVertical: 14, borderRadius: colors.radius, minHeight: 48,
  },
  finishBtnMuted: { backgroundColor: c.mutedForeground },
  finishBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

const pStyles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: '75%' },
  badge: { position: 'absolute', top: 60, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  actions: { position: 'absolute', bottom: 60, flexDirection: 'row', gap: 16 },
  close: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: colors.radius, backgroundColor: 'rgba(255,255,255,0.2)' },
  delete: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: colors.radius, backgroundColor: c.destructive },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
