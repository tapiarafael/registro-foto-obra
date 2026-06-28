import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { formatDateTime } from '@/services/photoService';

export default function RegistrarScreen() {
  const router = useRouter();
  const { project, activeSession, todayPhotoCount, beginSession, resetCaptureNav, refreshDashboard } = useApp();
  const [busy, setBusy] = useState(false);
  const isFirstFocus = useRef(true);

  useFocusEffect(useCallback(() => {
    if (isFirstFocus.current) {
      isFirstFocus.current = false;
      return;
    }
    void refreshDashboard();
  }, [refreshDashboard]));

  const onStart = async () => {
    if (busy) return;
    setBusy(true);
    try {
      resetCaptureNav();
      const session = await beginSession();
      if (session) router.push('/registrar/quadras');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Feather name="camera" size={32} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>{project?.name ?? 'Obra'}</Text>
          {project?.address ? <Text style={styles.heroSubtitle}>{project.address}</Text> : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{todayPhotoCount}</Text>
            <Text style={styles.statLabel}>Fotos hoje</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeSession ? 'Ativa' : '—'}</Text>
            <Text style={styles.statLabel}>Vistoria</Text>
          </View>
        </View>

        {activeSession ? (
          <View style={styles.sessionBanner}>
            <Feather name="check-circle" size={18} color={c.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionTitle}>Vistoria em andamento</Text>
              <Text style={styles.sessionTime}>Iniciada em {formatDateTime(activeSession.started_at)}</Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity style={styles.primaryBtn} onPress={onStart} activeOpacity={0.85} disabled={busy}>
          <Feather name={activeSession ? 'arrow-right-circle' : 'play-circle'} size={22} color="#fff" />
          <Text style={styles.primaryBtnText}>
            {activeSession ? 'Continuar Registro' : 'Iniciar Registro'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Acesso rápido</Text>
        <View style={styles.quickGrid}>
          <QuickAction icon="clock" label="Histórico" onPress={() => router.push('/(tabs)/historico')} />
          <QuickAction icon="file-text" label="Relatórios" onPress={() => router.push('/(tabs)/relatorios')} />
          <QuickAction icon="grid" label="Estrutura" onPress={() => router.push('/(tabs)/estrutura')} />
          <QuickAction icon="hard-drive" label="Armazenamento" onPress={() => router.push('/armazenamento')} />
        </View>

        <TouchableOpacity style={styles.obraLink} onPress={() => router.push('/obra')} activeOpacity={0.7}>
          <Feather name="settings" size={16} color={c.mutedForeground} />
          <Text style={styles.obraLinkText}>Editar dados da obra</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.quickIcon}>
        <Feather name={icon} size={22} color={c.primary} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scroll: { padding: 16 },
  hero: { alignItems: 'center', paddingVertical: 20 },
  heroIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: c.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroTitle: { fontSize: 22, fontWeight: '700', color: c.foreground, textAlign: 'center' },
  heroSubtitle: { fontSize: 14, color: c.mutedForeground, marginTop: 4, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: c.card, borderRadius: colors.radius, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: c.border,
  },
  statValue: { fontSize: 26, fontWeight: '700', color: c.primary },
  statLabel: { fontSize: 12, color: c.mutedForeground, marginTop: 2 },
  sessionBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#E8F5E9',
    borderRadius: colors.radius, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#C8E6C9',
  },
  sessionTitle: { fontSize: 14, fontWeight: '600', color: c.success },
  sessionTime: { fontSize: 12, color: c.mutedForeground, marginTop: 1 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: c.primary, borderRadius: colors.radius, paddingVertical: 18, marginBottom: 24,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: c.mutedForeground, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickCard: {
    width: '47%', flexGrow: 1, backgroundColor: c.card, borderRadius: colors.radius, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: c.border, minHeight: 96, justifyContent: 'center',
  },
  quickIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: c.secondary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  quickLabel: { fontSize: 13, fontWeight: '600', color: c.foreground },
  obraLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24, paddingVertical: 12 },
  obraLinkText: { fontSize: 13, color: c.mutedForeground },
});
