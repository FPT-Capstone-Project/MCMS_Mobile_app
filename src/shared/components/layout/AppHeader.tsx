import { Ionicons } from '@expo/vector-icons';
import { Href, usePathname, useRouter, useSegments } from 'expo-router';
import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../core/theme';
import { AppIconButton } from '../primitives/AppIconButton';
import { AppLogo } from '../primitives/AppLogo';
import { AppText } from '../primitives/AppText';

export interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showHome?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  backDisabled?: boolean;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  transparent?: boolean;
  titleAlign?: 'left' | 'center';
  style?: ViewStyle;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showHome = true,
  showBack = false,
  backDisabled = false,
  onBack,
  leftAction,
  rightAction,
  transparent = false,
  titleAlign = 'left',
  style,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const isAuthRoute = segments[0] === '(auth)';
  const isHomeRoute = pathname === '/';
  const shouldShowBack =
    showBack && (Boolean(onBack) || router.canGoBack() || isAuthRoute || !showHome);
  const shouldShowHome =
    !shouldShowBack && !leftAction && showHome && !isAuthRoute && !isHomeRoute;
  const hasLeadingAction = shouldShowBack || shouldShowHome || Boolean(leftAction);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/' as Href);
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
        <View
          style={[
            styles.leftContainer,
            !hasLeadingAction && styles.leftContainerEmpty,
          ]}
        >
          {shouldShowHome ? (
            <AppIconButton
              icon={
                <Ionicons
                  name="home-outline"
                  size={21}
                  color={theme.colors.text.primary}
                />
              }
              onPress={() => router.replace('/' as Href)}
              accessibilityLabel="Về trang chủ"
              size="sm"
            />
          ) : null}
          {shouldShowBack ? (
            <AppIconButton
              icon={
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={theme.colors.text.primary}
                />
              }
              disabled={backDisabled}
              onPress={handleBack}
              accessibilityLabel="Quay lại"
              size="sm"
            />
          ) : null}
          {!shouldShowBack ? leftAction : null}
        </View>

        <View
          style={[
            styles.titleContainer,
            titleAlign === 'center' ? styles.titleCenter : styles.titleLeft,
            titleAlign === 'left' && hasLeadingAction && styles.titleLeftWithLeading,
          ]}
        >
          {title ? <AppLogo size={32} /> : null}
          <View style={[styles.titleCopy, titleAlign === 'center' && styles.titleCopyCenter]}>
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
    flexDirection: 'row',
    minWidth: 40,
    gap: theme.spacing.xs,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  leftContainerEmpty: {
    width: 0,
    minWidth: 0,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    justifyContent: 'center',
  },
  titleLeft: {
    justifyContent: 'flex-start',
  },
  titleLeftWithLeading: {
    paddingLeft: theme.spacing.xs,
  },
  titleCenter: {
    justifyContent: 'center',
  },
  titleCopy: {
    flexShrink: 1,
    justifyContent: 'center',
  },
  titleCopyCenter: {
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
