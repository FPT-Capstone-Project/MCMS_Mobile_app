import { StatusBar } from 'expo-status-bar';
import React, { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '../store';

export interface AppProviderProps {
  children: ReactNode;
}

/**
 * Root Application Provider
 * Integrates GestureHandler, Redux Store, Safe Area Context, and Status Bar.
 */
export function AppProvider({ children }: AppProviderProps) {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ReduxProvider store={store}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          {children}
        </SafeAreaProvider>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
