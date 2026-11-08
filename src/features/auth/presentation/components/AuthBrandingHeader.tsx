import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { AppText } from '../../../../shared/components/primitives/AppText';
import { AppLogo } from '../../../../shared/components/primitives/AppLogo';

export interface AuthBrandingHeaderProps {
  title: string;
  subtitle?: string;
}

export const AuthBrandingHeader: React.FC<AuthBrandingHeaderProps> = ({ title, subtitle }) => {
  return (
    <View style={styles.container}>
      {/* Brand Icon Badge */}
      <View style={styles.logoBadge}>
        <AppLogo size={72} />
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
