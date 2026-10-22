import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../src/core/theme';
import { formatVND } from '../../src/core/utils/currency';
import {
  cultivationRepository,
  MushroomCondition,
  MushroomConditionModal,
  MushroomType,
} from '../../src/features/cultivation';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../src/shared/components';


export default function MushroomsScreen() {
  const router = useRouter();
  const [mushroomTypes, setMushroomTypes] = useState<MushroomType[]>([]);
  const [conditions, setConditions] = useState<MushroomCondition[]>([]);
  const [selectedMushroomId, setSelectedMushroomId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditingCondition, setIsEditingCondition] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [typesData, conditionsData] = await Promise.all([
        cultivationRepository.getMushroomTypes(),
        cultivationRepository.getMushroomConditions(),
      ]);
      setMushroomTypes(typesData);
      setConditions(conditionsData);

      if (typesData.length > 0 && selectedMushroomId === null) {
        setSelectedMushroomId(typesData[0].mushroom_type_id);
      }
    } catch (err: unknown) {
      Alert.alert(
        'Lỗi nạp dữ liệu',
        typeof err === 'string'
          ? err
          : err instanceof Error
          ? err.message
          : 'Không thể kết nối đến máy chủ.'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedMushroomId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const selectedMushroom = mushroomTypes.find((m) => m.mushroom_type_id === selectedMushroomId);
  const selectedCondition = conditions.find((c) => c.mushroom_type_id === selectedMushroomId);

  const handleOpenCreate = () => {
    setIsEditingCondition(false);
    setIsModalVisible(true);
  };

  const handleOpenEdit = () => {
    setIsEditingCondition(true);
    setIsModalVisible(true);
  };

  const handleDeleteCondition = (conditionId: number) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa bảng điều kiện vi khí hậu của giống nấm "${selectedMushroom?.name || ''}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await cultivationRepository.deleteMushroomCondition(conditionId);
              Alert.alert('Thành công', 'Đã xóa bảng điều kiện vi khí hậu.');
              await loadData();
            } catch (err: unknown) {
              Alert.alert(
                'Lỗi',
                typeof err === 'string'
                  ? err
                  : err instanceof Error
                  ? err.message
                  : 'Không thể xóa điều kiện vi khí hậu.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <AppHeader title="Danh mục nấm" subtitle="Giống nấm & Điều kiện sinh trưởng" />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.loadingText}>
            Đang tải danh mục nấm...
          </AppText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="Danh mục nấm & Điều kiện"
        subtitle="Catalog & Ngưỡng vi khí hậu tối ưu"
        showBack
        onBack={() => router.back()}
      />

      <View style={styles.content}>
        {/* Horizontal mushroom selector */}
        <View style={styles.section}>
          <AppText variant="label" color={theme.colors.text.muted}>
            CÁC LOẠI NẤM TRỒNG
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {mushroomTypes.map((m) => {
              const isSelected = m.mushroom_type_id === selectedMushroomId;
              return (
                <Pressable
                  key={m.mushroom_type_id}
                  onPress={() => setSelectedMushroomId(m.mushroom_type_id)}
                  style={[styles.pill, isSelected && styles.pillActive]}
                >
                  <AppText
                    variant="caption"
                    weight={isSelected ? 'bold' : 'normal'}
                    color={isSelected ? '#FFFFFF' : theme.colors.text.primary}
                  >
                    {m.name}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected Mushroom Profile */}
        {selectedMushroom && (
          <AppCard elevation="sm" style={styles.mushCard}>
            <View style={styles.mushHeader}>
              {selectedMushroom.image_url ? (
                <Image source={{ uri: selectedMushroom.image_url }} style={styles.mushImage} />
              ) : (
                <View style={styles.iconCircle}>
                  <Ionicons name="leaf" size={28} color={theme.colors.primary[600]} />
                </View>
              )}
              <View style={styles.mushMeta}>
                <AppText variant="title" weight="bold">
                  {selectedMushroom.name}
                </AppText>
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Thời gian nuôi trồng: {selectedMushroom.growing_days} ngày
                </AppText>
                <AppText variant="label" weight="bold" color={theme.colors.primary[600]}>
                  {formatVND(selectedMushroom.price)} / phôi
                </AppText>
              </View>
            </View>

            {selectedMushroom.description ? (
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                {selectedMushroom.description}
              </AppText>
            ) : null}
          </AppCard>
        )}

        {/* Condition Thresholds Card */}
        <AppCard elevation="sm" style={styles.conditionCard}>
          <View style={styles.cardHeaderWithAction}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="thermometer-outline" size={22} color={theme.colors.primary[600]} />
              <AppText variant="title" weight="bold">
                Điều kiện vi khí hậu tối ưu
              </AppText>
            </View>
            {selectedCondition ? (
              <View style={styles.cardActionButtons}>
                <Pressable
                  onPress={handleOpenEdit}
                  style={styles.iconActionBtn}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Chỉnh sửa điều kiện"
                >
                  <Ionicons name="create-outline" size={18} color={theme.colors.primary[600]} />
                </Pressable>
                <Pressable
                  onPress={() => handleDeleteCondition(selectedCondition.condition_id)}
                  style={[styles.iconActionBtn, styles.deleteActionBtn]}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Xóa điều kiện"
                >
                  <Ionicons name="trash-outline" size={18} color={theme.colors.error.main} />
                </Pressable>
              </View>
            ) : null}
          </View>

          <AppText variant="caption" color={theme.colors.text.secondary}>
            Ngưỡng môi trường cần duy trì trong buồng trồng cho giống {selectedMushroom?.name || ''}.
          </AppText>

          <AppDivider spacing="sm" />

          {selectedCondition ? (
            <View style={styles.conditionsGrid}>
              <View style={styles.conditionRow}>
                <View style={styles.conditionLabel}>
                  <Ionicons name="thermometer" size={18} color={theme.colors.warning.main} />
                  <AppText variant="bodySmall">Nhiệt độ:</AppText>
                </View>
                <AppText variant="label" weight="bold">
                  {selectedCondition.temperature_min ?? '—'} - {selectedCondition.temperature_max ?? '—'} °C
                </AppText>
              </View>

              <View style={styles.conditionRow}>
                <View style={styles.conditionLabel}>
                  <Ionicons name="water" size={18} color={theme.colors.primary[500]} />
                  <AppText variant="bodySmall">Độ ẩm không khí:</AppText>
                </View>
                <AppText variant="label" weight="bold">
                  {selectedCondition.humidity_min ?? '—'} - {selectedCondition.humidity_max ?? '—'} %
                </AppText>
              </View>

              <View style={styles.conditionRow}>
                <View style={styles.conditionLabel}>
                  <Ionicons name="cloud-outline" size={18} color={theme.colors.neutral[500]} />
                  <AppText variant="bodySmall">Nồng độ CO₂:</AppText>
                </View>
                <AppText variant="label" weight="bold">
                  {selectedCondition.co2_min ?? '—'} - {selectedCondition.co2_max ?? '—'} ppm
                </AppText>
              </View>
            </View>
          ) : (
            <View style={styles.emptyConditionWrapper}>
              <View style={styles.emptyCondition}>
                <Ionicons name="alert-circle-outline" size={22} color={theme.colors.warning.main} />
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Giống nấm này chưa được thiết lập bảng điều kiện sinh trưởng.
                </AppText>
              </View>
              <AppButton
                title="+ Thiết lập điều kiện vi khí hậu"
                variant="primary"
                size="sm"
                onPress={handleOpenCreate}
              />
            </View>
          )}
        </AppCard>
      </View>

      {/* Modal: Gán / Chỉnh sửa điều kiện vi khí hậu */}
      <MushroomConditionModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        mushroom={selectedMushroom || null}
        existingCondition={isEditingCondition ? selectedCondition || null : null}
        onSuccess={() => {
          loadData();
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing['2xl'],
    gap: theme.spacing.md,
  },
  centerLoading: {
    paddingVertical: theme.spacing['2xl'],
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.sm,
  },
  section: {
    gap: theme.spacing.xs,
  },
  pillsRow: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  pill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  pillActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  mushCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  mushHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  mushImage: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.md,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  mushMeta: {
    flex: 1,
    gap: 2,
  },
  conditionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  conditionsGrid: {
    gap: theme.spacing.sm,
  },
  conditionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  conditionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  emptyCondition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    justifyContent: 'center',
  },
  cardHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardActionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  iconActionBtn: {
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.sm,
  },
  deleteActionBtn: {
    backgroundColor: theme.colors.error.light,
  },
  emptyConditionWrapper: {
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.md,
    alignItems: 'center',
  },
});
