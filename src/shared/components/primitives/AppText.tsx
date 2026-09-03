import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { theme } from '../../../core/theme';
import { TextVariant } from '../../../core/theme/typography';

export interface AppTextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
}

export const AppText: React.FC<AppTextProps> = ({
  variant = 'body',
  color,
  align,
  weight,
  style,
  children,
  ...rest
}) => {
  const variantStyle = theme.typography.variants[variant] || theme.typography.variants.body;
  const textColor = color || theme.colors.text.primary;

  return (
    <RNText
      style={[
        variantStyle,
        { color: textColor },
        align ? { textAlign: align } : undefined,
        weight ? { fontWeight: weight } : undefined,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
};
