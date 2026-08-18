import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '@/constants/colors';
import BreadcrumbBar from '@/components/BreadcrumbBar';
import { useApp } from '@/context/AppContext';
import { formatDateLong, todayDateString } from '@/utils/datetime';

export function CaptureDateBanner() {
  const { captureNav } = useApp();
  const date = captureNav.captureDate;
  if (!date || date === todayDateString()) return null;
  return (
    <View style={styles.banner}>
      <Feather name="calendar" size={16} color={colors.light.primary} />
      <Text style={styles.bannerText}>Relatório de {formatDateLong(date)}</Text>
    </View>
  );
}

type Props = {
  crumbs: string[];
  showServices: boolean;
  onToggleServices: (value: boolean) => void;
};

export default function CaptureListHeader({ crumbs, showServices, onToggleServices }: Props) {
  const c = colors.light;
  return (
    <View>
      <CaptureDateBanner />
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
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: c.secondary, paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  bannerText: { fontSize: 13, fontWeight: '600', color: c.primary, textTransform: 'capitalize', flex: 1 },
});
