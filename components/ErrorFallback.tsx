import { reloadAppAsync } from "expo";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import colors from "@/constants/colors";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

const c = colors.light;

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const handleRestart = async () => {
    try {
      await reloadAppAsync();
    } catch {
      resetError();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Algo deu errado</Text>
      <Text style={styles.message}>Recarregue o app para continuar.</Text>
      <Pressable style={styles.button} onPress={handleRestart}>
        <Text style={styles.buttonText}>Tentar novamente</Text>
      </Pressable>
      {__DEV__ ? <Text style={styles.errorDetail}>{error.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: c.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: c.foreground,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: c.mutedForeground,
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: c.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: colors.radius,
    minWidth: 200,
  },
  buttonText: {
    color: c.primaryForeground,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  errorDetail: {
    marginTop: 16,
    fontSize: 12,
    color: c.mutedForeground,
    textAlign: "center",
  },
});
