import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { getStorageStats, getStorageByDate, deletePhotosByDate } from '@/db/database';
import { deleteReportArtifactsForDate } from '@/services/reportService';
import { deletePhotoFilesByFilenames, formatFileSize } from '@/services/photoService';
import { formatDateLong } from '@/utils/datetime';

export default function ArmazenamentoScreen() {
  const c = colors.light;
  const [stats, setStats] = useState<{ total_bytes: number; photo_count: number; oldest_date: string | null; newest_date: string | null } | null>(null);
  const [byDate, setByDate] = useState<{ date: string; photo_count: number; total_bytes: number; session_count: number }[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setStats(await getStorageStats());
    setByDate(await getStorageByDate());
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const clearDate = (date: string) => {
    Alert.alert('Apagar fotos', `Apagar todas as fotos de ${formatDateLong(date)}? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar', style: 'destructive', onPress: async () => {
          setBusy(true);
          try {
            const { filenames, reports } = await deletePhotosByDate(date);
            await deletePhotoFilesByFilenames(filenames);
            await deleteReportArtifactsForDate(reports);
            await reload();
          } finally { setBusy(false); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={byDate}
        keyExtractor={(d) => d.date}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <SummaryItem icon="hard-drive" value={stats ? formatFileSize(stats.total_bytes) : '—'} label="Espaço usado" />
              <SummaryItem icon="image" value={stats ? String(stats.photo_count) : '—'} label="Fotos" />
            </View>
            {stats?.oldest_date && (
              <Text style={styles.range}>
                {formatDateLong(stats.oldest_date)} — {formatDateLong(stats.newest_date!)}
              </Text>
            )}
            <Text style={styles.sectionLabel}>Por data</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="hard-drive" size={40} color={c.mutedForeground} />
            <Text style={styles.emptyText}>Nenhuma foto armazenada.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.dateCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateName}>{formatDateLong(item.date)}</Text>
              <Text style={styles.dateMeta}>{item.photo_count} foto(s) · {formatFileSize(item.total_bytes)}</Text>
            </View>
            <TouchableOpacity style={styles.delBtn} onPress={() => clearDate(item.date)} disabled={busy} hitSlop={8}>
              <Feather name="trash-2" size={20} color={c.destructive} />
            </TouchableOpacity>
          </View>
        )}
      />
      {busy && (
        <View style={styles.busyOverlay}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

function SummaryItem({ icon, value, label }: { icon: keyof typeof Feather.glyphMap; value: string; label: string }) {
  const c = colors.light;
  return (
    <View style={styles.summaryItem}>
      <Feather name={icon} size={22} color={c.primary} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  list: { padding: 16, gap: 10 },
  summary: { marginBottom: 8 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryItem: { flex: 1, backgroundColor: c.card, borderRadius: colors.radius, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  summaryValue: { fontSize: 20, fontWeight: '700', color: c.foreground, marginTop: 8 },
  summaryLabel: { fontSize: 12, color: c.mutedForeground, marginTop: 2 },
  range: { fontSize: 13, color: c.mutedForeground, textAlign: 'center', marginTop: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: c.mutedForeground, marginTop: 20, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderRadius: colors.radius, padding: 14, borderWidth: 1, borderColor: c.border },
  dateName: { fontSize: 15, fontWeight: '600', color: c.foreground },
  dateMeta: { fontSize: 13, color: c.mutedForeground, marginTop: 2 },
  delBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { fontSize: 14, color: c.mutedForeground },
  busyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
});
