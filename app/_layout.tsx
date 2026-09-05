import React from 'react';
import { Stack } from 'expo-router';
import { AppProvider } from '../src/app/providers';

/**
 * Root Navigation Layout
 * Wraps all application routes in AppProvider (Redux, GestureHandler, SafeAreaProvider).
 */
export default function RootLayout() {
  return (
    <AppProvider>
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
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="rental/index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="camera/[trayId]"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </AppProvider>
  );
}
