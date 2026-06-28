import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import colors from '@/constants/colors';

interface Props {
  visible: boolean;
  title: string;
  // When total is provided and > 0, a determinate bar is shown.
  // Otherwise an indeterminate spinner is shown.
  current?: number;
  total?: number;
  indeterminateLabel?: string;
  detailUnit?: string;
}

export default function ProgressModal({
  visible, title, current = 0, total = 0, indeterminateLabel, detailUnit = 'fotos',
}: Props) {
  const isDeterminate = total > 0;
  const pct = isDeterminate ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          {isDeterminate ? (
            <>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.detail}>{current} de {total} {detailUnit} · {pct}%</Text>
            </>
          ) : (
            <View style={styles.indeterminate}>
              <ActivityIndicator size="small" color={c.primary} />
              {indeterminateLabel ? <Text style={styles.detail}>{indeterminateLabel}</Text> : null}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: c.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 360 },
  title: { fontSize: 17, fontWeight: '700', color: c.foreground, marginBottom: 16 },
  track: { height: 10, borderRadius: 5, backgroundColor: c.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5, backgroundColor: c.primary },
  detail: { fontSize: 13, color: c.mutedForeground, marginTop: 10, textAlign: 'center' },
  indeterminate: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
