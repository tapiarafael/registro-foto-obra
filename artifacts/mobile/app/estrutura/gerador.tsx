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
import {
  getBlocks, getBuildings, bulkCreateStructure,
  type Block, type Building,
} from '@/db/database';

export default function GeradorScreen() {
  const c = colors.light;
  const router = useRouter();
  const { project } = useApp();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [blockId, setBlockId] = useState<number | null>(null);
  const [buildingId, setBuildingId] = useState<number | null>(null);

  const [floorCount, setFloorCount] = useState('5');
  const [floorPrefix, setFloorPrefix] = useState('Pavimento');
  const [startFloor, setStartFloor] = useState('1');
  const [unitCount, setUnitCount] = useState('4');
  const [unitPrefix, setUnitPrefix] = useState('Apto');
  const [padZero, setPadZero] = useState(true);
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => { if (project) setBlocks(await getBlocks(project.id)); })();
  }, [project]));

  const selectBlock = async (b: Block) => {
    setBlockId(b.id); setBuildingId(null);
    setBuildings(await getBuildings(b.id));
  };

  const pad = (n: number) => padZero && n < 10 ? `0${n}` : String(n);

  const floors = (() => {
    const count = Math.max(0, parseInt(floorCount) || 0);
    const start = parseInt(startFloor) || 1;
    return Array.from({ length: count }, (_, i) => ({
      name: `${floorPrefix} ${pad(start + i)}`.trim(),
      sort_order: start + i,
    }));
  })();

  const units = (() => {
    const count = Math.max(0, parseInt(unitCount) || 0);
    return Array.from({ length: count }, (_, i) => ({
      name: `${unitPrefix} ${pad(i + 1)}`.trim(),
      sort_order: i + 1,
      unit_type_id: null,
    }));
  })();

  const generate = async () => {
    if (!buildingId) { Alert.alert('Selecione', 'Escolha quadra e prédio.'); return; }
    if (floors.length === 0 || units.length === 0) { Alert.alert('Atenção', 'Defina ao menos 1 pavimento e 1 unidade.'); return; }
    Alert.alert(
      'Gerar estrutura',
      `Serão criados ${floors.length} pavimento(s) com ${units.length} unidade(s) cada (${floors.length * units.length} unidades).`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Gerar', onPress: async () => {
            setBusy(true);
            try {
              await bulkCreateStructure(buildingId, floors, units);
              Alert.alert('Pronto', 'Estrutura gerada com sucesso.', [{ text: 'OK', onPress: () => router.back() }]);
            } catch (e) {
              console.error('gerador error', e);
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
        </View>

        {blockId && (
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pavimentos</Text>
          <Row label="Quantidade"><NumInput value={floorCount} onChangeText={setFloorCount} /></Row>
          <Row label="Início"><NumInput value={startFloor} onChangeText={setStartFloor} /></Row>
          <Row label="Prefixo"><TextInput style={styles.txt} value={floorPrefix} onChangeText={setFloorPrefix} placeholderTextColor={c.mutedForeground} /></Row>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Unidades por pavimento</Text>
          <Row label="Quantidade"><NumInput value={unitCount} onChangeText={setUnitCount} /></Row>
          <Row label="Prefixo"><TextInput style={styles.txt} value={unitPrefix} onChangeText={setUnitPrefix} placeholderTextColor={c.mutedForeground} /></Row>
          <Row label="Zero à esquerda (01, 02...)">
            <Switch value={padZero} onValueChange={setPadZero} trackColor={{ true: c.primary }} />
          </Row>
        </View>

        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Prévia</Text>
          <Text style={styles.previewText}>
            {floors.length > 0 && units.length > 0
              ? `${floors[0]?.name} → ${units[0]?.name}, ${units[1]?.name ?? ''}…  (${floors.length * units.length} unidades no total)`
              : 'Defina pavimentos e unidades.'}
          </Text>
        </View>

        <TouchableOpacity style={[styles.genBtn, busy && styles.disabled]} onPress={generate} disabled={busy}>
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}
function NumInput(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput style={styles.numInput} keyboardType="number-pad" placeholderTextColor={colors.light.mutedForeground} {...props} />;
}

const c = colors.light;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scroll: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: c.mutedForeground, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.card },
  pillActive: { backgroundColor: c.primary, borderColor: c.primary },
  pillText: { fontSize: 13, color: c.foreground, fontWeight: '500' },
  pillTextActive: { color: '#fff' },
  empty: { fontSize: 13, color: c.mutedForeground },
  card: { backgroundColor: c.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: c.border, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: c.foreground, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, gap: 12 },
  rowLabel: { fontSize: 14, color: c.foreground, flex: 1 },
  numInput: { backgroundColor: c.background, borderWidth: 1, borderColor: c.border, borderRadius: colors.radius, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: c.foreground, minWidth: 80, textAlign: 'center', minHeight: 48 },
  txt: { backgroundColor: c.background, borderWidth: 1, borderColor: c.border, borderRadius: colors.radius, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: c.foreground, minWidth: 140, minHeight: 48 },
  preview: { backgroundColor: c.secondary, borderRadius: colors.radius, padding: 14, marginBottom: 16 },
  previewTitle: { fontSize: 13, fontWeight: '600', color: c.primary, marginBottom: 4 },
  previewText: { fontSize: 13, color: c.foreground, lineHeight: 18 },
  genBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: c.accent, paddingVertical: 16, borderRadius: colors.radius, minHeight: 52 },
  genBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
