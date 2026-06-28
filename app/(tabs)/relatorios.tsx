import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import {
  getDateSummaries, getBlockPhotoCountForDate,
  type DateSummary,
} from '@/db/database';
import { getOrGeneratePDF, getOrGenerateZIP, isReportCacheReady, shareFile } from '@/services/reportService';
import { formatDateLong } from '@/services/photoService';
import HierarchyCard from '@/components/HierarchyCard';
import EmptyState from '@/components/EmptyState';
import ProgressModal from '@/components/ProgressModal';

const ZIP_PHOTO_WARN_THRESHOLD = 50;

type PdfProgress = { kind: 'pdf'; phase: 'reading' | 'rendering'; current: number; total: number };
type ZipProgress = { kind: 'zip'; phase: 'photos' | 'finalizing' | 'compressing'; current: number; total: number };
type Progress = PdfProgress | ZipProgress;

function zipPhaseFromProgress(current: number, total: number): ZipProgress['phase'] {
  const photoCount = Math.max(0, total - 3);
  if (current >= total) return 'compressing';
  if (current <= photoCount) return 'photos';
  return 'finalizing';
}

function zipPhaseLabel(phase: ZipProgress['phase']): string {
  if (phase === 'photos') return 'Adicionando fotos ao ZIP…';
  if (phase === 'finalizing') return 'Incluindo índice e PDF…';
  return 'Compactando arquivos…';
}

export default function RelatoriosScreen() {
  const c = colors.light;
  const { project } = useApp();
  const [dates, setDates] = useState<DateSummary[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<{ block_id: number; block_name: string; photo_count: number; cacheReady?: boolean }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  const loadBlocksForDate = useCallback(async (date: string) => {
    const blockRows = await getBlockPhotoCountForDate(date);
    const withCache = await Promise.all(blockRows.map(async (b) => {
      const { ready } = await isReportCacheReady(b.block_id, date, 'pdf');
      return { ...b, cacheReady: ready };
    }));
    setBlocks(withCache);
  }, []);

  const refresh = useCallback(async () => {
    setDates(await getDateSummaries());
    if (expanded) await loadBlocksForDate(expanded);
  }, [expanded, loadBlocksForDate]);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  const toggle = async (date: string) => {
    if (expanded === date) { setExpanded(null); return; }
    setExpanded(date);
    await loadBlocksForDate(date);
  };

  const handlePdfProgress = (current: number, total: number) => {
    setProgress({
      kind: 'pdf',
      phase: current >= total ? 'rendering' : 'reading',
      current,
      total,
    });
  };

  const handleZipProgress = (current: number, total: number) => {
    setProgress({
      kind: 'zip',
      phase: zipPhaseFromProgress(current, total),
      current,
      total,
    });
  };

  const pdfErrorMessage = (e: unknown): string => {
    const msg = e instanceof Error ? e.message : String(e);
    if (/OutOfMemory|OOM|memory/i.test(msg)) {
      return 'Memória insuficiente para gerar o PDF. Tente qualidade Média ou Rápida nas configurações do relatório.';
    }
    return 'Não foi possível gerar o PDF.';
  };

  const zipErrorMessage = (e: unknown): string => {
    const msg = e instanceof Error ? e.message : String(e);
    if (/OutOfMemory|OOM|memory/i.test(msg)) {
      return 'Memória insuficiente para gerar o ZIP. Feche outros apps e tente novamente. Se persistir, exporte datas com menos fotos.';
    }
    return 'Não foi possível gerar o ZIP.';
  };

  const confirmLargeZip = (photoCount: number): Promise<boolean> =>
    new Promise((resolve) => {
      if (photoCount <= ZIP_PHOTO_WARN_THRESHOLD) {
        resolve(true);
        return;
      }
      Alert.alert(
        'Exportação grande',
        `Este relatório tem ${photoCount} fotos em resolução total. A exportação pode demorar e usar muita memória. Deseja continuar?`,
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Continuar', onPress: () => resolve(true) },
        ],
      );
    });

  const exportPDF = async (block: { block_id: number; block_name: string }, date: string) => {
    const key = `pdf-${block.block_id}-${date}`;
    setBusy(key);
    try {
      const { ready } = await isReportCacheReady(block.block_id, date, 'pdf');
      if (!ready) setProgress({ kind: 'pdf', phase: 'reading', current: 0, total: 0 });
      const { uri } = await getOrGeneratePDF({
        projectName: project?.name ?? 'Obra',
        responsibleEngineer: project?.responsible_engineer ?? undefined,
        blockName: block.block_name,
        blockId: block.block_id,
        date,
        onProgress: ready ? undefined : handlePdfProgress,
      });
      if (!ready) setProgress(null);
      await shareFile(uri);
      if (expanded === date) {
        setBlocks(prev => prev.map(b => b.block_id === block.block_id ? { ...b, cacheReady: true } : b));
      }
    } catch (e) {
      console.error('pdf error', e);
      Alert.alert('Erro', pdfErrorMessage(e));
    } finally { setBusy(null); setProgress(null); }
  };

  const doExportZIP = async (block: { block_id: number; block_name: string }, date: string) => {
    const key = `zip-${block.block_id}-${date}`;
    setBusy(key);
    try {
      const needsProgress = !(await isReportCacheReady(block.block_id, date, 'zip')).ready;
      if (needsProgress) setProgress({ kind: 'zip', phase: 'photos', current: 0, total: 0 });
      const { uri } = await getOrGenerateZIP({
        projectName: project?.name ?? 'Obra',
        responsibleEngineer: project?.responsible_engineer ?? undefined,
        blockName: block.block_name,
        blockId: block.block_id,
        date,
        onProgress: needsProgress ? handleZipProgress : undefined,
      });
      if (needsProgress) setProgress(null);
      await shareFile(uri);
      if (expanded === date) {
        setBlocks(prev => prev.map(b => b.block_id === block.block_id ? { ...b, cacheReady: true } : b));
      }
    } catch (e) {
      console.error('zip error', e);
      Alert.alert('Erro', zipErrorMessage(e));
    } finally { setBusy(null); setProgress(null); }
  };

  const exportZIP = async (block: { block_id: number; block_name: string; photo_count: number }, date: string) => {
    const ok = await confirmLargeZip(block.photo_count);
    if (!ok) return;
    await doExportZIP(block, date);
  };

  const isZipBusy = busy?.startsWith('zip-');
  const progressIsDeterminate = progress !== null && (
    progress.kind === 'pdf'
      ? progress.phase === 'reading'
      : progress.phase === 'photos' || progress.phase === 'finalizing'
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
                        <View style={{ flex: 1 }}>
                          <Text style={styles.blockName}>{b.block_name}</Text>
                          {b.cacheReady && <Text style={styles.cacheReady}>Relatório pronto</Text>}
                        </View>
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
        title={isZipBusy ? 'Gerando ZIP' : 'Gerando PDF'}
        current={progressIsDeterminate ? progress!.current : 0}
        total={progressIsDeterminate ? progress!.total : 0}
        phaseLabel={
          progressIsDeterminate && progress?.kind === 'zip'
            ? zipPhaseLabel(progress.phase)
            : undefined
        }
        indeterminateLabel={
          progress?.kind === 'zip' && progress.phase === 'compressing'
            ? 'Compactando arquivos…'
            : progress?.kind === 'pdf' && progress.phase === 'rendering'
              ? 'Montando PDF…'
              : progress?.kind === 'pdf'
                ? 'Carregando fotos…'
                : undefined
        }
      />
    </SafeAreaView>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  list: { padding: 16, gap: 10 },
  blockList: { marginTop: 8, gap: 8, paddingLeft: 12 },
  blockCard: { backgroundColor: c.card, borderRadius: colors.radius, padding: 14, borderWidth: 1, borderColor: c.border },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  blockName: { fontSize: 15, fontWeight: '600', color: c.foreground },
  cacheReady: { fontSize: 12, color: c.primary, marginTop: 2 },
  blockCount: { fontSize: 13, color: c.mutedForeground },
  exportRow: { flexDirection: 'row', gap: 10 },
  exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: colors.radius, minHeight: 48 },
  pdfBtn: { backgroundColor: c.primary },
  zipBtn: { backgroundColor: c.accent },
  exportText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
