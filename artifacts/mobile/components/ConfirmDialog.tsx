import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '@/constants/colors';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible, title, message, confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar', destructive = false, onConfirm, onCancel,
}: Props) {
  const c = colors.light;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, destructive && styles.destructiveBtn]}
              onPress={onConfirm} activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
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
  message: { fontSize: 14, color: c.mutedForeground, marginTop: 8, lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 20 },
  cancelBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: colors.radius, minHeight: 48, justifyContent: 'center' },
  cancelText: { fontSize: 15, color: c.mutedForeground, fontWeight: '600' },
  confirmBtn: { backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: colors.radius, minHeight: 48, justifyContent: 'center' },
  destructiveBtn: { backgroundColor: c.destructive },
  confirmText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
