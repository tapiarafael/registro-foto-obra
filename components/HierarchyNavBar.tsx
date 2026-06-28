import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '@/constants/colors';

interface Props {
  onBack: () => void;
  onHome: () => void;
  homeLabel?: string;
}

export default function HierarchyNavBar({ onBack, onHome, homeLabel = 'Início' }: Props) {
  const c = colors.light;
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.btn} onPress={onBack} accessibilityRole="button" accessibilityLabel="Voltar">
        <Feather name="arrow-left" size={18} color={c.primary} />
        <Text style={styles.btnText}>Voltar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={onHome} accessibilityRole="button" accessibilityLabel={homeLabel}>
        <Feather name="home" size={18} color={c.primary} />
        <Text style={styles.btnText}>{homeLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  btnText: { color: c.primary, fontSize: 15, fontWeight: '600' },
});
