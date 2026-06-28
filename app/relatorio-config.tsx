import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { getAppSetting, getReportShowLabels, setAppSetting } from '@/db/database';
import colors from '@/constants/colors';

// ── Types ────────────────────────────────────────────────────────────────────
type PaginationMode = 'none' | 'current' | 'current_total';
type ImageQuality = 'fast' | 'medium' | 'high';
type GroupField = 'building' | 'floor' | 'unit' | 'service';

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

const IMAGE_QUALITY_OPTIONS: { key: ImageQuality; label: string }[] = [
  { key: 'fast', label: 'Rápida (320px) — recomendado para muitas fotos' },
  { key: 'medium', label: 'Média (800px)' },
  { key: 'high', label: 'Alta (resolução total) — suporta relatórios grandes' },
];

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
  const [imageQuality, setImageQuality] = useState<ImageQuality>('fast');
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoPickBusy, setLogoPickBusy] = useState(false);
  const [grouping, setGrouping] = useState<GroupingItem[]>(DEFAULT_GROUPING);
  const [showSectionLabels, setShowSectionLabels] = useState(true);

  useEffect(() => {
    (async () => {
      const [color, pagination, logo, groupingStr, quality, labels] = await Promise.all([
        getAppSetting('report_primaryColor'),
        getAppSetting('report_paginationMode'),
        getAppSetting('report_logoPath'),
        getAppSetting('report_groupingFields'),
        getAppSetting('report_imageQuality'),
        getReportShowLabels(),
      ]);
      if (color) { setPrimaryColor(color); setCustomHex(color); }
      if (pagination) setPaginationMode(pagination as PaginationMode);
      if (quality === 'fast' || quality === 'medium' || quality === 'high') setImageQuality(quality);
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
      setShowSectionLabels(labels);
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

  // ── Image quality ──────────────────────────────────────────────────────────
  const saveImageQuality = useCallback(async (quality: ImageQuality) => {
    setImageQuality(quality);
    await setAppSetting('report_imageQuality', quality);
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
        const normalized = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [],
          { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 },
        );
        await FileSystem.copyAsync({ from: normalized.uri, to: dest });
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

  const saveShowSectionLabels = useCallback(async (enabled: boolean) => {
    setShowSectionLabels(enabled);
    await setAppSetting('report_showLabels', enabled ? '1' : '0');
  }, []);

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

        {/* ── Qualidade das imagens ── */}
        <Text style={s.sectionTitle}>Qualidade das imagens</Text>
        <View style={s.card}>
          {IMAGE_QUALITY_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.key} style={s.radioRow} onPress={() => saveImageQuality(opt.key)}>
              <View style={[s.radio, imageQuality === opt.key && s.radioActive]}>
                {imageQuality === opt.key && <View style={s.radioDot} />}
              </View>
              <Text style={s.radioLabel}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
          <Text style={s.logoHint}>Imagens menores geram o PDF muito mais rápido. Use "Alta" apenas quando precisar da resolução total.</Text>
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

        {/* ── Rótulos das seções ── */}
        <Text style={s.sectionTitle}>Rótulos das seções</Text>
        <View style={s.card}>
          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.switchLabel}>Exibir rótulos</Text>
              <Text style={s.switchHint}>
                {showSectionLabels ? 'Ex.: Prédio: Prédio 1' : 'Ex.: Prédio 1'}
              </Text>
              <Text style={s.logoHint}>Exibe o nome do campo antes do valor nos títulos de seção do PDF.</Text>
            </View>
            <Switch
              value={showSectionLabels}
              onValueChange={saveShowSectionLabels}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor="#fff"
            />
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
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  switchLabel: { fontSize: 15, fontWeight: '500', color: c.foreground },
  switchHint: { fontSize: 13, color: c.mutedForeground, marginTop: 2 },
});
