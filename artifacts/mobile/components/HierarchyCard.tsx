import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '@/constants/colors';

interface Props {
  title: string;
  subtitle?: string;
  badge?: string | number;
  onPress?: () => void;
  onLongPress?: () => void;
  archived?: boolean;
  showChevron?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  photoCount?: number;
}

export default function HierarchyCard({
  title, subtitle, badge, onPress, onLongPress,
  archived = false, showChevron = true, left, right, photoCount,
}: Props) {
  const c = colors.light;
  return (
    <TouchableOpacity
      style={[styles.card, archived && styles.archived]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {left && <View style={styles.leftSlot}>{left}</View>}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, archived && styles.archivedText]} numberOfLines={1}>{title}</Text>
          {badge !== undefined && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {subtitle ? (
          <Text style={[styles.subtitle, archived && styles.archivedSubtext]} numberOfLines={2}>{subtitle}</Text>
        ) : null}
        {photoCount !== undefined && photoCount > 0 ? (
          <View style={styles.photoRow}>
            <Feather name="camera" size={11} color={c.primary} />
            <Text style={styles.photoCount}>{photoCount} {photoCount === 1 ? 'foto' : 'fotos'} hoje</Text>
          </View>
        ) : null}
      </View>
      {right ? (
        <View style={styles.rightSlot}>{right}</View>
      ) : showChevron && onPress ? (
        <Feather name="chevron-right" size={20} color={c.mutedForeground} />
      ) : null}
    </TouchableOpacity>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.card, borderRadius: colors.radius,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
    minHeight: 64,
  },
  archived: { opacity: 0.5 },
  leftSlot: { marginRight: 12 },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: '600', color: c.foreground, flex: 1 },
  archivedText: { color: c.mutedForeground, fontStyle: 'italic' },
  subtitle: { fontSize: 12, color: c.mutedForeground, marginTop: 2 },
  archivedSubtext: { color: c.mutedForeground },
  badge: {
    backgroundColor: c.primary, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  photoCount: { fontSize: 11, color: c.primary, fontWeight: '500' },
  rightSlot: { marginLeft: 8 },
});
