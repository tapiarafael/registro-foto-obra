import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import {
  getWatermarkConfig, saveWatermarkConfig,
  DEFAULT_WATERMARK_FIELDS,
  type WatermarkConfig,
  type WatermarkFieldItem,
  type WatermarkFieldKey,
} from '@/db/database';

const FIELD_LABELS: Record<WatermarkFieldKey, string> = {
  datetime: 'Data / Hora',
  quadra: 'Quadra',
  predio: 'Prédio',
  pavimento: 'Pavimento',
  unidade: 'Unidade',
  servico: 'Serviço',
};

export default function MarcaDaguaConfig() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<WatermarkConfig>({ enabled: true, fields: DEFAULT_WATERMARK_FIELDS });

  useEffect(() => {
    (async () => {
      const cfg = await getWatermarkConfig();
      setConfig(cfg);
      setLoading(false);
    })();
  }, []);

  const toggleMaster = async (val: boolean) => {
    const next: WatermarkConfig = { ...config, enabled: val };
    setConfig(next);
    await saveWatermarkConfig(next);
  };

  const toggleField = async (field: WatermarkFieldKey) => {
    const next: WatermarkFieldItem[] = config.fields.map(f =>
      f.field === field ? { ...f, enabled: !f.enabled } : f
    );
    const nextConfig: WatermarkConfig = { ...config, fields: next };
    setConfig(nextConfig);
    await saveWatermarkConfig(nextConfig);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['bottom']}>
        <ActivityIndicator style={{ flex: 1 }} size="large" color={c.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>

        <Text style={s.sectionTitle}>Visibilidade da marca d'água</Text>
        <View style={s.card}>
          <View style={s.row}>
            <View style={s.rowText}>
              <Text style={s.rowLabel}>Exibir marca d'água</Text>
              <Text style={s.rowHint}>Mostra informações sobre a foto na câmera e no relatório PDF</Text>
            </View>
            <Switch
              value={config.enabled}
              onValueChange={toggleMaster}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {config.enabled && (
          <>
            <Text style={s.sectionTitle}>Campos exibidos</Text>
            <View style={s.card}>
              <Text style={s.fieldsHint}>Escolha quais informações aparecem na câmera e nas legendas do PDF.</Text>
              {config.fields.map((item) => (
                <TouchableOpacity
                  key={item.field}
                  style={s.row}
                  onPress={() => toggleField(item.field)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.rowLabel, !item.enabled && s.rowLabelOff]}>
                    {FIELD_LABELS[item.field]}
                  </Text>
                  <Switch
                    value={item.enabled}
                    onValueChange={() => toggleField(item.field)}
                    trackColor={{ false: c.border, true: c.primary }}
                    thumbColor="#fff"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const c = colors.light;
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scroll: { padding: 16, gap: 6 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: c.mutedForeground,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 4,
  },
  card: { backgroundColor: c.card, borderRadius: colors.radius, padding: 16, gap: 4 },
  fieldsHint: { fontSize: 12, color: c.mutedForeground, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, minHeight: 52,
  },
  rowText: { flex: 1 },
  rowLabel: { flex: 1, fontSize: 15, color: c.foreground, fontWeight: '500' },
  rowLabelOff: { color: c.mutedForeground },
  rowHint: { fontSize: 12, color: c.mutedForeground, marginTop: 2 },
});
