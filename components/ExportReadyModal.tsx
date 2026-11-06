import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '@/constants/colors';

type Props = {
  visible: boolean;
  kind: 'pdf' | 'zip';
  onShare: () => void;
  onOpen: () => void;
  onClose: () => void;
};

export default function ExportReadyModal({ visible, kind, onShare, onOpen, onClose }: Props) {
  const title = kind === 'pdf' ? 'PDF pronto' : 'ZIP pronto';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>Compartilhe o arquivo ou abra-o neste dispositivo para conferir.</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={onShare} activeOpacity={0.8}>
              <Feather name="share-2" size={16} color="#fff" />
              <Text style={styles.primaryText}>Compartilhar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={onOpen} activeOpacity={0.8}>
              <Feather name="external-link" size={16} color={c.primary} />
              <Text style={styles.outlineText}>Abrir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeText}>Fechar</Text>
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
  actions: { marginTop: 20, gap: 8 },
  primaryBtn: {
    backgroundColor: c.primary, minHeight: 48, borderRadius: colors.radius,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  outlineBtn: {
    minHeight: 48, borderRadius: colors.radius, borderWidth: 1, borderColor: c.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  outlineText: { fontSize: 15, color: c.primary, fontWeight: '600' },
  closeBtn: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 15, color: c.mutedForeground, fontWeight: '600' },
});
