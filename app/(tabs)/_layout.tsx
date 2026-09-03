import { Tabs } from 'expo-router';
import React from 'react';
import { TabBar } from '../../src/shared/components/layout/TabBar';

/**
 * Customer App Shell Bottom Tabs Layout
 * Provides five core tabs: Trang chủ, Khay của tôi, Đơn hàng, Thông báo, and Hồ sơ.
 */
export default function TabsLayout() {
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
          title: 'Khay của tôi',
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
