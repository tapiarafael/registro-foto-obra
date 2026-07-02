import React from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import colors from '@/constants/colors';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  name: string;
  onChangeName: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
  statsText?: string | null;
};

export default function CloneNameModal({
  visible, title, subtitle, name, onChangeName, onConfirm, onCancel, busy, statsText,
}: Props) {
  const c = colors.light;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modal}>
          <Text style={[s.title, !subtitle && s.titleNoSub]}>{title}</Text>
          {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
          <TextInput
            style={s.input}
            value={name}
            onChangeText={onChangeName}
            placeholder="Nome da cópia"
            placeholderTextColor={c.mutedForeground}
            autoFocus
            onSubmitEditing={onConfirm}
          />
          {statsText !== undefined && (
            statsText === null
              ? <ActivityIndicator size="small" style={{ marginTop: 8 }} />
              : <Text style={s.stats}>{statsText}</Text>
          )}
          <View style={s.actions}>
            <TouchableOpacity style={s.cancel} onPress={onCancel} disabled={busy}>
              <Text style={s.cancelTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirm, (!name.trim() || busy) && s.disabled]}
              onPress={onConfirm}
              disabled={!name.trim() || busy}
            >
              {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmTxt}>Duplicar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const c = colors.light;
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: c.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 380 },
  title: { fontSize: 17, fontWeight: '700', color: c.foreground, marginBottom: 6 },
  titleNoSub: { marginBottom: 16 },
  sub: { fontSize: 13, color: c.mutedForeground, marginBottom: 14, lineHeight: 18 },
  input: { backgroundColor: c.background, borderWidth: 1, borderColor: c.border, borderRadius: colors.radius, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.foreground, minHeight: 48 },
  stats: { fontSize: 12, color: c.mutedForeground, marginTop: 8, fontStyle: 'italic' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 20 },
  cancel: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: colors.radius, minHeight: 48, justifyContent: 'center' },
  cancelTxt: { fontSize: 15, color: c.mutedForeground, fontWeight: '600' },
  confirm: { backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: colors.radius, minHeight: 48, justifyContent: 'center' },
  confirmTxt: { fontSize: 15, color: '#fff', fontWeight: '600' },
  disabled: { opacity: 0.4 },
});
