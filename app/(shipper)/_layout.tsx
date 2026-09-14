import { Stack } from 'expo-router';
import React from 'react';

/**
 * Shipper Root Layout Group
 * Encapsulates all dedicated screens for the Shipper role.
 */
export default function ShipperLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
