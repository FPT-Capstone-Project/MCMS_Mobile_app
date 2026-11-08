import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, type ImageStyle } from 'react-native';

export interface AppLogoProps {
  size?: number;
  style?: ImageStyle;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 40, style }) => (
  <Image
    source={require('../../../../assets/mcms-mark.png')}
    style={[{ width: size, height: size }, styles.logo, style]}
    contentFit="contain"
    accessible
    accessibilityLabel="Logo SmartMush"
  />
);

const styles = StyleSheet.create({
  logo: {
    borderRadius: 8,
  },
});