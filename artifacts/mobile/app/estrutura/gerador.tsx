import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { getBlocks, getBuildings, bulkCreateStructure, type Block, type Building } from '@/db/database';

type NumberFormat = 'cardinal' | 'ordinal_m' | 'ordinal_f';

interface GenSettings {
  de: string;
  ate: string;
  prefix: string;
  suffix: string;
  numberFormat: NumberFormat;
  leadingZeros: boolean;
  minDigits: string;
}

const FLOOR_DEFAULTS: GenSettings = {
  de: '1', ate: '5', prefix: 'Pavimento', suffix: '',
  numberFormat: 'cardinal', leadingZeros: false, minDigits: '2',
};

const UNIT_DEFAULTS: GenSettings = {
  de: '1', ate: '4', prefix: 'Apto', suffix: '',
  numberFormat: 'cardinal', leadingZeros: false, minDigits: '2',
};

function formatNumber(n: number, fmt: NumberFormat, leadingZeros: boolean, minDigits: number): string {
  const padded = leadingZeros ? String(n).padStart(minDigits, '0') : String(n);
  if (fmt === 'ordinal_m') return `${padded}\u00ba`;
  if (fmt === 'ordinal_f') return `${padded}\u00aa`;
  return padded;
}

function composeName(prefix: string, numStr: string, suffix: string): string {
  return [prefix.trim(), numStr, suffix.trim()].filter(p => p.length > 0).join(' ');
}

export function generateItems(s: GenSettings): Array<{ name: string; sort_order: number }> {
  const deStr = s.de.trim();
  const ateStr = s.ate.trim();
  if (deStr === '' || ateStr === '') return [];
  const de = parseInt(deStr, 10);
  const ate = parseInt(ateStr, 10);
  if (isNaN(de) || isNaN(ate) || ate < de) return [];
  const minD = Math.max(1, parseInt(s.minDigits, 10) || 1);
  return Array.from({ length: ate - de + 1 }, (_, i) => {
    const n = de + i;
    return { name: composeName(s.prefix, formatNumber(n, s.numberFormat, s.leadingZeros, minD), s.suffix), sort_order: n };
  });
}

export default function GeradorScreen() {
  const router = useRouter();
  const { project } = useApp();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [blockId, setBlockId] = useState<number | null>(null);
  const [buildingId, setBuildingId] = useState<number | null>(null);
  const [floorSettings, setFloorSettings] = useState<GenSettings>(FLOOR_DEFAULTS);
  const [unitSettings, setUnitSettings] = useState<GenSettings>(UNIT_DEFAULTS);
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => { if (project) setBlocks(await getBlocks(project.id)); })();
  }, [project]));

  const selectBlock = async (b: Block) => {
    setBlockId(b.id); setBuildingId(null);
    setBuildings(await getBuildings(b.id));
  };

  const floorItems = generateItems(floorSettings);
  const unitItems = generateItems(unitSettings);

  const generate = async () => {
    if (!buildingId) { Alert.alert('Selecione', 'Escolha quadra e prédio.'); return; }
    if (floorItems.length === 0 || unitItems.length === 0) {
      Alert.alert('Atenção', 'Defina ao menos 1 pavimento e 1 unidade.');
      return;
    }
    Alert.alert(
      'Gerar estrutura',
      `Serão criados ${floorItems.length} pavimento(s) com ${unitItems.length} unidade(s) cada\n(${floorItems.length * unitItems.length} unidades no total).`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Gerar', onPress: async () => {
            setBusy(true);
            try {
              await bulkCreateStructure(buildingId, floorItems, unitItems.map(u => ({ ...u, unit_type_id: null })));
              Alert.alert('Pronto', 'Estrutura gerada com sucesso.', [{ text: 'OK', onPress: () => router.back() }]);
            } catch {
              Alert.alert('Erro', 'Não foi possível gerar a estrutura.');
            } finally { setBusy(false); }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Quadra</Text>
        <View style={styles.pills}>
          {blocks.map(b => (
            <TouchableOpacity key={b.id} style={[styles.pill, blockId === b.id && styles.pillActive]} onPress={() => selectBlock(b)}>
              <Text style={[styles.pillText, blockId === b.id && styles.pillTextActive]}>{b.name}</Text>
            </TouchableOpacity>
          ))}
          {blocks.length === 0 && <Text style={styles.empty}>Nenhuma quadra cadastrada.</Text>}
        </View>

        {blockId !== null && (
          <>
            <Text style={styles.label}>Prédio</Text>
            <View style={styles.pills}>
              {buildings.map(b => (
                <TouchableOpacity key={b.id} style={[styles.pill, buildingId === b.id && styles.pillActive]} onPress={() => setBuildingId(b.id)}>
                  <Text style={[styles.pillText, buildingId === b.id && styles.pillTextActive]}>{b.name}</Text>
                </TouchableOpacity>
              ))}
              {buildings.length === 0 && <Text style={styles.empty}>Nenhum prédio nesta quadra.</Text>}
            </View>
          </>
        )}

        <SettingsCard title="Pavimentos" settings={floorSettings} onChange={setFloorSettings} previewSuffix="pavimento(s)" />
        <SettingsCard title="Unidades por pavimento" settings={unitSettings} onChange={setUnitSettings} previewSuffix="unidade(s) por pavimento" />

        <TouchableOpacity
          style={[styles.genBtn, (busy || !buildingId) && styles.disabled]}
          onPress={generate}
          disabled={busy || !buildingId}
        >
          {busy ? <ActivityIndicator color="#fff" /> : (
            <>
              <Feather name="zap" size={20} color="#fff" />
              <Text style={styles.genBtnText}>Gerar Estrutura</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsCard({ title, settings, onChange, previewSuffix }: {
  title: string;
  settings: GenSettings;
  onChange: (s: GenSettings) => void;
  previewSuffix: string;
}) {
  const c = colors.light;
  const items = generateItems(settings);
  const upd = (patch: Partial<GenSettings>) => onChange({ ...settings, ...patch });

  const previewLines = (): string[] => {
    if (items.length === 0) return [];
    const shown = items.slice(0, Math.min(3, items.length)).map(i => i.name);
    if (items.length > 4) shown.push('...');
    if (items.length > 3) shown.push(items[items.length - 1].name);
    return shown;
  };

  const totalLabel = items.length === 0
    ? 'Configure os campos acima.'
    : `Serão criados ${items.length} ${previewSuffix}.`;

  const fmtOptions: { key: NumberFormat; label: string }[] = [
    { key: 'cardinal', label: 'Cardinal' },
    { key: 'ordinal_m', label: '1\u00ba' },
    { key: 'ordinal_f', label: '1\u00aa' },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>

      <Row label="Número (De / Até)">
        <View style={styles.rangeRow}>
          <View style={styles.rangeField}>
            <Text style={styles.rangeLabel}>De</Text>
            <NumInput value={settings.de} onChangeText={(v) => upd({ de: v })} style={styles.rangeInput} />
          </View>
          <View style={styles.rangeField}>
            <Text style={styles.rangeLabel}>Até</Text>
            <NumInput value={settings.ate} onChangeText={(v) => upd({ ate: v })} style={styles.rangeInput} />
          </View>
        </View>
      </Row>

      <Row label="Prefixo">
        <TextInput style={styles.txt} value={settings.prefix} onChangeText={(v) => upd({ prefix: v })} placeholder="Opcional" placeholderTextColor={c.mutedForeground} />
      </Row>

      <Row label="Sufixo">
        <TextInput style={styles.txt} value={settings.suffix} onChangeText={(v) => upd({ suffix: v })} placeholder="Opcional" placeholderTextColor={c.mutedForeground} />
      </Row>

      <View style={{ marginVertical: 8 }}>
        <Text style={[styles.rowLabel, { marginBottom: 8 }]}>Formato do número</Text>
        <View style={styles.fmtRow}>
          {fmtOptions.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.fmtChip, settings.numberFormat === key && styles.fmtChipActive]}
              onPress={() => upd({ numberFormat: key })}
            >
              <Text style={[styles.fmtChipText, settings.numberFormat === key && styles.fmtChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Row label="Adicionar zero à esquerda">
        <Switch value={settings.leadingZeros} onValueChange={(v) => upd({ leadingZeros: v })} trackColor={{ true: c.primary }} />
      </Row>

      {settings.leadingZeros && (
        <Row label="Quantidade mínima de dígitos">
          <NumInput value={settings.minDigits} onChangeText={(v) => upd({ minDigits: v })} style={styles.smallInput} />
        </Row>
      )}

      <View style={styles.preview}>
        <Text style={styles.previewTitle}>Prévia</Text>
        {previewLines().map((line, i) => (
          <Text key={i} style={styles.previewItem}>{line}</Text>
        ))}
        <Text style={styles.previewTotal}>{totalLabel}</Text>
      </View>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

function NumInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      keyboardType="number-pad"
      placeholderTextColor={colors.light.mutedForeground}
      {...props}
      style={[styles.numInput, props.style as object]}
    />
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scroll: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', color: c.mutedForeground, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.card },
  pillActive: { backgroundColor: c.primary, borderColor: c.primary },
  pillText: { fontSize: 13, color: c.foreground, fontWeight: '500' },
  pillTextActive: { color: '#fff' },
  empty: { fontSize: 13, color: c.mutedForeground },
  card: { backgroundColor: c.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: c.border, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: c.foreground, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, gap: 12 },
  rowLabel: { fontSize: 14, color: c.foreground, flex: 1 },
  rangeRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  rangeField: { alignItems: 'center', gap: 4 },
  rangeLabel: { fontSize: 12, color: c.mutedForeground, fontWeight: '600' },
  rangeInput: { width: 68, textAlign: 'center' },
  numInput: {
    backgroundColor: c.background, borderWidth: 1, borderColor: c.border, borderRadius: colors.radius,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: c.foreground, minHeight: 48,
  },
  smallInput: { width: 72, textAlign: 'center' },
  txt: {
    backgroundColor: c.background, borderWidth: 1, borderColor: c.border, borderRadius: colors.radius,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: c.foreground, minWidth: 130, minHeight: 48,
  },
  fmtRow: { flexDirection: 'row', gap: 8 },
  fmtChip: {
    flex: 1, paddingVertical: 10, borderRadius: colors.radius, borderWidth: 1,
    borderColor: c.border, backgroundColor: c.background, alignItems: 'center',
  },
  fmtChipActive: { backgroundColor: c.primary, borderColor: c.primary },
  fmtChipText: { fontSize: 13, color: c.foreground, fontWeight: '600' },
  fmtChipTextActive: { color: '#fff' },
  preview: { backgroundColor: c.secondary, borderRadius: colors.radius, padding: 12, marginTop: 12 },
  previewTitle: { fontSize: 11, fontWeight: '700', color: c.primary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewItem: { fontSize: 13, color: c.foreground, lineHeight: 20 },
  previewTotal: { fontSize: 12, color: c.mutedForeground, marginTop: 6, fontStyle: 'italic' },
  genBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: c.accent, paddingVertical: 16, borderRadius: colors.radius, minHeight: 52,
  },
  genBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
