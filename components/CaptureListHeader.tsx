import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import colors from '@/constants/colors';
import BreadcrumbBar from '@/components/BreadcrumbBar';

type Props = {
  crumbs: string[];
  showServices: boolean;
  onToggleServices: (value: boolean) => void;
};

export default function CaptureListHeader({ crumbs, showServices, onToggleServices }: Props) {
  const c = colors.light;
  return (
    <View>
      <BreadcrumbBar items={crumbs} />
      <View style={styles.row}>
        <Text style={styles.label}>Mostrar serviços</Text>
        <Switch
          value={showServices}
          onValueChange={onToggleServices}
          trackColor={{ false: c.border, true: c.primary }}
          thumbColor="#fff"
        />
      </View>
    </View>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: c.card,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  label: { fontSize: 14, fontWeight: '600', color: c.foreground },
});
