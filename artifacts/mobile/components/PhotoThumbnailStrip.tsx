import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import colors from '@/constants/colors';

interface PhotoItem {
  id: number;
  uri: string;
  capturedAt?: string;
}

interface Props {
  photos: PhotoItem[];
  onPressPhoto?: (photo: PhotoItem) => void;
  onDeletePhoto?: (photo: PhotoItem) => void;
  size?: number;
}

export default function PhotoThumbnailStrip({ photos, onPressPhoto, onDeletePhoto, size = 72 }: Props) {
  if (photos.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      {photos.map(photo => (
        <View key={photo.id} style={[styles.item, { width: size, height: size }]}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => onPressPhoto?.(photo)} style={StyleSheet.absoluteFill}>
            <Image source={{ uri: photo.uri }} style={styles.image} />
          </TouchableOpacity>
          {onDeletePhoto && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDeletePhoto(photo)} hitSlop={8}>
              <Feather name="x" size={13} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const c = colors.light;
const styles = StyleSheet.create({
  content: { gap: 8, paddingVertical: 4 },
  item: { borderRadius: 8, overflow: 'hidden', backgroundColor: c.secondary, position: 'relative' },
  image: { width: '100%', height: '100%' },
  deleteBtn: {
    position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(179,38,30,0.9)',
    width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
  },
});
