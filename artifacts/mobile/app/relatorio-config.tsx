import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { getAppSetting, setAppSetting } from '@/db/database';
import colors from '@/constants/colors';

// ── Types ────────────────────────────────────────────────────────────────────
type PaginationMode = 'none' | 'current' | 'current_total';
type GroupField = 'building' | 'floor' | 'unit' | 'service';
type PhotoField = 'date' | 'time' | 'block' | 'building' | 'floor' | 'unit' | 'service';

interface GroupingItem {
  field: GroupField;
  label: string;
  enabled: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────
const PRESET_COLORS = [
  { color: '#0D47A1', name: 'Azul' },
  { color: '#1B5E20', name: 'Verde' },
  { color: '#E65100', name: 'Laranja' },
  { color: '#B71C1C', name: 'Vermelho' },
  { color: '#37474F', name: 'Cinza' },
  { color: '#212121', name: 'Preto' },
  { color: '#6A1B9A', name: 'Roxo' },
];

const DEFAULT_GROUPING: GroupingItem[] = [
  { field: 'building', label: 'Prédio', enabled: true },
  { field: 'floor', label: 'Pavimento', enabled: true },
  { field: 'unit', label: 'Unidade', enabled: true },
  { field: 'service', label: 'Serviço', enabled: true },
];

const PAGINATION_OPTIONS: { key: PaginationMode; label: string }[] = [
  { key: 'none', label: 'Sem numeração' },
  { key: 'current', label: 'Somente página atual (ex: 3)' },
  { key: 'current_total', label: 'Página e total (ex: 3 / 12)' },
];

const PHOTO_FIELDS: { key: PhotoField; label: string }[] = [
  { key: 'date', label: 'Data' },
  { key: 'time', label: 'Horário' },
  { key: 'block', label: 'Quadra' },
  { key: 'building', label: 'Prédio' },
  { key: 'floor', label: 'Pavimento' },
  { key: 'unit', label: 'Unidade' },
  { key: 'service', label: 'Serviço' },
];

const ALL_PHOTO_FIELDS: PhotoField[] = PHOTO_FIELDS.map(f => f.key);

// Sample data for the preview
const PREVIEW = {
  date: '27/06/2026',
  time: '14:35',
  block: 'Quadra A',
  building: 'Prédio 01',
  floor: '2º Pav.',
  unit: 'Apt 204',
  service: 'Hidráulica',
};

function isValidHex(s: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(s);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RelatorioConfig() {
  const [loading, setLoading] = useState(true);
  const [primaryColor, setPrimaryColor] = useState('#0D47A1');
  const [customHex, setCustomHex] = useState('');
  const [hexError, setHexError] = useState(false);
  const [paginationMode, setPaginationMode] = useState<PaginationMode>('none');
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoPickBusy, setLogoPickBusy] = useState(false);
  const [grouping, setGrouping] = useState<GroupingItem[]>(DEFAULT_GROUPING);
  const [photoFields, setPhotoFields] = useState<Set<PhotoField>>(new Set(ALL_PHOTO_FIELDS));

  useEffect(() => {
    (async () => {
      const [color, pagination, logo, groupingStr, photoFieldsStr] = await Promise.all([
        getAppSetting('report_primaryColor'),
        getAppSetting('report_paginationMode'),
        getAppSetting('report_logoPath'),
        getAppSetting('report_groupingFields'),
        getAppSetting('report_photoFields'),
      ]);
      if (color) { setPrimaryColor(color); setCustomHex(color); }
      if (pagination) setPaginationMode(pagination as PaginationMode);
      if (logo) {
        const info = await FileSystem.getInfoAsync(logo);
        if (info.exists) setLogoPath(logo);
      }
      if (groupingStr) {
        try {
          const parsed: { field: GroupField; enabled: boolean }[] = JSON.parse(groupingStr);
          if (Array.isArray(parsed) && parsed.length === 4) {
            setGrouping(parsed.map(p => ({
              field: p.field,
              label: DEFAULT_GROUPING.find(d => d.field === p.field)?.label ?? p.field,
              enabled: p.enabled,
            })));
          }
        } catch {}
      }
      if (photoFieldsStr) {
        try {
          const arr = JSON.parse(photoFieldsStr) as PhotoField[];
          if (Array.isArray(arr)) setPhotoFields(new Set(arr));
        } catch {}
      }
      setLoading(false);
    })();
  }, []);

  // ── Color ──────────────────────────────────────────────────────────────────
  const saveColor = useCallback(async (color: string) => {
    setPrimaryColor(color);
    setCustomHex(color);
    setHexError(false);
    await setAppSetting('report_primaryColor', color);
  }, []);

  const commitCustomHex = useCallback(async () => {
    const val = customHex.trim();
    const withHash = val.startsWith('#') ? val : `#${val}`;
    if (isValidHex(withHash)) {
      setHexError(false);
      await saveColor(withHash);
    } else {
      setHexError(true);
    }
  }, [customHex, saveColor]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const savePagination = useCallback(async (mode: PaginationMode) => {
    setPaginationMode(mode);
    await setAppSetting('report_paginationMode', mode);
  }, []);

  // ── Logo ───────────────────────────────────────────────────────────────────
  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria para selecionar um logotipo.');
      return;
    }
    setLogoPickBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        const dest = FileSystem.documentDirectory + 'report_logo.jpg';
        await FileSystem.copyAsync({ from: result.assets[0].uri, to: dest });
        setLogoPath(dest);
        await setAppSetting('report_logoPath', dest);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar a imagem.');
    } finally {
      setLogoPickBusy(false);
    }
  };

  const removeLogo = async () => {
    if (logoPath) {
      try { await FileSystem.deleteAsync(logoPath, { idempotent: true }); } catch {}
    }
    setLogoPath(null);
    await setAppSetting('report_logoPath', '');
  };

  // ── Grouping ───────────────────────────────────────────────────────────────
  const saveGrouping = useCallback(async (g: GroupingItem[]) => {
    setGrouping(g);
    const data = g.map(i => ({ field: i.field, enabled: i.enabled }));
    await setAppSetting('report_groupingFields', JSON.stringify(data));
  }, []);

  const moveUp = (i: number) => {
    if (i === 0) return;
    const g = [...grouping];
    [g[i - 1], g[i]] = [g[i], g[i - 1]];
    saveGrouping(g);
  };

  const moveDown = (i: number) => {
    if (i === grouping.length - 1) return;
    const g = [...grouping];
    [g[i], g[i + 1]] = [g[i + 1], g[i]];
    saveGrouping(g);
  };

  const toggleGroupField = (i: number) => {
    const enabledCount = grouping.filter(x => x.enabled).length;
    if (grouping[i].enabled && enabledCount === 1) {
      Alert.alert('Atenção', 'Pelo menos um nível de agrupamento deve estar ativo.');
      return;
    }
    const g = [...grouping];
    g[i] = { ...g[i], enabled: !g[i].enabled };
    saveGrouping(g);
  };

  // ── Photo fields ───────────────────────────────────────────────────────────
  const togglePhotoField = useCallback(async (key: PhotoField) => {
    const newFields = new Set(photoFields);
    if (newFields.has(key)) newFields.delete(key);
    else newFields.add(key);
    setPhotoFields(newFields);
    await setAppSetting('report_photoFields', JSON.stringify(Array.from(newFields)));
  }, [photoFields]);

  // Preview caption lines (computed from current photoFields)
  const prevDt = [
    photoFields.has('date') ? PREVIEW.date : '',
    photoFields.has('time') ? PREVIEW.time : '',
  ].filter(Boolean).join(' ');
  const prevLoc = [
    photoFields.has('block') ? PREVIEW.block : '',
    photoFields.has('building') ? PREVIEW.building : '',
    photoFields.has('floor') ? PREVIEW.floor : '',
  ].filter(Boolean).join(' · ');
  const prevUnit = [
    photoFields.has('unit') ? PREVIEW.unit : '',
    photoFields.has('service') ? PREVIEW.service : '',
  ].filter(Boolean).join(' · ');
  const hasPreview = prevDt || prevLoc || prevUnit;

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['bottom']}>
        <ActivityIndicator style={{ flex: 1 }} size="large" color={c.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Cor principal ── */}
        <Text style={s.sectionTitle}>Cor principal do relatório</Text>
        <View style={s.card}>
          <View style={s.swatches}>
            {PRESET_COLORS.map(({ color, name }) => (
              <TouchableOpacity key={color} style={s.swatchWrap} onPress={() => saveColor(color)}>
                <View style={[s.swatch, { backgroundColor: color }, primaryColor === color && s.swatchActive]}>
                  {primaryColor === color && <Feather name="check" size={14} color="#fff" />}
                </View>
                <Text style={s.swatchName}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.fieldLabel}>Cor personalizada (hex)</Text>
          <View style={s.hexRow}>
            <View style={[s.hexPreview, { backgroundColor: isValidHex(customHex) ? customHex : '#ccc' }]} />
            <TextInput
              style={[s.hexInput, hexError && s.hexInputError]}
              value={customHex}
              onChangeText={(t) => { setCustomHex(t); setHexError(false); }}
              onBlur={commitCustomHex}
              onSubmitEditing={commitCustomHex}
              placeholder="#0D47A1"
              placeholderTextColor={c.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={7}
            />
          </View>
          {hexError && <Text style={s.hexErrorTxt}>Formato inválido. Use #RRGGBB (ex: #0D47A1)</Text>}
        </View>

        {/* ── Numeração de páginas ── */}
        <Text style={s.sectionTitle}>Numeração de páginas</Text>
        <View style={s.card}>
          {PAGINATION_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.key} style={s.radioRow} onPress={() => savePagination(opt.key)}>
              <View style={[s.radio, paginationMode === opt.key && s.radioActive]}>
                {paginationMode === opt.key && <View style={s.radioDot} />}
              </View>
              <Text style={s.radioLabel}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Logotipo ── */}
        <Text style={s.sectionTitle}>Logotipo no relatório</Text>
        <View style={s.card}>
          {logoPath ? (
            <View style={s.logoRow}>
              <Image source={{ uri: logoPath }} style={s.logoThumb} resizeMode="contain" />
              <View style={s.logoActions}>
                <TouchableOpacity style={s.logoBtnSecondary} onPress={pickLogo} disabled={logoPickBusy}>
                  <Feather name="edit-2" size={16} color={c.primary} />
                  <Text style={s.logoBtnSecondaryTxt}>Trocar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.logoBtnDanger} onPress={removeLogo}>
                  <Feather name="trash-2" size={16} color={c.destructive} />
                  <Text style={s.logoBtnDangerTxt}>Remover</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={s.pickLogoBtn} onPress={pickLogo} disabled={logoPickBusy}>
              {logoPickBusy
                ? <ActivityIndicator size="small" color={c.primary} />
                : <><Feather name="image" size={20} color={c.primary} /><Text style={s.pickLogoBtnTxt}>Selecionar logotipo da galeria</Text></>}
            </TouchableOpacity>
          )}
          <Text style={s.logoHint}>O logotipo aparece no cabeçalho de cada relatório PDF.</Text>
        </View>

        {/* ── Agrupamento ── */}
        <Text style={s.sectionTitle}>Ordem de agrupamento</Text>
        <View style={s.card}>
          <Text style={s.groupHint}>Ative/desative e reordene os níveis de agrupamento do relatório.</Text>
          {grouping.map((item, i) => (
            <View key={item.field} style={s.groupRow}>
              <TouchableOpacity style={s.checkbox} onPress={() => toggleGroupField(i)}>
                <View style={[s.checkboxInner, item.enabled && s.checkboxActive]}>
                  {item.enabled && <Feather name="check" size={12} color="#fff" />}
                </View>
              </TouchableOpacity>
              <Text style={[s.groupLabel, !item.enabled && s.groupLabelOff]}>{item.label}</Text>
              <View style={s.arrows}>
                <TouchableOpacity style={s.arrowBtn} onPress={() => moveUp(i)} disabled={i === 0}>
                  <Feather name="chevron-up" size={22} color={i === 0 ? '#ccc' : c.foreground} />
                </TouchableOpacity>
                <TouchableOpacity style={s.arrowBtn} onPress={() => moveDown(i)} disabled={i === grouping.length - 1}>
                  <Feather name="chevron-down" size={22} color={i === grouping.length - 1 ? '#ccc' : c.foreground} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* ── Informações nas fotos ── */}
        <Text style={s.sectionTitle}>Informações exibidas nas fotos</Text>
        <View style={s.card}>
          <Text style={s.groupHint}>Escolha quais dados aparecem sob cada foto no relatório PDF. As fotos originais não são modificadas.</Text>
          {PHOTO_FIELDS.map(({ key, label }) => (
            <TouchableOpacity key={key} style={s.pfRow} onPress={() => togglePhotoField(key)}>
              <View style={[s.checkboxInner, photoFields.has(key) && s.checkboxActive]}>
                {photoFields.has(key) && <Feather name="check" size={12} color="#fff" />}
              </View>
              <Text style={[s.pfLabel, !photoFields.has(key) && s.pfLabelOff]}>{label}</Text>
            </TouchableOpacity>
          ))}

          {/* Live preview */}
          <Text style={s.previewTitle}>Prévia</Text>
          <View style={s.previewCard}>
            <View style={s.previewPhoto}>
              <Feather name="image" size={24} color="#9CA3AF" />
            </View>
            {hasPreview ? (
              <View style={s.previewInfo}>
                {prevDt ? <Text style={s.previewDt}>{prevDt}</Text> : null}
                {prevLoc ? <Text style={s.previewLoc}>{prevLoc}</Text> : null}
                {prevUnit ? <Text style={[s.previewUnit, { color: primaryColor }]}>{prevUnit}</Text> : null}
              </View>
            ) : (
              <View style={s.previewEmpty}>
                <Text style={s.previewEmptyTxt}>Sem informações — apenas a foto</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const c = colors.light;
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scroll: { padding: 16, gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: c.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 4 },
  card: { backgroundColor: c.card, borderRadius: colors.radius, padding: 16, gap: 4 },
  // Color
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  swatchWrap: { alignItems: 'center', gap: 4 },
  swatch: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  swatchActive: { borderWidth: 3, borderColor: '#fff', elevation: 3, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  swatchName: { fontSize: 10, color: c.mutedForeground },
  fieldLabel: { fontSize: 13, color: c.mutedForeground, marginBottom: 6 },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hexPreview: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: c.border },
  hexInput: { flex: 1, backgroundColor: c.background, borderWidth: 1, borderColor: c.border, borderRadius: colors.radius, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: c.foreground, minHeight: 44 },
  hexInputError: { borderColor: c.destructive },
  hexErrorTxt: { fontSize: 12, color: c.destructive, marginTop: 4 },
  // Pagination
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 48 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: c.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary },
  radioLabel: { flex: 1, fontSize: 14, color: c.foreground },
  // Logo
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoThumb: { width: 100, height: 50, borderRadius: 6, backgroundColor: c.background, borderWidth: 1, borderColor: c.border },
  logoActions: { flex: 1, gap: 8 },
  logoBtnSecondary: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  logoBtnSecondaryTxt: { fontSize: 14, color: c.primary, fontWeight: '600' },
  logoBtnDanger: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  logoBtnDangerTxt: { fontSize: 14, color: c.destructive, fontWeight: '600' },
  pickLogoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderWidth: 1.5, borderColor: c.border, borderRadius: colors.radius, borderStyle: 'dashed', minHeight: 52 },
  pickLogoBtnTxt: { fontSize: 14, color: c.primary, fontWeight: '600' },
  logoHint: { fontSize: 12, color: c.mutedForeground, marginTop: 8 },
  // Grouping
  groupHint: { fontSize: 12, color: c.mutedForeground, marginBottom: 8 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, minHeight: 48 },
  checkbox: { padding: 4 },
  checkboxInner: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: c.primary, borderColor: c.primary },
  groupLabel: { flex: 1, fontSize: 15, color: c.foreground, fontWeight: '500' },
  groupLabelOff: { color: c.mutedForeground, textDecorationLine: 'line-through' },
  arrows: { flexDirection: 'row' },
  arrowBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  // Photo fields
  pfRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, minHeight: 48 },
  pfLabel: { flex: 1, fontSize: 15, color: c.foreground },
  pfLabelOff: { color: c.mutedForeground },
  // Preview
  previewTitle: { fontSize: 12, fontWeight: '600', color: c.mutedForeground, marginTop: 14, marginBottom: 8 },
  previewCard: { borderWidth: 1, borderColor: c.border, borderRadius: colors.radius, overflow: 'hidden', backgroundColor: '#F5F7FA' },
  previewPhoto: { height: 64, backgroundColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  previewInfo: { padding: 7 },
  previewDt: { fontSize: 10, color: '#52606D', marginBottom: 2 },
  previewLoc: { fontSize: 11, fontWeight: '700', color: '#17202A' },
  previewUnit: { fontSize: 10, marginTop: 2 },
  previewEmpty: { padding: 10, alignItems: 'center' },
  previewEmptyTxt: { fontSize: 12, color: c.mutedForeground, fontStyle: 'italic' },
});
