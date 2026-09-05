import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { AppText } from '../../../../shared/components/primitives/AppText';

export interface AuthBrandingHeaderProps {
  title: string;
  subtitle?: string;
}

export const AuthBrandingHeader: React.FC<AuthBrandingHeaderProps> = ({ title, subtitle }) => {
  return (
    <View style={styles.container}>
      {/* Brand Icon Badge */}
      <View style={styles.logoBadge}>
        <View style={styles.iconCircle}>
          <Ionicons name="leaf" size={28} color={theme.colors.primary[500]} />
        </View>
        <AppText variant="overline" color={theme.colors.primary[600]} style={styles.brandTag}>
          SmartMush MCMS
        </AppText>
      </View>

      {/* Screen Title & Subtitle */}
      <AppText variant="h1" weight="bold" color={theme.colors.text.primary} style={styles.title}>
        {title}
      </AppText>

      {subtitle ? (
        <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  logoBadge: {
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: 6,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1.5,
    borderColor: theme.colors.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  brandTag: {
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  title: {
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    lineHeight: 20,
  },
});
