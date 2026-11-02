import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import {
  cultivationRepository,
  MushroomType,
} from '../../../cultivation';
import {
  AppButton,
  AppDivider,
  AppIconButton,
  AppText,
} from '../../../../shared/components';

interface MushroomMultiSelectModalProps {
  visible: boolean;
  onClose: () => void;
  selectedIds: number[];
  lockedIds?: number[]; // Types currently cultivating on the floor (cannot be unselected)
  onConfirm: (selectedIds: number[]) => void;
}

const MushroomMultiSelectModalContent: React.FC<MushroomMultiSelectModalProps> = ({
  visible,
  onClose,
  selectedIds,
  lockedIds = [],
  onConfirm,
}) => {
  const [types, setTypes] = useState<MushroomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSelected, setCurrentSelected] = useState<number[]>(selectedIds);

  useEffect(() => {
    let isMounted = true;
    cultivationRepository
      .getMushroomTypes()
      .then((list) => {
        if (isMounted) {
          setTypes(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) return types;
    const q = searchQuery.toLowerCase().trim();
    return types.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [types, searchQuery]);

  const handleToggle = (id: number) => {
    if (lockedIds.includes(id)) {
      // Cannot uncheck locked types currently cultivating
      return;
    }
    if (currentSelected.includes(id)) {
      setCurrentSelected((prev) => prev.filter((item) => item !== id));
    } else {
      setCurrentSelected((prev) => [...prev, id]);
    }
  };

  const handleConfirm = () => {
    // Ensure all locked IDs are included
    const combined = Array.from(new Set([...currentSelected, ...lockedIds]));
    onConfirm(combined);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <AppText variant="title" weight="bold">
                Chọn loại nấm cho tầng
              </AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Đã chọn {currentSelected.length} loại nấm
              </AppText>
            </View>
            <AppIconButton
              accessibilityLabel="Đóng"
              icon={<Ionicons name="close" size={20} color={theme.colors.text.secondary} />}
              onPress={onClose}
              size="sm"
            />
          </View>

          {/* Search Bar */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={theme.colors.text.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm giống nấm..."
              placeholderTextColor={theme.colors.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={theme.colors.text.muted} />
              </Pressable>
            )}
          </View>

          <AppDivider spacing="xs" />

          {/* List */}
          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="small" color={theme.colors.primary[600]} />
              <AppText variant="caption" color={theme.colors.text.secondary} style={{ marginTop: 6 }}>
                Đang tải danh mục nấm...
              </AppText>
            </View>
          ) : (
            <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
              {filteredTypes.length === 0 ? (
                <View style={styles.emptyBox}>
                  <AppText variant="bodySmall" color={theme.colors.text.muted} align="center">
                    Không tìm thấy giống nấm phù hợp.
                  </AppText>
                </View>
              ) : (
                filteredTypes.map((type) => {
                  const isChecked = currentSelected.includes(type.mushroom_type_id);
                  const isLocked = lockedIds.includes(type.mushroom_type_id);

                  return (
                    <Pressable
                      key={type.mushroom_type_id}
                      onPress={() => handleToggle(type.mushroom_type_id)}
                      style={[
                        styles.itemRow,
                        isChecked && styles.itemRowChecked,
                        isLocked && styles.itemRowLocked,
                      ]}
                    >
                      {/* Checkbox */}
                      <View
                        style={[
                          styles.checkbox,
                          isChecked && styles.checkboxChecked,
                          isLocked && styles.checkboxLocked,
                        ]}
                      >
                        {isChecked && (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={isLocked ? theme.colors.success.dark : '#FFFFFF'}
                          />
                        )}
                      </View>

                      {/* Info */}
                      <View style={styles.itemInfo}>
                        <View style={styles.itemTitleRow}>
                          <AppText variant="bodyMedium" weight="semibold">
                            {type.name}
                          </AppText>
                          {isLocked && (
                            <View style={styles.lockedBadge}>
                              <Ionicons name="leaf" size={11} color={theme.colors.success.dark} />
                              <AppText
                                variant="caption"
                                weight="bold"
                                color={theme.colors.success.dark}
                                style={{ fontSize: 10, marginLeft: 3 }}
                              >
                                Đang trồng
                              </AppText>
                            </View>
                          )}
                        </View>
                        <AppText variant="caption" color={theme.colors.text.secondary} numberOfLines={1}>
                          Chu kỳ: {type.growing_days} ngày • {type.description || 'Giống nấm nông trại'}
                        </AppText>
                        {isLocked && (
                          <AppText variant="caption" color={theme.colors.warning.dark} style={{ fontSize: 10 }}>
                            Đang có phiên trồng trên tầng, bắt buộc duy trì trong cấu hình.
                          </AppText>
                        )}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Footer CTA */}
          <View style={styles.footerRow}>
            <AppButton
              title={`Xác nhận (${currentSelected.length} loại nấm)`}
              variant="primary"
              size="md"
              fullWidth
              disabled={currentSelected.length === 0}
              onPress={handleConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const MushroomMultiSelectModal: React.FC<MushroomMultiSelectModalProps> = (props) => {
  if (!props.visible) return null;
  return <MushroomMultiSelectModalContent key={props.selectedIds.join(',')} {...props} />;
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    maxHeight: '85%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.neutral[300],
    alignSelf: 'center',
    marginBottom: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    marginVertical: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.primary,
    padding: 0,
  },
  listScroll: {
    maxHeight: 380,
    marginVertical: theme.spacing.xs,
  },
  centerLoading: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    backgroundColor: '#FFFFFF',
    gap: theme.spacing.sm,
  },
  itemRowChecked: {
    borderColor: theme.colors.primary[500],
    backgroundColor: 'rgba(34, 197, 94, 0.04)',
  },
  itemRowLocked: {
    borderColor: 'rgba(34, 197, 94, 0.3)',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.neutral[400],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  checkboxLocked: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: theme.colors.success.dark,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.borderRadius.full,
  },
  footerRow: {
    marginTop: theme.spacing.sm,
  },
});
