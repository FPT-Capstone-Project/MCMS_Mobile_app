import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../core/theme';
import { AppIconButton } from '../primitives/AppIconButton';
import { AppText } from '../primitives/AppText';

export interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  showHandle?: boolean;
  style?: ViewStyle;
}

export const AppBottomSheet: React.FC<AppBottomSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  showHandle = true,
  style,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Đóng bảng điều khiển"
        />

        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.base) },
            style,
          ]}
        >
          {showHandle ? <View style={styles.dragHandle} /> : null}

          {title ? (
            <View style={styles.header}>
              <View style={styles.headerTextContainer}>
                <AppText variant="title" weight="bold">
                  {title}
                </AppText>
                {subtitle ? (
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    {subtitle}
                  </AppText>
                ) : null}
              </View>

              <AppIconButton
                icon={
                  <Ionicons
                    name="close"
                    size={20}
                    color={theme.colors.text.secondary}
                  />
                }
                onPress={onClose}
                accessibilityLabel="Đóng"
                size="sm"
              />
            </View>
          ) : null}

          <View style={styles.content}>{children}</View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: theme.colors.background.paper,
    borderTopLeftRadius: theme.borderRadius.xxl,
    borderTopRightRadius: theme.borderRadius.xxl,
    borderCurve: 'continuous',
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.screenHorizontal,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.neutral[300],
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
    marginBottom: theme.spacing.md,
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  content: {
    paddingBottom: theme.spacing.sm,
  },
});
