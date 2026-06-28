import { Stack } from 'expo-router';
import React from 'react';
import colors from '@/constants/colors';

export default function RegistrarLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.light.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Voltar',
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
    </Stack>
  );
}
