import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, BackHandler, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import colors from '@/constants/colors';
import HierarchyCard from '@/components/HierarchyCard';
import EmptyState from '@/components/EmptyState';
import {
  reorderStructureItems,
  sortStructureByName,
  type StructureKind,
} from '@/db/database';

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
  onBatchDelete?: (ids: number[]) => Promise<void>;
  onDuplicate?: (item: T) => void;
  headerNote?: string;
  structureKind?: StructureKind;
  structureScopeId?: number;
  onItemsReordered?: () => void | Promise<void>;
}

export default function CrudList<T extends CrudItem>({
  items, icon = 'box', emptyTitle, emptyMessage, addLabel,
  subtitleFor, onPressItem, onCreate, onRename, onDelete, onBatchDelete,
  onDuplicate, headerNote, structureKind, structureScopeId, onItemsReordered,
}: Props<T>) {
  const c = colors.light;
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [listData, setListData] = useState(items);

  useEffect(() => {
    setListData(items);
  }, [items]);

  const canReorder = editMode && structureKind != null && structureScopeId != null;
  const canBatchDelete = editMode && !!onBatchDelete;

  const exitEditMode = useCallback(() => {
    setEditMode(false);
    setSelectedIds(new Set());
    setListData(items);
  }, [items]);

  useEffect(() => {
    if (!editMode) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      exitEditMode();
      return true;
    });
    return () => sub.remove();
  }, [editMode, exitEditMode]);

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

  const runDelete = async (item: T) => {
    if (deleteBusy) return;
    setDeleteBusy(true);
    try {
      await onDelete(item);
    } catch (e) {
      Alert.alert('Não foi possível excluir', e instanceof Error ? e.message : 'Erro desconhecido.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const confirmDelete = (item: T) => {
    Alert.alert('Excluir', `Excluir "${item.name}"? Itens com fotos não podem ser excluídos. Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => { void runDelete(item); } },
    ]);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmBatchDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || !onBatchDelete) return;
    const label = ids.length === 1 ? '1 item' : `${ids.length} itens`;
    Alert.alert(
      'Excluir selecionados',
      `Excluir ${label}? Itens com fotos não podem ser excluídos. Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleteBusy(true);
              try {
                await onBatchDelete(ids);
                exitEditMode();
              } catch (e) {
                Alert.alert('Não foi possível excluir', e instanceof Error ? e.message : 'Erro desconhecido.');
              } finally {
                setDeleteBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  const enterEditMode = () => {
    setListData(items);
    setSelectedIds(new Set());
    setEditMode(true);
  };

  const handleSortByName = () => {
    if (!structureKind || structureScopeId == null) return;
    Alert.alert('Ordenar por nome', 'Reordenar a lista alfabeticamente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Ordenar',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await sortStructureByName(structureKind, structureScopeId);
              await onItemsReordered?.();
              exitEditMode();
            } catch (e) {
              Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível ordenar.');
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  };

  const persistReorder = async (ordered: T[]) => {
    if (!structureKind || structureScopeId == null) return;
    try {
      await reorderStructureItems(structureKind, structureScopeId, ordered.map(i => i.id));
      await onItemsReordered?.();
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível salvar a ordem.');
      setListData(items);
    }
  };

  const renderRow = (item: T, drag?: () => void, isActive?: boolean) => (
    <ScaleDecorator>
      <View style={[styles.row, isActive && styles.rowDragging]}>
        {editMode ? (
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => toggleSelect(item.id)}
            hitSlop={8}
          >
            <Feather
              name={selectedIds.has(item.id) ? 'check-square' : 'square'}
              size={22}
              color={selectedIds.has(item.id) ? c.primary : c.mutedForeground}
            />
          </TouchableOpacity>
        ) : null}
        {canReorder && drag ? (
          <TouchableOpacity style={styles.dragHandle} onLongPress={drag} delayLongPress={0} hitSlop={8}>
            <Feather name="menu" size={20} color={c.mutedForeground} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.rowCard}>
          <HierarchyCard
            title={item.name}
            subtitle={subtitleFor?.(item)}
            left={<Feather name={icon} size={20} color={c.primary} />}
            showChevron={!!onPressItem && !editMode}
            onPress={
              editMode
                ? () => toggleSelect(item.id)
                : onPressItem
                  ? () => onPressItem(item)
                  : undefined
            }
            onLongPress={!editMode ? enterEditMode : undefined}
            right={
              editMode ? undefined : (
                <View style={styles.actions}>
                  {onDuplicate && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => onDuplicate(item)} hitSlop={8}>
                      <Feather name="copy" size={18} color={c.mutedForeground} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)} hitSlop={8}>
                    <Feather name="edit-2" size={18} color={c.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => confirmDelete(item)}
                    hitSlop={8}
                    disabled={deleteBusy}
                  >
                    <Feather name="trash-2" size={18} color={c.destructive} />
                  </TouchableOpacity>
                </View>
              )
            }
          />
        </View>
      </View>
    </ScaleDecorator>
  );

  const renderDraggableItem = ({ item, drag, isActive }: RenderItemParams<T>) =>
    renderRow(item, drag, isActive);

  const noteText = editMode
    ? 'Selecione itens ou arraste para reordenar. Toque em Cancelar para sair.'
    : headerNote
      ? `${headerNote} Segure um item para selecionar ou reordenar.`
      : 'Segure um item para selecionar ou reordenar.';

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {noteText ? <Text style={styles.note}>{noteText}</Text> : null}

        {editMode ? (
          <View style={styles.editToolbar}>
            <TouchableOpacity style={styles.toolbarBtn} onPress={exitEditMode}>
              <Text style={styles.toolbarCancel}>Cancelar</Text>
            </TouchableOpacity>
            {canReorder ? (
              <TouchableOpacity style={styles.toolbarBtn} onPress={handleSortByName} disabled={busy}>
                <Text style={styles.toolbarAction}>Ordenar por nome</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {items.length === 0 ? (
          <EmptyState icon={icon} title={emptyTitle} message={emptyMessage} actionLabel={addLabel} onAction={openCreate} />
        ) : canReorder ? (
          <DraggableFlatList
            data={listData}
            keyExtractor={(i) => String(i.id)}
            contentContainerStyle={styles.list}
            onDragEnd={({ data }) => {
              setListData(data);
              void persistReorder(data);
            }}
            renderItem={renderDraggableItem}
          />
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(i) => String(i.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => renderRow(item)}
          />
        )}

        {items.length > 0 && !editMode && (
          <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
            <Feather name="plus" size={26} color="#fff" />
          </TouchableOpacity>
        )}

        {editMode && canBatchDelete ? (
          <View style={styles.batchBar}>
            <TouchableOpacity
              style={[styles.batchDeleteBtn, selectedIds.size === 0 && styles.disabled]}
              onPress={confirmBatchDelete}
              disabled={selectedIds.size === 0 || deleteBusy}
            >
              <Feather name="trash-2" size={18} color="#fff" />
              <Text style={styles.batchDeleteText}>
                Excluir{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

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
    </GestureHandlerRootView>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: c.background },
  note: { fontSize: 13, color: c.mutedForeground, padding: 16, paddingBottom: 0, lineHeight: 18 },
  editToolbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
  },
  toolbarBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  toolbarCancel: { fontSize: 15, color: c.mutedForeground, fontWeight: '600' },
  toolbarAction: { fontSize: 15, color: c.primary, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 120 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  rowDragging: { opacity: 0.92 },
  rowCard: { flex: 1 },
  checkbox: { marginRight: 8, padding: 4 },
  dragHandle: { marginRight: 4, padding: 8 },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  batchBar: {
    position: 'absolute', left: 16, right: 16, bottom: 24,
    flexDirection: 'row', justifyContent: 'center',
  },
  batchDeleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: c.destructive, paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: 28, elevation: 4,
  },
  batchDeleteText: { fontSize: 15, color: '#fff', fontWeight: '600' },
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
