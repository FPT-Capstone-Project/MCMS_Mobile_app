import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../src/core/theme';
import {
  AppBottomSheet,
  AppButton,
  AppCard,
  AppDivider,
  AppHeader,
  AppIconButton,
  AppInput,
  AppText,
  ScreenContainer,
} from '../../src/shared/components';

/**
 * Home Tab Shell
 * Demonstrates the core design system components, typography hierarchy, and IoT preview cards in Vietnamese.
 */
export default function HomeScreen() {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="SmartMush"
        subtitle="Hệ thống giám sát nuôi trồng nấm thông minh"
        rightAction={
          <AppIconButton
            icon={
              <Ionicons
                name="options-outline"
                size={22}
                color={theme.colors.text.primary}
              />
            }
            onPress={() => setSheetVisible(true)}
            accessibilityLabel="Bộ lọc và tùy chọn"
          />
        }
      />

      <View style={styles.content}>
        {/* Welcome & Overview Card */}
        <AppCard elevation="sm" style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconBadge}>
              <Ionicons name="leaf" size={24} color={theme.colors.primary[500]} />
            </View>
            <View style={styles.heroTextGroup}>
              <AppText variant="overline" color={theme.colors.primary[500]}>
                Môi trường nuôi trồng
              </AppText>
              <AppText variant="h3">Tổng quan buồng trồng</AppText>
            </View>
          </View>

          <AppText
            variant="bodySmall"
            color={theme.colors.text.secondary}
            style={styles.heroDescription}
          >
            Hệ thống đang hoạt động ổn định. Các thông số môi trường đều đạt mức tối ưu.
          </AppText>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Nhiệt độ
              </AppText>
              <AppText variant="title" weight="bold" color={theme.colors.text.primary}>
                24.5 °C
              </AppText>
            </View>

            <AppDivider orientation="vertical" spacing="sm" />

            <View style={styles.metricItem}>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Độ ẩm
              </AppText>
              <AppText variant="title" weight="bold" color={theme.colors.text.primary}>
                88 %
              </AppText>
            </View>

            <AppDivider orientation="vertical" spacing="sm" />

            <View style={styles.metricItem}>
              <AppText variant="caption" color={theme.colors.text.muted}>
                Nồng độ CO₂
              </AppText>
              <AppText variant="title" weight="bold" color={theme.colors.text.primary}>
                650 ppm
              </AppText>
            </View>
          </View>
        </AppCard>

        {/* Search / Filter Input Sample */}
        <AppInput
          placeholder="Tìm kiếm khay trồng, mẻ nấm hoặc cảnh báo..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={
            <Ionicons name="search-outline" size={18} color={theme.colors.text.muted} />
          }
        />

        {/* UI Primitives Showcase Card */}
        <AppCard elevation="sm" style={styles.sectionCard}>
          <AppText variant="title" weight="bold" style={styles.sectionTitle}>
            Thành phần giao diện chuẩn
          </AppText>
          <AppText
            variant="bodySmall"
            color={theme.colors.text.secondary}
            style={styles.sectionSubtitle}
          >
            Các nút bấm, góc bo và màu sắc ngữ nghĩa được đồng bộ trên toàn ứng dụng.
          </AppText>

          <View style={styles.buttonStack}>
            <AppButton
              title="Hành động chính"
              variant="primary"
              size="md"
              leftIcon={<Ionicons name="flash-outline" size={18} color="#FFFFFF" />}
              onPress={() => setSheetVisible(true)}
            />
            <AppButton
              title="Khay nuôi trồng"
              variant="secondary"
              size="md"
              leftIcon={
                <Ionicons
                  name="cube-outline"
                  size={18}
                  color={theme.colors.neutral[900]}
                />
              }
            />
            <AppButton
              title="Hành động phụ"
              variant="outline"
              size="md"
            />
          </View>
        </AppCard>

        {/* Status Highlights */}
        <View style={styles.statusGrid}>
          <AppCard elevation="xs" style={styles.statusCard}>
            <View style={[styles.statusDot, { backgroundColor: theme.colors.success.main }]} />
            <AppText variant="label">Hệ thống ổn định</AppText>
            <AppText variant="caption" color={theme.colors.text.secondary}>
              Dữ liệu cảm biến IoT bình thường
            </AppText>
          </AppCard>

          <AppCard elevation="xs" style={styles.statusCard}>
            <View style={[styles.statusDot, { backgroundColor: theme.colors.secondary[500] }]} />
            <AppText variant="label">Nền tảng sẵn sàng</AppText>
            <AppText variant="caption" color={theme.colors.text.secondary}>
              Expo SDK 57 & Redux Toolkit
            </AppText>
          </AppCard>
        </View>
      </View>

      {/* Bottom Sheet Demo */}
      <AppBottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Cài đặt nhanh"
        subtitle="Bảng điều khiển giao diện"
      >
        <View style={styles.sheetBody}>
          <AppText variant="body" color={theme.colors.text.secondary}>
            Đây là bảng điều khiển đáy (Bottom Sheet) có thể tái sử dụng, tự động tương thích với vùng an toàn của thiết bị.
          </AppText>
          <AppButton
            title="Đóng bảng điều khiển"
            variant="primary"
            size="md"
            style={styles.sheetButton}
            onPress={() => setSheetVisible(false)}
          />
        </View>
      </AppBottomSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.screenHorizontal,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.base,
  },
  heroCard: {
    backgroundColor: theme.colors.background.paper,
    gap: theme.spacing.sm,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  heroIconBadge: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextGroup: {
    flex: 1,
  },
  heroDescription: {
    marginTop: theme.spacing.xxs,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.base,
    padding: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  sectionCard: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text.primary,
  },
  sectionSubtitle: {
    marginTop: -theme.spacing.xs,
  },
  buttonStack: {
    gap: theme.spacing.sm,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statusCard: {
    flex: 1,
    gap: theme.spacing.xxs,
    backgroundColor: theme.colors.background.paper,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: theme.spacing.xxs,
  },
  sheetBody: {
    gap: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
  },
  sheetButton: {
    marginTop: theme.spacing.sm,
  },
});
