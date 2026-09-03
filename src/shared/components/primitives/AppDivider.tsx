import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../../../core/theme';
import { SpacingKey } from '../../../core/theme/spacing';
import { AppText } from './AppText';

export interface AppDividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: SpacingKey;
  color?: string;
  label?: string;
  style?: ViewStyle;
}

export const AppDivider: React.FC<AppDividerProps> = ({
  orientation = 'horizontal',
  spacing = 'sm',
  color = theme.colors.border.light,
  label,
  style,
}) => {
  const marginValue = theme.spacing[spacing] ?? theme.spacing.sm;

  if (orientation === 'vertical') {
    return (
      <View
        style={[
          styles.vertical,
          {
            backgroundColor: color,
            marginHorizontal: marginValue,
          },
          style,
        ]}
      />
    );
  }

  if (label) {
    return (
      <View
        style={[
          styles.labelContainer,
          {
            marginVertical: marginValue,
          },
          style,
        ]}
      >
        <View style={[styles.line, { backgroundColor: color }]} />
        <AppText variant="caption" color={theme.colors.text.muted} style={styles.labelText}>
          {label}
        </AppText>
        <View style={[styles.line, { backgroundColor: color }]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.horizontal,
        {
          backgroundColor: color,
          marginVertical: marginValue,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: '100%',
  },
  vertical: {
    width: 1,
    height: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  line: {
    flex: 1,
    height: 1,
  },
  labelText: {
    paddingHorizontal: theme.spacing.md,
    textTransform: 'uppercase',
  },
});
