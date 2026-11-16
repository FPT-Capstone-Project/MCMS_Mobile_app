import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  AppState,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../core/theme';
import { useAuth } from '../../../features/auth/presentation/hooks/useAuth';
import { AppText } from '../primitives/AppText';
import { useGetUnreadNotificationCountQuery } from '../../../features/notification/data/notificationApi';

interface TabConfig {
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
}

const TAB_CONFIGS: Record<string, TabConfig> = {
  index: {
    label: 'Trang chủ',
    activeIcon: 'leaf',
    inactiveIcon: 'leaf-outline',
    accessibilityLabel: 'Tab Trang chủ',
  },
  tray: {
    label: 'Khay của tôi',
    activeIcon: 'cube',
    inactiveIcon: 'cube-outline',
    accessibilityLabel: 'Tab Quản lý khay trồng',
  },
  orders: {
    label: 'Đơn hàng',
    activeIcon: 'receipt',
    inactiveIcon: 'receipt-outline',
    accessibilityLabel: 'Tab Đơn hàng',
  },
  notifications: {
    label: 'Thông báo',
    activeIcon: 'notifications',
    inactiveIcon: 'notifications-outline',
    accessibilityLabel: 'Tab Thông báo và cảnh báo',
  },
  profile: {
    label: 'Hồ sơ',
    activeIcon: 'person',
    inactiveIcon: 'person-outline',
    accessibilityLabel: 'Tab Hồ sơ và cài đặt',
  },
};

export type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

export const TabBar: React.FC<TabBarProps> = ({ state, descriptors, emitter, navigateToTab }) => {
  const insets = useSafeAreaInsets();
  const { canControlIot, user } = useAuth();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const { currentData: unreadCount = 0, refetch } = useGetUnreadNotificationCountQuery(user?.id ?? '', {
    skip: !user,
    pollingInterval: appActive ? 30_000 : 0,
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppActive(nextState === 'active');
      if (nextState === 'active' && user) void refetch();
    });
    return () => subscription.remove();
  }, [refetch, user]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, theme.spacing.sm),
        },
      ]}
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const descriptor = descriptors[route.key];
          const options = descriptor?.options || {};
          let config = TAB_CONFIGS[route.name] || {
            label: options.title || route.name,
            activeIcon: 'ellipse',
            inactiveIcon: 'ellipse-outline',
            accessibilityLabel: `Tab ${route.name}`,
          };

          if (route.name === 'tray' && canControlIot) {
            config = {
              label: 'Phòng tầng khay',
              activeIcon: 'layers',
              inactiveIcon: 'layers-outline',
              accessibilityLabel: 'Tab Sơ đồ phòng tầng khay',
            };
          }

          if (route.name === 'orders' && canControlIot) {
            config = {
              label: 'Phiên trồng',
              activeIcon: 'albums',
              inactiveIcon: 'albums-outline',
              accessibilityLabel: 'Tab Quản lý phiên nuôi trồng',
            };
          }

          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          const onLongPress = () => {
            emitter.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const iconColor = isFocused
            ? theme.colors.primary[500]
            : theme.colors.neutral[400];

          const iconName = isFocused ? config.activeIcon : config.inactiveIcon;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={route.name === 'notifications' && unreadCount > 0
                ? `${config.accessibilityLabel}, ${unreadCount} thông báo chưa đọc`
                : config.accessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [
                styles.tabItem,
                pressed && styles.tabItemPressed,
              ]}
              hitSlop={4}
            >
              <View
                style={[
                  styles.pill,
                  isFocused && styles.pillActive,
                ]}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name={iconName} size={22} color={iconColor} />
                  {route.name === 'notifications' && user && unreadCount > 0 && (
                    <View style={styles.unreadBadge} pointerEvents="none">
                      <AppText weight="bold" color="#FFFFFF" style={styles.unreadBadgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </AppText>
                    </View>
                  )}
                </View>
                <AppText
                  variant="caption"
                  weight={isFocused ? 'bold' : 'medium'}
                  color={
                    isFocused
                      ? theme.colors.primary[600]
                      : theme.colors.neutral[500]
                  }
                  numberOfLines={1}
                  style={styles.label}
                >
                  {config.label}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  iconContainer: { position: 'relative' },
  unreadBadge: {
    position: 'absolute',
    top: -7,
    left: 13,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: theme.colors.error.main,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.background.paper,
  },
  unreadBadgeText: { fontSize: 10, lineHeight: 13 },
  container: {
    backgroundColor: theme.colors.background.paper,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: theme.layout.heights.tabBar,
    paddingHorizontal: theme.spacing.xs,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.layout.minTouchTarget,
  },
  tabItemPressed: {
    opacity: 0.7,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: theme.borderRadius.full,
    borderCurve: 'continuous',
    minWidth: 48,
  },
  pillActive: {
    backgroundColor: theme.colors.primary[50],
  },
  label: {
    marginTop: 2,
    fontSize: 10.5,
    lineHeight: 13,
    textAlign: 'center',
  },
});
