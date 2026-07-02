import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, Platform, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera, useCameraDevice, useCameraPermission, type Camera as CameraType,
} from 'react-native-vision-camera';
import colors from '@/constants/colors';
import PhotoThumbnailStrip from '@/components/PhotoThumbnailStrip';
import { useApp } from '@/context/AppContext';
import { useRegistrarHome } from '@/hooks/useRegistrarHome';
import { addPhoto, deletePhoto, getPhotosInGroup, getWatermarkConfig, type Photo, type WatermarkConfig } from '@/db/database';
import { savePhoto, getPhotoUri, getThumbnailUri, formatDateTime, deletePhotoFiles } from '@/services/photoService';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

type SaveItem = { uri: string; source: 'CAMERA' | 'GALLERY' };

export default function CameraScreen() {
  const c = colors.light;
  const router = useRouter();
  const goHome = useRegistrarHome();
  const { captureNav, incrementTodayCount, refreshDashboard } = useApp();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<CameraType>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const zoomRef = useRef(1);
  const pinchStartZoomRef = useRef(1);
  const zoomBoundsRef = useRef({ min: 1, max: 1, neutral: 1 });
  const saveQueueRef = useRef<SaveItem[]>([]);
  const processingRef = useRef(false);
  const savingCountRef = useRef(0);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [importing, setImporting] = useState(false);
  const [savingCount, setSavingCount] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState<Photo | null>(null);
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [wmConfig, setWmConfig] = useState<WatermarkConfig | null>(null);
  const [zoom, setZoom] = useState(1);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [active, setActive] = useState(true);

  const cycleFlash = () => setFlash((f) => (f === 'off' ? 'on' : f === 'on' ? 'auto' : 'off'));
  const flashLabel = flash === 'off' ? 'Flash' : flash === 'on' ? 'Flash ligado' : 'Flash auto';

  const groupId = captureNav.photoGroupId;

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useFocusEffect(useCallback(() => {
    setActive(true);
    return () => setActive(false);
  }, []));

  useEffect(() => () => {
    if (focusTimer.current) clearTimeout(focusTimer.current);
  }, []);

  const reload = useCallback(async () => {
    if (groupId) setPhotos(await getPhotosInGroup(groupId));
  }, [groupId]);

  useFocusEffect(useCallback(() => {
    void reload();
    void getWatermarkConfig().then(setWmConfig);
  }, [reload]));

  const updateZoom = useCallback((value: number) => {
    const { min, max } = zoomBoundsRef.current;
    const next = clamp(value, min, max);
    zoomRef.current = next;
    setZoom(next);
  }, []);

  useEffect(() => {
    if (!device) return;
    zoomBoundsRef.current = { min: device.minZoom, max: device.maxZoom, neutral: device.neutralZoom };
    updateZoom(device.neutralZoom);
  }, [device, updateZoom]);

  const handlePinchBegin = useCallback(() => {
    pinchStartZoomRef.current = zoomRef.current;
  }, []);

  const handlePinchUpdate = useCallback((scale: number) => {
    const { min, max } = zoomBoundsRef.current;
    updateZoom(clamp(pinchStartZoomRef.current * scale, min, max));
  }, [updateZoom]);

  const handleFocusTap = useCallback(async (x: number, y: number) => {
    if (!device?.supportsFocus) return;
    setFocusPoint({ x, y });
    if (focusTimer.current) clearTimeout(focusTimer.current);
    try {
      await cameraRef.current?.focus({ x, y });
    } catch { /* ponytail: some devices reject focus mid-adjust */ }
    focusTimer.current = setTimeout(() => setFocusPoint(null), 1500);
  }, [device?.supportsFocus]);

  const tap = useMemo(() => Gesture.Tap().onEnd((e) => {
    'worklet';
    runOnJS(handleFocusTap)(e.x, e.y);
  }), [handleFocusTap]);

  const pinch = useMemo(() => Gesture.Pinch()
    .onBegin(() => {
      'worklet';
      runOnJS(handlePinchBegin)();
    })
    .onUpdate((e) => {
      'worklet';
      runOnJS(handlePinchUpdate)(e.scale);
    }), [handlePinchBegin, handlePinchUpdate]);

  const cameraGestures = useMemo(() => Gesture.Simultaneous(tap, pinch), [tap, pinch]);

  const persistOne = useCallback(async (uri: string, source: 'CAMERA' | 'GALLERY'): Promise<boolean> => {
    if (!groupId) return false;
    savingCountRef.current += 1;
    setSavingCount(savingCountRef.current);
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
      return true;
    } catch (e) {
      console.error('persist photo error', e);
      return false;
    } finally {
      savingCountRef.current -= 1;
      setSavingCount(savingCountRef.current);
    }
  }, [groupId, incrementTodayCount, reload]);

  const drainSaveQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      while (saveQueueRef.current.length > 0) {
        const item = saveQueueRef.current.shift()!;
        const ok = await persistOne(item.uri, item.source);
        if (!ok) Alert.alert('Erro', 'Não foi possível salvar a foto.');
      }
    } finally {
      processingRef.current = false;
      if (saveQueueRef.current.length > 0) void drainSaveQueue();
    }
  }, [persistOne]);

  const enqueuePersist = useCallback((uri: string, source: 'CAMERA' | 'GALLERY') => {
    saveQueueRef.current.push({ uri, source });
    void drainSaveQueue();
  }, [drainSaveQueue]);

  const persistMany = useCallback(async (uris: string[]) => {
    if (!groupId || uris.length === 0) return;
    setImporting(true);
    let failures = 0;
    for (const uri of uris) {
      const ok = await persistOne(uri, 'GALLERY');
      if (!ok) failures += 1;
    }
    setImporting(false);
    if (failures > 0) {
      Alert.alert('Erro', `Não foi possível importar ${failures} foto(s).`);
    }
  }, [groupId, persistOne]);

  const takePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePhoto({ flash, enableShutterSound: false });
      enqueuePersist(`file://${photo.path}`, 'CAMERA');
    } catch (e) {
      console.error('takePhoto error', e);
    } finally {
      setCapturing(false);
    }
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Conceda acesso às fotos para importar imagens.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 1,
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 0,
    });
    if (!result.canceled && result.assets.length > 0) {
      await persistMany(result.assets.map((a) => a.uri));
    }
  };

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
    if (photos.length > 0) router.push('/registrar/revisao');
    else router.back();
  };

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.permWrap}>
        <Feather name="camera-off" size={48} color={c.mutedForeground} />
        <Text style={styles.permTitle}>Câmera indisponível</Text>
        <Text style={styles.permText}>Use um build Android para registrar fotos.</Text>
        <TouchableOpacity style={styles.permBack} onPress={() => router.back()}>
          <Text style={styles.permBackText}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
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

  if (!device) {
    return (
      <SafeAreaView style={styles.permWrap}>
        <Feather name="camera-off" size={48} color={c.mutedForeground} />
        <Text style={styles.permTitle}>Câmera não disponível</Text>
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

  const galleryBusy = importing || savingCount > 0;

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={active && !preview}
        photo={true}
        zoom={zoom}
        photoQualityBalance="speed"
      />

      <GestureDetector gesture={cameraGestures}>
        <View
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Área da câmera"
          accessibilityHint="Toque para focar ou belisque para zoom"
        />
      </GestureDetector>

      {focusPoint && (
        <View
          pointerEvents="none"
          style={[styles.reticle, { left: focusPoint.x - 35, top: focusPoint.y - 35 }]}
        />
      )}

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} accessibilityLabel="Voltar">
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.topInfo}>
            <Text style={styles.topService} numberOfLines={1}>{captureNav.service?.name}</Text>
            <Text style={styles.topPath} numberOfLines={1}>
              {captureNav.block?.name} · {captureNav.building?.name} · {captureNav.floor?.name} · {captureNav.unit?.name}
            </Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={goHome} accessibilityLabel="Início">
            <Feather name="home" size={20} color="#fff" />
          </TouchableOpacity>
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
          <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery} disabled={galleryBusy}>
            {galleryBusy ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="image" size={24} color="#fff" />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.shutter} onPress={takePhoto} disabled={capturing} activeOpacity={0.7}>
            {capturing ? <ActivityIndicator color={c.primary} /> : <View style={styles.shutterInner} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneBtn} onPress={finish}>
            <Feather name="check" size={24} color="#fff" />
            <Text style={styles.doneText}>{photos.length}</Text>
          </TouchableOpacity>
        </View>

        {photos.length > 0 && (
          <View style={styles.strip}>
            <PhotoThumbnailStrip
              photos={photos.map(p => ({
                id: p.id,
                uri: getThumbnailUri(p.thumbnail_filename),
                capturedAt: p.captured_at,
              }))}
              onPressPhoto={(item) => setPreview(photos.find(p => p.id === item.id) ?? null)}
              onDeletePhoto={(item) => {
                const photo = photos.find(p => p.id === item.id);
                if (photo) removePhoto(photo);
              }}
              size={56}
            />
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
  strip: { position: 'absolute', bottom: 130, left: 0, right: 0, paddingHorizontal: 16 },
  reticle: {
    position: 'absolute', width: 70, height: 70,
    borderWidth: 2, borderColor: '#fff', borderRadius: 2,
  },
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
