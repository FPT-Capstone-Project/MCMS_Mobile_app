import React, { useEffect } from 'react';
import { Href, Stack, useRouter, useSegments } from 'expo-router';
import { AppProvider } from '../src/app/providers';
import { setOnUnauthorized } from '../src/core/api/axiosClient';
import { useAuth } from '../src/features/auth';
import { AppLoading } from '../src/shared/components';

/**
 * NavigationGuard
 * Enforces session initialization on startup and protects authenticated routes.
 */
function NavigationGuard() {
  const segments = useSegments();
  const router = useRouter();
  const { status, user, isShipper, isInitializing, initialize, forceLogout } = useAuth();

  useEffect(() => {
    setOnUnauthorized(() => {
      forceLogout();
    });
    return () => {
      setOnUnauthorized(null);
    };
  }, [forceLogout]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isInitializing) return;

    const currentSegment = segments[0] as string | undefined;
    const inAuthGroup = currentSegment === '(auth)';
    const inCustomerRoutes =
      currentSegment === '(tabs)' ||
      currentSegment === 'rental' ||
      currentSegment === 'camera' ||
      currentSegment === 'control' ||
      currentSegment === 'automatic' ||
      currentSegment === 'sensors' ||
      currentSegment === 'cultivation' ||
      currentSegment === 'mushrooms';
    const inShipperRoutes = currentSegment === '(shipper)';
    const inStaffOnlyRoute =
      currentSegment === 'control' ||
      currentSegment === 'automatic' ||
      currentSegment === 'sensors' ||
      currentSegment === 'cultivation';
    if (status === 'unauthenticated' && !inAuthGroup) {
      // Route unauthenticated visitors to login screen
      router.replace('/(auth)/login' as Href);
    } else if (status === 'authenticated') {
      const shipperActive = isShipper || user?.role === 'SHIPPER';
      const staffActive = user?.role === 'ADMIN' || user?.role === 'FARM_OPERATOR';

      if (inAuthGroup) {
        // Route away from auth screens based on authenticated role
        if (shipperActive) {
          router.replace('/(shipper)' as Href);
        } else {
          router.replace('/(tabs)' as Href);
        }
      } else if (shipperActive && inCustomerRoutes) {
        // Enforce role boundary: Shippers cannot view Customer screens
        router.replace('/(shipper)' as Href);
      } else if (!shipperActive && inShipperRoutes) {
        // Enforce role boundary: Customers cannot view Shipper screens
        router.replace('/(tabs)' as Href);
      } else if (!staffActive && inStaffOnlyRoute) {
        // Farm-wide IoT routes are not available to customer accounts.
        router.replace('/(tabs)' as Href);
      }
    }
  }, [status, user, isShipper, isInitializing, segments, router]);

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
        name="(shipper)"
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
        name="control/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="automatic/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sensors/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="cultivation/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="mushrooms/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="camera/[cameraId]"
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
