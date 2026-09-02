import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { theme } from '../../../core/theme';

export type CardElevation = keyof typeof theme.shadows;
export type CardPadding = keyof typeof theme.spacing;

export interface CardProps extends ViewProps {
  children?: ReactNode;
  elevation?: CardElevation;
  padding?: CardPadding;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  elevation = 'sm',
  padding = 'base',
  style,
  ...rest
}) => {
  const shadowStyle = theme.shadows[elevation];
  const paddingValue = theme.spacing[padding];

  return (
    <View
      style={[
        styles.base,
        shadowStyle,
        { padding: paddingValue },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
});
