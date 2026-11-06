import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '@/constants/colors';

export type BreadcrumbItem = {
  label: string;
  onPress?: () => void;
};

function normalize(items: Array<string | BreadcrumbItem>): BreadcrumbItem[] {
  return items
    .map((item) => (typeof item === 'string' ? { label: item } : item))
    .filter((item) => !!item.label);
}

export default function BreadcrumbBar({ items }: { items: Array<string | BreadcrumbItem> }) {
  const visible = normalize(items);
  if (visible.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {visible.map((item, i) => {
          const isCurrent = !item.onPress;
          return (
            <View key={`${item.label}-${i}`} style={styles.itemRow}>
              {i > 0 && <Feather name="chevron-right" size={13} color={colors.light.mutedForeground} style={styles.sep} />}
              {isCurrent ? (
                <Text
                  style={[styles.item, styles.active]}
                  numberOfLines={1}
                  accessibilityRole="text"
                  accessibilityState={{ selected: true }}
                >
                  {item.label}
                </Text>
              ) : (
                <Pressable
                  onPress={item.onPress}
                  hitSlop={8}
                  accessibilityRole="link"
                  accessibilityLabel={`Ir para ${item.label}`}
                >
                  <Text style={styles.item} numberOfLines={1}>{item.label}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
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
