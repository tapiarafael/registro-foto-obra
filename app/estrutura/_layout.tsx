import { Stack } from 'expo-router';
import React from 'react';
import colors from '@/constants/colors';

export default function EstruturaLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.light.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Voltar',
        animation: 'slide_from_right',
        animationDuration: 260,
      }}
    >
      <Stack.Screen name="quadras" options={{ title: 'Quadras' }} />
      <Stack.Screen name="predios" options={{ title: 'Prédios' }} />
      <Stack.Screen name="pavimentos" options={{ title: 'Pavimentos' }} />
      <Stack.Screen name="unidades" options={{ title: 'Unidades' }} />
      <Stack.Screen name="servicos" options={{ title: 'Serviços' }} />
      <Stack.Screen name="gerador" options={{ title: 'Gerador em massa' }} />
    </Stack>
  );
}
