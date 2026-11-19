import { Tabs } from 'expo-router';
import React from 'react';
import { TabBar } from '../../src/shared/components/layout/TabBar';

export default function ExpertLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Tư vấn' }} />
      <Tabs.Screen name="profile" options={{ title: 'Hồ sơ' }} />
    </Tabs>
  );
}
