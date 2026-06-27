import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import colors from '@/constants/colors';

interface Props {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon = 'inbox', title, message, actionLabel, onAction }: Props) {
  const c = colors.light;
  return (
    <Animated.View entering={FadeInDown.duration(360).springify().damping(16)} style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Feather name={icon} size={32} color={c.mutedForeground} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.button} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: c.secondary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '600', color: c.foreground, textAlign: 'center' },
  message: { fontSize: 14, color: c.mutedForeground, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  button: {
    marginTop: 20, backgroundColor: c.primary, paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: colors.radius, minHeight: 48, justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
