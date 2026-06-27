import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import colors from '@/constants/colors';

interface Props {
  message?: string;
}

export default function LoadingScreen({ message = 'Carregando…' }: Props) {
  const c = colors.light;
  const scale = useSharedValue(1);
  const ring = useSharedValue(0.7);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 650, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 650, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );
    ring.value = withRepeat(
      withTiming(1.7, { duration: 1400, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, [scale, ring]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value }],
    opacity: (1.7 - ring.value) * 0.35,
  }));

  return (
    <Animated.View entering={FadeIn.duration(300)} style={[styles.wrap, { backgroundColor: c.background }]}>
      <View style={styles.center}>
        <Animated.View style={[styles.ring, { borderColor: c.primary }, ringStyle]} />
        <Animated.View style={[styles.circle, { backgroundColor: c.primary }, iconStyle]}>
          <Feather name="camera" size={30} color="#fff" />
        </Animated.View>
      </View>
      <Text style={[styles.message, { color: c.mutedForeground }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { marginTop: 20, fontSize: 14, fontWeight: '500' },
});
