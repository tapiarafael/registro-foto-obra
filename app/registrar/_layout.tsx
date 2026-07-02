import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';

function HeaderHomeButton() {
  const router = useRouter();
  const { resetCaptureNav } = useApp();

  return (
    <Pressable
      onPress={() => {
        resetCaptureNav();
        router.replace('/(tabs)');
      }}
      style={{ marginRight: 12, padding: 8 }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Início"
    >
      <Feather name="home" size={22} color="#fff" />
    </Pressable>
  );
}

export default function RegistrarLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.light.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Voltar',
        headerRight: () => <HeaderHomeButton />,
        animation: 'fade',
        animationDuration: 180,
      }}
    >
      <Stack.Screen name="quadras" options={{ title: 'Selecionar Quadra' }} />
      <Stack.Screen name="predios" options={{ title: 'Selecionar Prédio' }} />
      <Stack.Screen name="pavimentos" options={{ title: 'Selecionar Pavimento' }} />
      <Stack.Screen name="unidades" options={{ title: 'Selecionar Unidade' }} />
      <Stack.Screen name="servicos" options={{ title: 'Selecionar Serviço' }} />
      <Stack.Screen name="camera" options={{ headerShown: false, animation: 'fade_from_bottom' }} />
      <Stack.Screen name="revisao" options={{ title: 'Revisar fotos' }} />
    </Stack>
  );
}
