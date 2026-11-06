import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';

export default function EstruturaScreen() {
  const c = colors.light;
  const router = useRouter();

  const sections: { icon: keyof typeof Feather.glyphMap; title: string; desc: string; route: string }[] = [
    { icon: 'grid', title: 'Quadras', desc: 'Gerenciar quadras da obra', route: '/estrutura/quadras' },
    { icon: 'tool', title: 'Serviços', desc: 'Gerenciar lista de serviços', route: '/estrutura/servicos' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.genCard} onPress={() => router.push('/estrutura/gerador')} activeOpacity={0.85}>
          <View style={styles.genIcon}>
            <Feather name="zap" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.genTitle}>Gerador em massa</Text>
            <Text style={styles.genDesc}>Crie pavimentos e unidades automaticamente</Text>
          </View>
          <Feather name="chevron-right" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Gerenciar estrutura</Text>
        {sections.map(s => (
          <TouchableOpacity key={s.route} style={styles.card} onPress={() => router.push(s.route as any)} activeOpacity={0.7}>
            <View style={styles.cardIcon}>
              <Feather name={s.icon} size={22} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{s.title}</Text>
              <Text style={styles.cardDesc}>{s.desc}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={c.mutedForeground} />
          </TouchableOpacity>
        ))}

        <Text style={styles.hint}>
          Navegue pelas quadras para gerenciar prédios, pavimentos e unidades de cada nível.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scroll: { padding: 16 },
  genCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.accent,
    borderRadius: 12, padding: 18, marginBottom: 24,
  },
  genIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  genTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  genDesc: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: c.mutedForeground, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.card,
    borderRadius: colors.radius, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: c.border,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.secondary, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: c.foreground },
  cardDesc: { fontSize: 13, color: c.mutedForeground, marginTop: 2 },
  hint: { fontSize: 13, color: c.mutedForeground, marginTop: 16, lineHeight: 19, textAlign: 'center' },
});
