import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { updateProject } from '@/db/database';

export default function ObraScreen() {
  const c = colors.light;
  const router = useRouter();
  const { project, loadProject } = useApp();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [company, setCompany] = useState('');
  const [engineer, setEngineer] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setAddress(project.address ?? '');
      setCompany(project.company ?? '');
      setEngineer(project.responsible_engineer ?? '');
    }
  }, [project]);

  const save = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await updateProject({
        name: name.trim(),
        address: address.trim() || undefined,
        company: company.trim() || undefined,
        responsible_engineer: engineer.trim() || undefined,
      });
      await loadProject();
      router.back();
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Field label="Nome da obra *" value={name} onChangeText={setName} placeholder="Ex.: Residencial Jardins" />
          <Field label="Endereço" value={address} onChangeText={setAddress} placeholder="Rua, número, cidade" />
          <Field label="Construtora" value={company} onChangeText={setCompany} placeholder="Nome da empresa" />
          <Field label="Engenheiro responsável" value={engineer} onChangeText={setEngineer} placeholder="Nome do responsável" />

          <TouchableOpacity style={[styles.saveBtn, (!name.trim() || busy) && styles.disabled]} onPress={save} disabled={!name.trim() || busy}>
            {busy ? <ActivityIndicator color="#fff" /> : (
              <>
                <Feather name="save" size={20} color="#fff" />
                <Text style={styles.saveText}>Salvar</Text>
              </>
            )}
          </TouchableOpacity>
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
  scroll: { padding: 16 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: c.foreground, marginBottom: 6 },
  input: {
    backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: colors.radius,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.foreground, minHeight: 48,
  },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: c.primary, paddingVertical: 16, borderRadius: colors.radius, marginTop: 8, minHeight: 52 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
