import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import LoadingScreen from "@/components/LoadingScreen";
import { AppProvider, useApp } from "@/context/AppContext";
import colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isReady, isSetupComplete } = useApp();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isReady) return;
    const inSetup = segments[0] === "setup";
    if (!isSetupComplete && !inSetup) {
      router.replace("/setup");
    } else if (isSetupComplete && inSetup) {
      router.replace("/(tabs)");
    }
  }, [isReady, isSetupComplete, segments, router]);

  if (!isReady) {
    return <LoadingScreen message="Preparando o aplicativo…" />;
  }

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Voltar",
        headerTintColor: colors.light.primary,
        animation: "slide_from_right",
        animationDuration: 260,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="setup" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="registrar" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="estrutura" options={{ headerShown: false }} />
      <Stack.Screen name="historico" options={{ title: "Histórico", headerShown: true }} />
      <Stack.Screen name="armazenamento" options={{ title: "Armazenamento", headerShown: true }} />
      <Stack.Screen name="obra" options={{ title: "Dados da Obra", headerShown: true }} />
      <Stack.Screen name="relatorio-config" options={{ title: "Configurações do Relatório", headerShown: true }} />
      <Stack.Screen name="marca-dagua" options={{ title: "Marca d'Água", headerShown: true }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Feather.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AppProvider>
            <RootLayoutNav />
          </AppProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
