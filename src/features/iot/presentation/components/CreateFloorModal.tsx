import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import { FloorMapping, IotMaster } from '../../domain/entities/Iot';
import {
  AppButton,
  AppDivider,
  AppIconButton,
  AppInput,
  AppText,
} from '../../../../shared/components';

interface CreateFloorModalProps {
  visible: boolean;
  onClose: () => void;
  roomId: number;
  masters: IotMaster[];
  editingFloor?: FloorMapping | null;
  onSave: (floor: FloorMapping) => Promise<void>;
  loading?: boolean;
}

const CreateFloorModalContent: React.FC<CreateFloorModalProps> = ({
  visible,
  onClose,
  roomId,
  masters,
  editingFloor,
  onSave,
  loading = false,
}) => {
  const [floorName, setFloorName] = useState(
    editingFloor?.floor_name || (editingFloor ? '' : 'Tầng 1')
  );
  const [floorNumber, setFloorNumber] = useState(
    String(editingFloor?.floor_number ?? 1)
  );
  const [masterId, setMasterId] = useState(
    String(editingFloor?.master_id ?? (masters[0]?.id || ''))
  );
  const [nodeAddress, setNodeAddress] = useState(
    String(editingFloor?.node_address ?? 1)
  );
  const [ssrChannel, setSsrChannel] = useState(
    String(editingFloor?.misting_ssr_channel ?? 1)
  );
  const [totalRows, setTotalRows] = useState(
    editingFloor?.total_rows != null ? String(editingFloor.total_rows) : (editingFloor ? '' : '3')
  );
  const [totalColumns, setTotalColumns] = useState(
    editingFloor?.total_columns != null ? String(editingFloor.total_columns) : (editingFloor ? '' : '4')
  );
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(
    editingFloor?.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!floorName.trim()) {
      errs.floorName = 'Vui lòng nhập tên tầng.';
    }
    const fn = Number(floorNumber);
    if (isNaN(fn) || fn < 1) {
      errs.floorNumber = 'Số thứ tự tầng phải >= 1.';
    }
    const mid = Number(masterId);
    if (isNaN(mid) || mid < 1) {
      errs.masterId = 'Vui lòng chọn Master Gateway hợp lệ.';
    }
    const na = Number(nodeAddress);
    if (isNaN(na) || na < 1 || na > 255) {
      errs.nodeAddress = 'Địa chỉ Node từ 1 đến 255.';
    }
    const ch = Number(ssrChannel);
    if (isNaN(ch) || ch < 1 || ch > 8) {
      errs.ssrChannel = 'Kênh SSR từ 1 đến 8.';
    }

    if (totalRows.trim()) {
      const tr = Number(totalRows);
      if (isNaN(tr) || tr < 1 || tr > 32767) {
        errs.totalRows = 'Số hàng từ 1 đến 32767.';
      }
    }
    if (totalColumns.trim()) {
      const tc = Number(totalColumns);
      if (isNaN(tc) || tc < 1 || tc > 32767) {
        errs.totalColumns = 'Số cột từ 1 đến 32767.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const payload: FloorMapping = {
      room_id: Number(roomId),
      floor_number: Number(floorNumber),
      floor_name: floorName.trim(),
      master_id: Number(masterId),
      node_address: Number(nodeAddress),
      misting_ssr_channel: Number(ssrChannel),
      status,
      total_rows: totalRows.trim() ? Number(totalRows) : null,
      total_columns: totalColumns.trim() ? Number(totalColumns) : null,
    };

    if (editingFloor?.id || editingFloor?.floor_id) {
      payload.id = editingFloor.id ?? editingFloor.floor_id;
      payload.floor_id = editingFloor.floor_id ?? editingFloor.id;
    }

    await onSave(payload);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          <View style={styles.headerRow}>
            <View>
              <AppText variant="title" weight="bold">
                {editingFloor ? 'Chỉnh sửa cấu hình tầng' : 'Thêm tầng nuôi trồng mới'}
              </AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Thiết lập phần cứng và lưới tọa độ khay
              </AppText>
            </View>
            <AppIconButton
              accessibilityLabel="Đóng"
              icon={<Ionicons name="close" size={20} color={theme.colors.text.secondary} />}
              onPress={onClose}
              size="sm"
            />
          </View>

          <AppDivider spacing="xs" />

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <AppInput
              label="Tên tầng"
              value={floorName}
              onChangeText={setFloorName}
              placeholder="VD: Tầng 1 (Khu sinh trưởng A)"
              error={errors.floorName}
            />

            <View style={styles.inputsGrid}>
              <View style={styles.inputCol}>
                <AppInput
                  label="Số thứ tự tầng"
                  value={floorNumber}
                  onChangeText={setFloorNumber}
                  keyboardType="numeric"
                  error={errors.floorNumber}
                />
              </View>
              <View style={styles.inputCol}>
                <AppInput
                  label="Trạng thái"
                  value={status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngưng'}
                  editable={false}
                  rightIcon={
                    <Pressable onPress={() => setStatus((prev) => (prev === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'))}>
                      <Ionicons name="swap-horizontal" size={20} color={theme.colors.primary[600]} />
                    </Pressable>
                  }
                />
              </View>
            </View>

            {/* Hardware Mapping */}
            <AppText variant="caption" weight="bold" color={theme.colors.text.primary} style={{ marginTop: 4 }}>
              Cấu hình phần cứng IoT
            </AppText>

            {/* Masters picker */}
            <View style={styles.masterPickerBox}>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                Master Gateway phụ trách:
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.masterPillsRow}>
                {masters.map((m) => {
                  const isSelected = String(m.id) === masterId;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setMasterId(String(m.id))}
                      style={[styles.masterPill, isSelected && styles.masterPillSelected]}
                    >
                      <AppText
                        variant="caption"
                        weight={isSelected ? 'bold' : 'normal'}
                        color={isSelected ? '#FFFFFF' : theme.colors.text.primary}
                      >
                        {m.masterId || `Master #${m.id}`}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {errors.masterId && (
                <AppText variant="caption" color={theme.colors.error.main}>
                  {errors.masterId}
                </AppText>
              )}
            </View>

            <View style={styles.inputsGrid}>
              <View style={styles.inputCol}>
                <AppInput
                  label="Địa chỉ Node (1-255)"
                  value={nodeAddress}
                  onChangeText={setNodeAddress}
                  keyboardType="numeric"
                  error={errors.nodeAddress}
                />
              </View>
              <View style={styles.inputCol}>
                <AppInput
                  label="Kênh SSR van phun (1-8)"
                  value={ssrChannel}
                  onChangeText={setSsrChannel}
                  keyboardType="numeric"
                  error={errors.ssrChannel}
                />
              </View>
            </View>

            {/* Grid dimensions */}
            <AppText variant="caption" weight="bold" color={theme.colors.text.primary} style={{ marginTop: 4 }}>
              Kích thước ma trận lưới khay (Tùy chọn)
            </AppText>
            <View style={styles.inputsGrid}>
              <View style={styles.inputCol}>
                <AppInput
                  label="Số hàng (Rows)"
                  value={totalRows}
                  onChangeText={setTotalRows}
                  placeholder="VD: 3"
                  keyboardType="numeric"
                  error={errors.totalRows}
                />
              </View>
              <View style={styles.inputCol}>
                <AppInput
                  label="Số cột (Columns)"
                  value={totalColumns}
                  onChangeText={setTotalColumns}
                  placeholder="VD: 4"
                  keyboardType="numeric"
                  error={errors.totalColumns}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footerRow}>
            <AppButton
              title={editingFloor ? 'Cập nhật tầng' : 'Tạo tầng mới'}
              variant="primary"
              size="md"
              fullWidth
              loading={loading}
              onPress={handleSave}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const CreateFloorModal: React.FC<CreateFloorModalProps> = (props) => {
  if (!props.visible) return null;
  return <CreateFloorModalContent key={props.editingFloor?.id ? String(props.editingFloor.id) : 'new'} {...props} />;
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
  scrollBody: {
    marginVertical: theme.spacing.xs,
  },
  inputsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  inputCol: {
    flex: 1,
  },
  masterPickerBox: {
    gap: 4,
    marginVertical: 4,
  },
  masterPillsRow: {
    gap: 6,
    paddingVertical: 2,
  },
  masterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    backgroundColor: theme.colors.neutral[100],
  },
  masterPillSelected: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  footerRow: {
    paddingTop: theme.spacing.xs,
  },
});
