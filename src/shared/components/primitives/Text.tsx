import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { theme } from '../../../core/theme';

export type TextVariant = keyof typeof theme.typography.variants;

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  align?: TextStyle['textAlign'];
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color,
  align,
  style,
  children,
  ...rest
}) => {
  const variantStyle = theme.typography.variants[variant];
  const textColor = color || theme.colors.text.primary;

  return (
    <RNText
      style={[
        variantStyle,
        { color: textColor },
        align ? { textAlign: align } : undefined,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
};
