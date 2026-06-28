import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import {
  getDateSummaries, getBlockPhotoCountForDate,
  type DateSummary,
} from '@/db/database';
import { generatePDF, generateZIP, shareFile } from '@/services/reportService';
import { formatDateLong } from '@/services/photoService';
import HierarchyCard from '@/components/HierarchyCard';
import EmptyState from '@/components/EmptyState';
import ProgressModal from '@/components/ProgressModal';

type Progress = { phase: 'reading' | 'rendering'; current: number; total: number };

export default function RelatoriosScreen() {
  const c = colors.light;
  const { project } = useApp();
  const [dates, setDates] = useState<DateSummary[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<{ block_id: number; block_name: string; photo_count: number }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const router = useRouter();

  useFocusEffect(useCallback(() => {
    (async () => setDates(await getDateSummaries()))();
  }, []));

  const toggle = async (date: string) => {
    if (expanded === date) { setExpanded(null); return; }
    setExpanded(date);
    setBlocks(await getBlockPhotoCountForDate(date));
  };

  const handleProgress = (current: number, total: number) => {
    setProgress({ phase: current >= total ? 'rendering' : 'reading', current, total });
  };

  const exportPDF = async (block: { block_id: number; block_name: string }, date: string) => {
    const key = `pdf-${block.block_id}-${date}`;
    setBusy(key);
    setProgress({ phase: 'reading', current: 0, total: 0 });
    try {
      const uri = await generatePDF({
        projectName: project?.name ?? 'Obra',
        responsibleEngineer: project?.responsible_engineer ?? undefined,
        blockName: block.block_name,
        blockId: block.block_id,
        date,
        onProgress: handleProgress,
      });
      setProgress(null);
      await shareFile(uri);
    } catch (e) {
      console.error('pdf error', e);
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    } finally { setBusy(null); setProgress(null); }
  };

  const exportZIP = async (block: { block_id: number; block_name: string }, date: string) => {
    const key = `zip-${block.block_id}-${date}`;
    setBusy(key);
    setProgress({ phase: 'reading', current: 0, total: 0 });
    try {
      const uri = await generateZIP({
        projectName: project?.name ?? 'Obra',
        blockName: block.block_name,
        blockId: block.block_id,
        date,
        onProgress: handleProgress,
      });
      setProgress(null);
      await shareFile(uri);
    } catch (e) {
      console.error('zip error', e);
      Alert.alert('Erro', 'Não foi possível gerar o ZIP.');
    } finally { setBusy(null); setProgress(null); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <TouchableOpacity style={styles.configBtn} onPress={() => router.push('/relatorio-config')}>
        <Feather name="settings" size={16} color={c.primary} />
        <Text style={styles.configBtnText}>Configurações do relatório</Text>
        <Feather name="chevron-right" size={16} color={c.mutedForeground} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.configBtn} onPress={() => router.push('/marca-dagua')}>
        <Feather name="droplet" size={16} color={c.primary} />
        <Text style={styles.configBtnText}>Marca d'Água</Text>
        <Feather name="chevron-right" size={16} color={c.mutedForeground} />
      </TouchableOpacity>
      {dates.length === 0 ? (
        <EmptyState icon="file-text" title="Sem relatórios" message="Capture fotos para gerar relatórios em PDF ou exportar em ZIP." />
      ) : (
        <FlatList
          data={dates}
          keyExtractor={(d) => d.date}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View>
              <HierarchyCard
                title={formatDateLong(item.date)}
                subtitle={`${item.photo_count} foto(s)`}
                left={<Feather name="calendar" size={22} color={c.primary} />}
                right={<Feather name={expanded === item.date ? 'chevron-up' : 'chevron-down'} size={20} color={c.mutedForeground} />}
                showChevron={false}
                onPress={() => toggle(item.date)}
              />
              {expanded === item.date && (
                <View style={styles.blockList}>
                  {blocks.map(b => (
                    <View key={b.block_id} style={styles.blockCard}>
                      <View style={styles.blockHeader}>
                        <Text style={styles.blockName}>{b.block_name}</Text>
                        <Text style={styles.blockCount}>{b.photo_count} foto(s)</Text>
                      </View>
                      <View style={styles.exportRow}>
                        <TouchableOpacity
                          style={[styles.exportBtn, styles.pdfBtn]}
                          onPress={() => exportPDF(b, item.date)}
                          disabled={busy !== null}
                        >
                          {busy === `pdf-${b.block_id}-${item.date}` ? <ActivityIndicator color="#fff" size="small" /> : (
                            <>
                              <Feather name="file-text" size={16} color="#fff" />
                              <Text style={styles.exportText}>PDF</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.exportBtn, styles.zipBtn]}
                          onPress={() => exportZIP(b, item.date)}
                          disabled={busy !== null}
                        >
                          {busy === `zip-${b.block_id}-${item.date}` ? <ActivityIndicator color="#fff" size="small" /> : (
                            <>
                              <Feather name="download" size={16} color="#fff" />
                              <Text style={styles.exportText}>ZIP</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        />
      )}
      <ProgressModal
        visible={progress !== null}
        title={busy?.startsWith('zip-') ? 'Gerando ZIP' : 'Gerando PDF'}
        current={progress?.phase === 'reading' ? progress.current : 0}
        total={progress?.phase === 'reading' ? progress.total : 0}
        indeterminateLabel={
          progress?.phase === 'rendering'
            ? (busy?.startsWith('zip-') ? 'Compactando arquivos…' : 'Renderizando PDF…')
            : 'Carregando fotos…'
        }
      />
    </SafeAreaView>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  configBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card, minHeight: 52 },
  configBtnText: { flex: 1, fontSize: 14, color: c.foreground, fontWeight: '500' },
  list: { padding: 16, gap: 10 },
  blockList: { marginTop: 8, gap: 8, paddingLeft: 12 },
  blockCard: { backgroundColor: c.card, borderRadius: colors.radius, padding: 14, borderWidth: 1, borderColor: c.border },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  blockName: { fontSize: 15, fontWeight: '600', color: c.foreground },
  blockCount: { fontSize: 13, color: c.mutedForeground },
  exportRow: { flexDirection: 'row', gap: 10 },
  exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: colors.radius, minHeight: 48 },
  pdfBtn: { backgroundColor: c.primary },
  zipBtn: { backgroundColor: c.accent },
  exportText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
