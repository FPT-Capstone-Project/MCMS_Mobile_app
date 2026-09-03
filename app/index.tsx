import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Root Entry Point
 * Redirects directly into the customer App Shell bottom tab navigation.
 */
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
