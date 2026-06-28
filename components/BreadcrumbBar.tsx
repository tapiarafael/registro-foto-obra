import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '@/constants/colors';

export default function BreadcrumbBar({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {items.map((item, i) => (
          <View key={i} style={styles.itemRow}>
            {i > 0 && <Feather name="chevron-right" size={13} color={colors.light.mutedForeground} style={styles.sep} />}
            <Text style={[styles.item, i === items.length - 1 && styles.active]} numberOfLines={1}>{item}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  wrap: { backgroundColor: c.secondary, borderBottomWidth: 1, borderBottomColor: c.border },
  content: { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  sep: { marginHorizontal: 4 },
  item: { fontSize: 12, color: c.mutedForeground, maxWidth: 140 },
  active: { color: c.primary, fontWeight: '600' },
});
