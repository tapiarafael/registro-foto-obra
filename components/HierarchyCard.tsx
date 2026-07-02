import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import colors from '@/constants/colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  title: string;
  subtitle?: string;
  badge?: string | number;
  onPress?: () => void;
  onLongPress?: () => void;
  showChevron?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  photoCount?: number;
  done?: boolean;
}

export default function HierarchyCard({
  title, subtitle, badge, onPress, onLongPress,
  showChevron = true, left, right, photoCount, done = false,
}: Props) {
  const c = colors.light;
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pressable = !!(onPress || onLongPress);
  const showRightSlot = done || right || (showChevron && onPress);

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      layout={LinearTransition.duration(220)}
      style={styles.card}
    >
      <AnimatedPressable
        style={[styles.main, pressStyle]}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => { if (pressable) scale.value = withTiming(0.97, { duration: 90 }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 120 }); }}
        disabled={!pressable}
      >
        {left && <View style={styles.leftSlot}>{left}</View>}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {badge !== undefined && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            )}
          </View>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
          ) : null}
          {photoCount !== undefined && photoCount > 0 ? (
            <View style={styles.photoRow}>
              <Feather name="camera" size={11} color={c.primary} />
              <Text style={styles.photoCount}>{photoCount} {photoCount === 1 ? 'foto' : 'fotos'} hoje</Text>
            </View>
          ) : null}
        </View>
        {!right && showChevron && onPress ? (
          <Feather name="chevron-right" size={20} color={c.mutedForeground} />
        ) : null}
      </AnimatedPressable>
      {showRightSlot ? (
        <View style={styles.rightSlot}>
          {done ? (
            <View style={styles.doneBadge}>
              <Feather name="check" size={14} color="#fff" />
            </View>
          ) : null}
          {right ?? null}
        </View>
      ) : null}
    </Animated.View>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.card, borderRadius: colors.radius,
    paddingRight: 8, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
    minHeight: 64,
  },
  main: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingLeft: 16, paddingVertical: 14, paddingRight: 8,
  },
  leftSlot: { marginRight: 12 },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: '600', color: c.foreground, flex: 1 },
  subtitle: { fontSize: 12, color: c.mutedForeground, marginTop: 2 },
  badge: {
    backgroundColor: c.primary, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  photoCount: { fontSize: 11, color: c.primary, fontWeight: '500' },
  rightSlot: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8 },
  doneBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: c.success,
    alignItems: 'center', justifyContent: 'center',
  },
});
