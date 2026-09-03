import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../core/theme';
import { AppIconButton } from '../primitives/AppIconButton';
import { AppText } from '../primitives/AppText';

export interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  transparent?: boolean;
  titleAlign?: 'left' | 'center';
  style?: ViewStyle;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  leftAction,
  rightAction,
  transparent = false,
  titleAlign = 'left',
  style,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
        !transparent && styles.surface,
        style,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.leftContainer}>
          {showBack ? (
            <AppIconButton
              icon={
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={theme.colors.text.primary}
                />
              }
              onPress={handleBack}
              accessibilityLabel="Quay lại"
              size="sm"
            />
          ) : (
            leftAction
          )}
        </View>

        <View
          style={[
            styles.titleContainer,
            titleAlign === 'center' ? styles.titleCenter : styles.titleLeft,
          ]}
        >
          {title ? (
            <AppText
              variant="title"
              weight="bold"
              numberOfLines={1}
              style={[
                styles.titleText,
                titleAlign === 'center' ? styles.alignCenter : undefined,
              ]}
            >
              {title}
            </AppText>
          ) : null}
          {subtitle ? (
            <AppText
              variant="caption"
              color={theme.colors.text.secondary}
              numberOfLines={1}
              style={titleAlign === 'center' ? styles.alignCenter : undefined}
            >
              {subtitle}
            </AppText>
          ) : null}
        </View>

        <View style={styles.rightContainer}>{rightAction}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 10,
  },
  surface: {
    backgroundColor: theme.colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  content: {
    height: theme.layout.heights.header,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.screenHorizontal,
  },
  leftContainer: {
    minWidth: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleLeft: {
    paddingHorizontal: theme.spacing.xs,
  },
  titleCenter: {
    alignItems: 'center',
  },
  titleText: {
    color: theme.colors.text.primary,
  },
  alignCenter: {
    textAlign: 'center',
  },
  rightContainer: {
    minWidth: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
