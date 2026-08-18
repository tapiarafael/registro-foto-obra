import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, StyleSheet, Switch, Text, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { formatDateLong, todayDateString } from '@/utils/datetime';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function parts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function monthCells(y: number, m: number): (number | null)[] {
  const first = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();
  return [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
}

type Props = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (date: string, showPhotoTimestamp: boolean) => void;
};

export default function CreateReportModal({ visible, onCancel, onConfirm }: Props) {
  const today = todayDateString();
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState(() => parts(today));
  const [showTs, setShowTs] = useState(true);

  useEffect(() => {
    if (!visible) return;
    const t = todayDateString();
    setSelected(t);
    setView(parts(t));
    setShowTs(true);
  }, [visible]);

  const pick = (iso: string) => {
    if (iso > todayDateString()) return;
    setSelected(iso);
    setShowTs(iso === todayDateString());
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(view.y, view.m - 1 + delta, 1);
    const next = { y: d.getFullYear(), m: d.getMonth() + 1, d: 1 };
    const todayP = parts(todayDateString());
    if (next.y > todayP.y || (next.y === todayP.y && next.m > todayP.m)) return;
    setView(next);
  };

  const cells = useMemo(() => monthCells(view.y, view.m), [view.y, view.m]);
  const todayP = parts(today);
  const canNext = view.y < todayP.y || (view.y === todayP.y && view.m < todayP.m);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Criar relatório</Text>
          <Text style={styles.hint}>Escolha a data da visita. Fotos capturadas ou importadas em seguida entram neste relatório.</Text>

          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={8} accessibilityLabel="Mês anterior">
              <Feather name="chevron-left" size={22} color={c.primary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{MONTHS[view.m - 1]} {view.y}</Text>
            <TouchableOpacity
              onPress={() => shiftMonth(1)}
              hitSlop={8}
              disabled={!canNext}
              accessibilityLabel="Próximo mês"
            >
              <Feather name="chevron-right" size={22} color={canNext ? c.primary : c.border} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => <Text key={i} style={styles.weekDay}>{w}</Text>)}
          </View>
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={i} style={styles.cell} />;
              const iso = toIso(view.y, view.m, day);
              const disabled = iso > today;
              const selectedDay = iso === selected;
              const isToday = iso === today;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.cell, selectedDay && styles.cellSelected]}
                  onPress={() => pick(iso)}
                  disabled={disabled}
                  accessibilityLabel={iso}
                >
                  <Text style={[
                    styles.cellText,
                    disabled && styles.cellDisabled,
                    selectedDay && styles.cellTextSelected,
                    isToday && !selectedDay && styles.cellToday,
                  ]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.selected}>{formatDateLong(selected)}</Text>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Mostrar data/hora nas fotos</Text>
              <Text style={styles.switchHint}>Desative se as fotos vierem da galeria e a hora de importação não for a da visita.</Text>
            </View>
            <Switch
              value={showTs}
              onValueChange={setShowTs}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => onConfirm(selected, showTs)}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: c.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 360 },
  title: { fontSize: 17, fontWeight: '700', color: c.foreground },
  hint: { fontSize: 13, color: c.mutedForeground, marginTop: 8, lineHeight: 18 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  monthLabel: { fontSize: 15, fontWeight: '600', color: c.foreground, textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row', marginTop: 10 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: c.mutedForeground },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  cell: { width: '14.28%', height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  cellSelected: { backgroundColor: c.primary },
  cellText: { fontSize: 14, color: c.foreground },
  cellTextSelected: { color: '#fff', fontWeight: '700' },
  cellDisabled: { color: c.border },
  cellToday: { color: c.primary, fontWeight: '700' },
  selected: { fontSize: 13, color: c.primary, fontWeight: '600', marginTop: 8, textTransform: 'capitalize' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: c.foreground },
  switchHint: { fontSize: 12, color: c.mutedForeground, marginTop: 2, lineHeight: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 20 },
  cancelBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: colors.radius, minHeight: 48, justifyContent: 'center' },
  cancelText: { fontSize: 15, color: c.mutedForeground, fontWeight: '600' },
  confirmBtn: { backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: colors.radius, minHeight: 48, justifyContent: 'center' },
  confirmText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
