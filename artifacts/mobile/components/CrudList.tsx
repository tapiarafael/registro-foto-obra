import React, { useState } from 'react';
import {
  Alert, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import HierarchyCard from '@/components/HierarchyCard';
import EmptyState from '@/components/EmptyState';

export interface CrudItem {
  id: number;
  name: string;
}

interface Props<T extends CrudItem> {
  items: T[];
  icon?: keyof typeof Feather.glyphMap;
  emptyTitle: string;
  emptyMessage?: string;
  addLabel: string;
  subtitleFor?: (item: T) => string | undefined;
  onPressItem?: (item: T) => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (item: T, name: string) => Promise<void>;
  onDelete: (item: T) => Promise<void>;
  headerNote?: string;
}

export default function CrudList<T extends CrudItem>({
  items, icon = 'box', emptyTitle, emptyMessage, addLabel,
  subtitleFor, onPressItem, onCreate, onRename, onDelete, headerNote,
}: Props<T>) {
  const c = colors.light;
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const openCreate = () => { setEditing(null); setText(''); setModalVisible(true); };
  const openEdit = (item: T) => { setEditing(item); setText(item.name); setModalVisible(true); };

  const save = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      if (editing) await onRename(editing, t);
      else await onCreate(t);
      setModalVisible(false);
    } finally { setBusy(false); }
  };

  const confirmDelete = (item: T) => {
    Alert.alert('Excluir', `Excluir "${item.name}"? Itens com fotos não podem ser excluídos. Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => onDelete(item) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {headerNote ? <Text style={styles.note}>{headerNote}</Text> : null}
      {items.length === 0 ? (
        <EmptyState icon={icon} title={emptyTitle} message={emptyMessage} actionLabel={addLabel} onAction={openCreate} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <HierarchyCard
              title={item.name}
              subtitle={subtitleFor?.(item)}
              left={<Feather name={icon} size={20} color={c.primary} />}
              showChevron={!!onPressItem}
              onPress={onPressItem ? () => onPressItem(item) : undefined}
              right={
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)} hitSlop={8}>
                    <Feather name="edit-2" size={18} color={c.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDelete(item)} hitSlop={8}>
                    <Feather name="trash-2" size={18} color={c.destructive} />
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        />
      )}

      {items.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
          <Feather name="plus" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editing ? 'Renomear' : addLabel}</Text>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Nome"
              placeholderTextColor={c.mutedForeground}
              autoFocus
              onSubmitEditing={save}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, !text.trim() && styles.disabled]} onPress={save} disabled={!text.trim() || busy}>
                <Text style={styles.saveText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  note: { fontSize: 13, color: c.mutedForeground, padding: 16, paddingBottom: 0, lineHeight: 18 },
  list: { padding: 16, gap: 10, paddingBottom: 100 },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: c.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 380 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: c.foreground, marginBottom: 16 },
  input: {
    backgroundColor: c.background, borderWidth: 1, borderColor: c.border, borderRadius: colors.radius,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.foreground, minHeight: 48,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 20 },
  cancelBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: colors.radius, minHeight: 48, justifyContent: 'center' },
  cancelText: { fontSize: 15, color: c.mutedForeground, fontWeight: '600' },
  saveBtn: { backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: colors.radius, minHeight: 48, justifyContent: 'center' },
  saveText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  disabled: { opacity: 0.4 },
});
