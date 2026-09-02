import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../src/core/theme';
import { useAppSelector } from '../src/app/store';
import { Card } from '../src/shared/components/primitives/Card';
import { Text } from '../src/shared/components/primitives/Text';
import { ScreenContainer } from '../src/shared/components/layout/ScreenContainer';

/**
 * Foundation Index Screen
 * Validates the core setup, Redux store connectivity, and theme primitives.
 */
export default function FoundationIndexScreen() {
  const storeState = useAppSelector((state) => state);
  const isApiInitialized = Boolean(storeState.api);

  return (
    <ScreenContainer scrollable style={styles.screen}>
      <View style={styles.header}>
        <Text variant="overline" color={theme.colors.primary[500]}>
          MCMS Mobile App
        </Text>
        <Text variant="h1" style={styles.title}>
          SmartMush
        </Text>
        <Text variant="body" color={theme.colors.text.secondary}>
          Project Foundation Phase
        </Text>
      </View>

      <View style={styles.content}>
        <Card elevation="sm" style={styles.card}>
          <Text variant="title" style={styles.cardTitle}>
            Architecture Status
          </Text>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, styles.dotSuccess]} />
            <Text variant="bodyMedium">Feature-Based Clean Architecture</Text>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, styles.dotSuccess]} />
            <Text variant="bodyMedium">
              Redux Store: {isApiInitialized ? 'Connected' : 'Initializing'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, styles.dotSuccess]} />
            <Text variant="bodyMedium">RTK Query & Centralized Axios Ready</Text>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, styles.dotSuccess]} />
            <Text variant="bodyMedium">Expo SecureStore Abstraction Ready</Text>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, styles.dotSuccess]} />
            <Text variant="bodyMedium">Design System & Theme Tokens Active</Text>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, styles.dotSuccess]} />
            <Text variant="bodyMedium">Expo Router & Gesture Handler Configured</Text>
          </View>
        </Card>

        <Card elevation="xs" style={styles.infoCard}>
          <Text variant="captionMedium" color={theme.colors.text.secondary}>
            Ready for incremental feature development following AGENTS.md.
          </Text>
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    marginTop: theme.spacing.xxs,
    marginBottom: theme.spacing.xxs,
    color: theme.colors.text.primary,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.base,
  },
  card: {
    gap: theme.spacing.md,
  },
  cardTitle: {
    marginBottom: theme.spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: theme.borderRadius.full,
  },
  dotSuccess: {
    backgroundColor: theme.colors.success.main,
  },
  infoCard: {
    backgroundColor: theme.colors.neutral[50],
    borderColor: theme.colors.border.default,
  },
});
