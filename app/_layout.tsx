import React, { useEffect } from 'react';
import { Href, Stack, useRouter, useSegments } from 'expo-router';
import { AppProvider } from '../src/app/providers';
import { useAuth } from '../src/features/auth';
import { AppLoading } from '../src/shared/components';

/**
 * NavigationGuard
 * Enforces session initialization on startup and protects authenticated routes.
 */
function NavigationGuard() {
  const segments = useSegments();
  const router = useRouter();
  const { status, isInitializing, initialize } = useAuth();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isInitializing) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (status === 'unauthenticated' && !inAuthGroup) {
      // Route unauthenticated visitors to login
      router.replace('/(auth)/login' as Href);
    } else if (status === 'authenticated' && inAuthGroup) {
      // Route logged-in customers away from auth screens into the main app shell
      router.replace('/(tabs)' as Href);
    }
  }, [status, isInitializing, segments, router]);

  if (isInitializing) {
    return <AppLoading fullscreen message="Đang khởi tạo SmartMush..." />;
  }

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
      <Stack.Screen
        name="(auth)"
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
  );
}

/**
 * Root Navigation Layout
 * Wraps all application routes in AppProvider and mounts NavigationGuard.
 */
export default function RootLayout() {
  return (
    <AppProvider>
      <NavigationGuard />
    </AppProvider>
  );
}
