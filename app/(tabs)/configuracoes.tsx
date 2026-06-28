import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { getAppSchemaVersion } from '@/db/database';

interface ConfigSection {
  label: string;
  items: {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    desc: string;
    route: string;
  }[];
}

const SECTIONS: ConfigSection[] = [
  {
    label: 'Obra',
    items: [
      { icon: 'briefcase', title: 'Dados da obra', desc: 'Nome, endereço, empresa e responsável', route: '/obra' },
    ],
  },
  {
    label: 'Relatório',
    items: [
      { icon: 'file-text', title: 'Configurações do relatório', desc: 'Cores, agrupamento, qualidade e logotipo', route: '/relatorio-config' },
      { icon: 'droplet', title: "Marca d'água", desc: 'Campos exibidos nas fotos e exportações', route: '/marca-dagua' },
    ],
  },
  {
    label: 'Armazenamento',
    items: [
      { icon: 'hard-drive', title: 'Gerenciar armazenamento', desc: 'Uso de espaço e exclusão por data', route: '/armazenamento' },
    ],
  },
  {
    label: 'Estrutura',
    items: [
      { icon: 'grid', title: 'Gerenciar estrutura', desc: 'Quadras, prédios, pavimentos e unidades', route: '/(tabs)/estrutura' },
    ],
  },
];

const appVersion = Constants.expoConfig?.version ?? '—';

export default function ConfiguracoesScreen() {
  const c = colors.light;
  const router = useRouter();
  const [schemaVersion, setSchemaVersion] = useState<number | null>(null);

  useEffect(() => {
    void getAppSchemaVersion().then(setSchemaVersion).catch(() => setSchemaVersion(null));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {SECTIONS.map(section => (
          <View key={section.label}>
            <Text style={styles.sectionLabel}>{section.label}</Text>
            {section.items.map(item => (
              <TouchableOpacity
                key={item.route}
                style={styles.card}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={styles.cardIcon}>
                  <Feather name={item.icon} size={22} color={c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDesc}>{item.desc}</Text>
                </View>
                <Feather name="chevron-right" size={20} color={c.mutedForeground} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Versão {appVersion}</Text>
          {schemaVersion !== null && (
            <Text style={styles.footerSubtext}>Banco de dados v{schemaVersion}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scroll: { padding: 16, paddingBottom: 32 },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: c.mutedForeground, marginBottom: 10,
    marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.card,
    borderRadius: colors.radius, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: c.border,
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: c.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: c.foreground },
  cardDesc: { fontSize: 13, color: c.mutedForeground, marginTop: 2 },
  footer: { alignItems: 'center', marginTop: 32, gap: 4 },
  footerText: { fontSize: 13, color: c.mutedForeground },
  footerSubtext: { fontSize: 11, color: c.mutedForeground, opacity: 0.8 },
});
