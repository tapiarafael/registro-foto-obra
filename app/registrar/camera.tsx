import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { addPhoto, deletePhoto, getPhotosInGroup, getWatermarkConfig, type Photo, type WatermarkConfig } from '@/db/database';
import { savePhoto, getPhotoUri, getThumbnailUri, formatDateTime, deletePhotoFiles } from '@/services/photoService';

export default function CameraScreen() {
  const c = colors.light;
  const router = useRouter();
  const { captureNav, incrementTodayCount } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Photo | null>(null);
  const [facing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [wmConfig, setWmConfig] = useState<WatermarkConfig | null>(null);

  const cycleFlash = () => setFlash((f) => (f === 'off' ? 'on' : f === 'on' ? 'auto' : 'off'));
  const flashLabel = flash === 'off' ? 'Flash' : flash === 'on' ? 'Flash ligado' : 'Flash auto';

  const groupId = captureNav.photoGroupId;

  const reload = useCallback(async () => {
    if (groupId) setPhotos(await getPhotosInGroup(groupId));
  }, [groupId]);

  useFocusEffect(useCallback(() => {
    void reload();
    void getWatermarkConfig().then(setWmConfig);
  }, [reload]));

  const persist = async (uri: string, source: 'CAMERA' | 'GALLERY') => {
    if (!groupId) return;
    setBusy(true);
    try {
      const saved = await savePhoto(uri);
      const now = new Date().toISOString();
      await addPhoto({
        photoGroupId: groupId,
        internalFilename: saved.internalFilename,
        thumbnailFilename: saved.thumbnailFilename,
        sourceType: source,
        capturedAt: now,
        importedAt: source === 'GALLERY' ? now : undefined,
        width: saved.width,
        height: saved.height,
        sizeBytes: saved.sizeBytes,
      });
      incrementTodayCount();
      await reload();
    } catch (e) {
      console.error('persist photo error', e);
      Alert.alert('Erro', 'Não foi possível salvar a foto.');
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current || busy) return;
    try {
      const result = await cameraRef.current.takePictureAsync({ quality: 0.9, shutterSound: false });
      if (result?.uri) await persist(result.uri, 'CAMERA');
    } catch (e) {
      console.error('takePhoto error', e);
    }
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Conceda acesso às fotos para importar imagens.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ['images'] });
    if (!result.canceled && result.assets[0]) await persist(result.assets[0].uri, 'GALLERY');
  };

  const removePhoto = async (photo: Photo) => {
    Alert.alert('Excluir foto', 'Deseja remover esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          const deleted = await deletePhoto(photo.id);
          if (deleted) await deletePhotoFiles(deleted.internal_filename, deleted.thumbnail_filename);
          setPreview(null);
          await reload();
        },
      },
    ]);
  };

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator color={c.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permWrap}>
        <Feather name="camera-off" size={48} color={c.mutedForeground} />
        <Text style={styles.permTitle}>Permissão da câmera</Text>
        <Text style={styles.permText}>Precisamos da câmera para registrar as fotos da obra.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Conceder permissão</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permBack} onPress={() => router.back()}>
          <Text style={styles.permBackText}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const wmEnabled = wmConfig?.enabled ?? true;
  const wmFields = wmConfig?.fields ?? [];
  const isEnabled = (key: string) => {
    if (!wmConfig) return true;
    const f = wmFields.find(f => f.field === key);
    return f ? f.enabled : true;
  };

  const wmLines: string[] = [];
  if (wmEnabled) {
    if (isEnabled('datetime')) wmLines.push(formatDateTime(new Date().toISOString()));
    if (isEnabled('quadra') && captureNav.block?.name) wmLines.push(`Quadra: ${captureNav.block.name}`);
    if (isEnabled('predio') && captureNav.building?.name) wmLines.push(`Prédio: ${captureNav.building.name}`);
    if (isEnabled('pavimento') && captureNav.floor?.name) wmLines.push(`Pav.: ${captureNav.floor.name}`);
    if (isEnabled('unidade') && captureNav.unit?.name) wmLines.push(`Unidade: ${captureNav.unit.name}`);
    if (isEnabled('servico') && captureNav.service?.name) wmLines.push(`Serviço: ${captureNav.service.name}`);
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} flash={flash} />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.topInfo}>
            <Text style={styles.topService} numberOfLines={1}>{captureNav.service?.name}</Text>
            <Text style={styles.topPath} numberOfLines={1}>
              {captureNav.block?.name} · {captureNav.building?.name} · {captureNav.floor?.name} · {captureNav.unit?.name}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.iconBtn, flash !== 'off' && styles.iconBtnActive]}
            onPress={cycleFlash}
            accessibilityLabel={flashLabel}
          >
            <Feather
              name={flash === 'off' ? 'zap-off' : 'zap'}
              size={20}
              color={flash === 'off' ? '#fff' : '#000'}
            />
            {flash === 'auto' && <Text style={styles.flashAuto}>A</Text>}
          </TouchableOpacity>
        </View>

        {wmEnabled && wmLines.length > 0 && (
          <View style={styles.watermark} pointerEvents="none">
            {wmLines.map((line, i) => (
              <Text key={i} style={styles.wmText}>{line}</Text>
            ))}
          </View>
        )}

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery} disabled={busy}>
            <Feather name="image" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.shutter} onPress={takePhoto} disabled={busy} activeOpacity={0.7}>
            {busy ? <ActivityIndicator color={c.primary} /> : <View style={styles.shutterInner} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()} disabled={busy}>
            <Feather name="check" size={24} color="#fff" />
            <Text style={styles.doneText}>{photos.length}</Text>
          </TouchableOpacity>
        </View>

        {photos.length > 0 && (
          <View style={styles.strip}>
            {photos.slice(0, 6).map(p => (
              <Pressable key={p.id} onPress={() => setPreview(p)}>
                <Image source={{ uri: getThumbnailUri(p.thumbnail_filename) }} style={styles.thumb} />
              </Pressable>
            ))}
          </View>
        )}
      </SafeAreaView>

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={styles.previewWrap}>
          {preview && (
            <>
              <Image source={{ uri: getPhotoUri(preview.internal_filename) }} style={styles.previewImg} resizeMode="contain" />
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>{formatDateTime(preview.captured_at)}</Text>
              </View>
              <View style={styles.previewActions}>
                <TouchableOpacity style={styles.previewClose} onPress={() => setPreview(null)}>
                  <Feather name="x" size={22} color="#fff" />
                  <Text style={styles.previewBtnText}>Fechar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.previewDelete} onPress={() => removePhoto(preview)}>
                  <Feather name="trash-2" size={22} color="#fff" />
                  <Text style={styles.previewBtnText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: 'rgba(0,0,0,0.4)' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  iconBtnActive: { backgroundColor: c.accent },
  flashAuto: { position: 'absolute', bottom: 5, right: 7, fontSize: 9, fontWeight: '700', color: '#000' },
  topInfo: { flex: 1 },
  topService: { color: '#fff', fontSize: 16, fontWeight: '700' },
  topPath: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  watermark: { position: 'absolute', bottom: 200, left: 16, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  wmText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 24, paddingHorizontal: 24, backgroundColor: 'rgba(0,0,0,0.4)' },
  galleryBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  doneBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.success, alignItems: 'center', justifyContent: 'center' },
  doneText: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 1 },
  strip: { position: 'absolute', bottom: 130, left: 0, right: 0, flexDirection: 'row', gap: 6, paddingHorizontal: 16 },
  thumb: { width: 48, height: 48, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  previewWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  previewImg: { width: '100%', height: '70%' },
  previewBadge: { position: 'absolute', top: 60, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  previewBadgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  previewActions: { position: 'absolute', bottom: 60, flexDirection: 'row', gap: 16 },
  previewClose: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: colors.radius, backgroundColor: 'rgba(255,255,255,0.2)' },
  previewDelete: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: colors.radius, backgroundColor: c.destructive },
  previewBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  permWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: c.background },
  permTitle: { fontSize: 18, fontWeight: '700', color: c.foreground, marginTop: 16 },
  permText: { fontSize: 14, color: c.mutedForeground, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  permBtn: { backgroundColor: c.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: colors.radius, marginTop: 24, minHeight: 48, justifyContent: 'center' },
  permBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  permBack: { marginTop: 12, padding: 12 },
  permBackText: { color: c.mutedForeground, fontSize: 14 },
});
