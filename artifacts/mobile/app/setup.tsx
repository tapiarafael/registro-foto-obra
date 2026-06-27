import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { createBlock, createBuilding, createProject, createService } from '@/db/database';
import { ensureDirectories } from '@/services/photoService';

const DEFAULT_SERVICES = ['Alvenaria', 'Hidráulica', 'Elétrica', 'Pintura', 'Revestimento', 'Acabamento'];

export default function SetupScreen() {
  const c = colors.light;
  const router = useRouter();
  const { loadProject } = useApp();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [company, setCompany] = useState('');
  const [engineer, setEngineer] = useState('');
  const [firstQuadra, setFirstQuadra] = useState('Quadra A');
  const [firstPredio, setFirstPredio] = useState('Prédio 01');
  const [services, setServices] = useState<string[]>(DEFAULT_SERVICES);
  const [newService, setNewService] = useState('');

  const canProceed = step === 0 ? name.trim().length > 0 : step === 1 ? firstQuadra.trim().length > 0 && firstPredio.trim().length > 0 : true;

  const toggleService = (s: string) => {
    setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };
  const addCustomService = () => {
    const t = newService.trim();
    if (t && !services.includes(t)) setServices([...services, t]);
    setNewService('');
  };

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await ensureDirectories();
      const projectId = await createProject({
        name: name.trim(),
        address: address.trim() || undefined,
        company: company.trim() || undefined,
        responsible_engineer: engineer.trim() || undefined,
      });
      const blockId = await createBlock(projectId, firstQuadra.trim());
      await createBuilding(blockId, firstPredio.trim());
      for (const s of services) await createService(projectId, s);
      await loadProject();
      router.replace('/(tabs)');
    } catch (e) {
      console.error('setup error', e);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logo}><Feather name="home" size={28} color="#fff" /></View>
            <Text style={styles.appTitle}>Registro Fotográfico de Obra</Text>
            <Text style={styles.appSubtitle}>Configuração inicial</Text>
          </View>

          <View style={styles.steps}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.stepDot, i <= step && styles.stepDotActive]} />
            ))}
          </View>

          {step === 0 && (
            <View style={styles.card}>
              <Text style={styles.stepTitle}>Dados da Obra</Text>
              <Field label="Nome da obra *" value={name} onChangeText={setName} placeholder="Ex.: Residencial Jardins" />
              <Field label="Endereço" value={address} onChangeText={setAddress} placeholder="Rua, número, cidade" />
              <Field label="Construtora" value={company} onChangeText={setCompany} placeholder="Nome da empresa" />
              <Field label="Engenheiro responsável" value={engineer} onChangeText={setEngineer} placeholder="Nome do responsável" />
            </View>
          )}

          {step === 1 && (
            <View style={styles.card}>
              <Text style={styles.stepTitle}>Primeira Estrutura</Text>
              <Text style={styles.stepHint}>Crie a primeira quadra e prédio. Você poderá adicionar mais na aba Estrutura.</Text>
              <Field label="Primeira quadra *" value={firstQuadra} onChangeText={setFirstQuadra} placeholder="Ex.: Quadra A" />
              <Field label="Primeiro prédio *" value={firstPredio} onChangeText={setFirstPredio} placeholder="Ex.: Prédio 01" />
            </View>
          )}

          {step === 2 && (
            <View style={styles.card}>
              <Text style={styles.stepTitle}>Serviços</Text>
              <Text style={styles.stepHint}>Selecione os serviços que serão fotografados.</Text>
              <View style={styles.chips}>
                {Array.from(new Set([...DEFAULT_SERVICES, ...services])).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, services.includes(s) && styles.chipActive]}
                    onPress={() => toggleService(s)}
                  >
                    <Text style={[styles.chipText, services.includes(s) && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
                  value={newService}
                  onChangeText={setNewService}
                  placeholder="Adicionar serviço"
                  placeholderTextColor={c.mutedForeground}
                  onSubmitEditing={addCustomService}
                />
                <TouchableOpacity style={styles.addBtn} onPress={addCustomService}>
                  <Feather name="plus" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.actions}>
            {step > 0 && (
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)} disabled={busy}>
                <Text style={styles.backText}>Voltar</Text>
              </TouchableOpacity>
            )}
            {step < 2 ? (
              <TouchableOpacity
                style={[styles.nextBtn, !canProceed && styles.disabled]}
                onPress={() => canProceed && setStep(step + 1)}
                disabled={!canProceed}
              >
                <Text style={styles.nextText}>Continuar</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.nextBtn, (services.length === 0 || busy) && styles.disabled]}
                onPress={finish}
                disabled={services.length === 0 || busy}
              >
                {busy ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={styles.nextText}>Concluir</Text>
                    <Feather name="check" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  const c = colors.light;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={c.mutedForeground} {...props} />
    </View>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scroll: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 20, marginTop: 12 },
  logo: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  appTitle: { fontSize: 20, fontWeight: '700', color: c.foreground, textAlign: 'center' },
  appSubtitle: { fontSize: 14, color: c.mutedForeground, marginTop: 4 },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  stepDot: { width: 32, height: 4, borderRadius: 2, backgroundColor: c.border },
  stepDotActive: { backgroundColor: c.primary },
  card: { backgroundColor: c.card, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: c.border },
  stepTitle: { fontSize: 18, fontWeight: '700', color: c.foreground, marginBottom: 4 },
  stepHint: { fontSize: 13, color: c.mutedForeground, marginBottom: 16, lineHeight: 18 },
  field: { marginTop: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: c.foreground, marginBottom: 6 },
  input: {
    backgroundColor: c.background, borderWidth: 1, borderColor: c.border, borderRadius: colors.radius,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.foreground, minHeight: 48,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.background },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontSize: 13, color: c.foreground, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  addRow: { flexDirection: 'row', gap: 8 },
  addInput: {
    flex: 1, backgroundColor: c.background, borderWidth: 1, borderColor: c.border, borderRadius: colors.radius,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.foreground, minHeight: 48,
  },
  addBtn: { width: 48, height: 48, borderRadius: colors.radius, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: colors.radius, justifyContent: 'center', minHeight: 52, borderWidth: 1, borderColor: c.border },
  backText: { fontSize: 15, fontWeight: '600', color: c.mutedForeground },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.primary, paddingVertical: 14, borderRadius: colors.radius, minHeight: 52 },
  nextText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  disabled: { opacity: 0.4 },
});
