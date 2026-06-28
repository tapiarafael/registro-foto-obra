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
import { ErrorUtils } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import LoadingScreen from "@/components/LoadingScreen";
import { AppProvider, useApp } from "@/context/AppContext";
import colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();
console.log('[_layout] module loaded');

const _defaultHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('[GlobalError] fatal=' + String(isFatal), error?.message ?? error);
  _defaultHandler(error, isFatal);
});

function RootLayoutNav() {
  const { isReady, isSetupComplete } = useApp();
  console.log('[RootLayoutNav] render isReady=' + isReady + ' isSetupComplete=' + isSetupComplete);
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
      <Stack.Screen name="registrar" options={{ headerShown: false }} />
      <Stack.Screen name="estrutura" options={{ headerShown: false }} />
      <Stack.Screen name="armazenamento" options={{ title: "Armazenamento", headerShown: true }} />
      <Stack.Screen name="obra" options={{ title: "Dados da Obra", headerShown: true }} />
      <Stack.Screen name="relatorio-config" options={{ title: "Configurações do Relatório", headerShown: true }} />
      <Stack.Screen name="marca-dagua" options={{ title: "Marca d'Água", headerShown: true }} />
    </Stack>
  );
}

export default function RootLayout() {
  console.log('[RootLayout] render');
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
        <GestureHandlerRootView>
          <KeyboardProvider>
            <AppProvider>
              <RootLayoutNav />
            </AppProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
