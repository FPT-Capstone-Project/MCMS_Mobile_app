import { Tabs } from 'expo-router';
import React from 'react';
import { TabBar } from '../../src/shared/components/layout/TabBar';
import { useAuth } from '../../src/features/auth';

/**
 * App Shell Bottom Tabs Layout
 * Provides five core tabs: Trang chủ, Khay của tôi / Phòng tầng khay, Đơn hàng, Thông báo, and Hồ sơ.
 */
export default function TabsLayout() {
  const { canControlIot } = useAuth();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
        }}
      />
      <Tabs.Screen
        name="tray"
        options={{
          title: canControlIot ? 'Phòng tầng khay' : 'Khay của tôi',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Đơn hàng',
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Thông báo',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ',
        }}
      />
    </Tabs>
  );
}
