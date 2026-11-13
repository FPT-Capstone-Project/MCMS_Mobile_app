import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/features/auth';
import { AppLoading } from '../src/shared/components';

/**
 * Root Entry Point
 * Redirects authenticated experts to their workflow and other users to the main tabs.
 */
export default function Index() {
  const { isAuthenticated, isInitializing, isExpert } = useAuth();

  if (isInitializing) {
    return <AppLoading fullscreen message="Đang khởi tạo SmartMush..." />;
  }

  if (isAuthenticated) {
    if (isExpert) {
      return <Redirect href="/(expert)" />;
    }
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
