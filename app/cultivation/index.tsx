import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { theme } from '../../src/core/theme';
import { AppText } from '../../src/shared/components';

export default function CultivationScreen() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      router.replace('/(tabs)/tray');
    }, [router])
  );

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={theme.colors.primary[600]} />
      <AppText variant="caption" color={theme.colors.text.secondary} style={{ marginTop: 8 }}>
        Đang chuyển tới sơ đồ Phòng tầng khay...
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.default,
  },
});
