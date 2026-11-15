import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { ENV } from '../../../../core/config/env';
import { theme } from '../../../../core/theme';

// Exact species aliases only: never show an unrelated mushroom as a fallback.
function bundledMushroomImage(name?: string | null): ImageSourcePropType | undefined {
  const key = name?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().trim();
  switch (key) {
    case 'nam so trang': case 'nam bao ngu trang': case 'bao ngu trang':
      return require('../../../../../assets/cong-dung-nam-bao-ngu-trang.png');
    case 'nam so xam': case 'nam bao ngu xam': case 'bao ngu xam':
      return require('../../../../../assets/bao-ngu-xam.png');
    case 'nam kim cham': case 'kim cham':
      return require('../../../../../assets/cach-lam-sach-nam-kim-cham-dspl-10472227-1715177938630-17151779394772100853484.png');
    case 'nam dui ga': case 'dui ga':
      return require('../../../../../assets/nam-dui-ga_9887ce40e0c6433eb0d06c46f6b1cda0.png');
    default: return undefined;
  }
}

export function TrayMushroomImage({ uri, name, compact = false }: {
  uri?: string | null; name?: string | null; compact?: boolean;
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  let url: string | undefined;
  try {
    const parsed = uri ? new URL(uri, ENV.apiUrl) : null;
    if (parsed && ['https:', 'http:'].includes(parsed.protocol)) url = parsed.href;
  } catch { /* Missing or invalid image: retain the species label and placeholder. */ }
  const source = url && failedUri !== url ? { uri: url } : bundledMushroomImage(name);
  return (
    <View style={[styles.frame, compact && styles.compact]}>
      {source ? (
        <Image source={source} style={styles.image} resizeMode="cover"
          accessibilityLabel={`Ảnh ${name || 'nấm đang trồng'}`}
          onError={() => { if (url) setFailedUri(url); }} />
      ) : <Ionicons name="leaf-outline" size={28} color={theme.colors.primary[600]} />}
    </View>
  );
}
const styles = StyleSheet.create({
  frame: { width: 92, maxWidth: '100%', height: 62, borderRadius: 10, overflow: 'hidden',
    backgroundColor: theme.colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  compact: { width: 52, height: 52 },
  image: { width: '100%', height: '100%' },
});
