import { Tabs, useSegments } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform } from "react-native";

import colors from "@/constants/colors";
import { shouldHideAppTabBar } from "@/utils/tabBarVisibility";

const TAB_BAR_STYLE = {
  backgroundColor: colors.light.card,
  borderTopWidth: 1,
  borderTopColor: colors.light.border,
  height: Platform.OS === "ios" ? 84 : 64,
  paddingBottom: Platform.OS === "ios" ? 28 : 8,
  paddingTop: 8,
} as const;

export default function TabLayout() {
  const c = colors.light;
  const segments = useSegments();
  const hideTabBar = shouldHideAppTabBar(segments);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.mutedForeground,
        animation: "shift",
        headerShown: true,
        headerStyle: { backgroundColor: c.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
        tabBarStyle: hideTabBar ? { display: "none" } : TAB_BAR_STYLE,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Registrar",
          headerTitle: "Registrar Fotos",
          tabBarIcon: ({ color }) => <Feather name="camera" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="configuracoes"
        options={{
          title: "Configurações",
          headerTitle: "Configurações",
          tabBarIcon: ({ color }) => <Feather name="sliders" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="relatorios"
        options={{
          title: "Relatórios",
          tabBarIcon: ({ color }) => <Feather name="file-text" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="estrutura"
        options={{
          title: "Estrutura",
          headerShown: false,
          tabBarIcon: ({ color }) => <Feather name="grid" size={22} color={color} />,
        }}
      />
      <Tabs.Screen name="registrar" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="historico" options={{ href: null, title: "Histórico" }} />
      <Tabs.Screen name="armazenamento" options={{ href: null, title: "Armazenamento" }} />
      <Tabs.Screen name="obra" options={{ href: null, title: "Dados da Obra" }} />
      <Tabs.Screen name="relatorio-config" options={{ href: null, title: "Configurações do Relatório" }} />
      <Tabs.Screen name="marca-dagua" options={{ href: null, title: "Marca d'Água" }} />
    </Tabs>
  );
}
