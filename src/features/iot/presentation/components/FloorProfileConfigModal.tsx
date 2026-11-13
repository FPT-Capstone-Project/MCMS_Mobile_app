import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import {
  cultivationRepository,
  MushroomCondition,
  MushroomType,
} from '../../../cultivation';
import {
  AutoControlSuggestions,
  AutoMistingConfig,
  FloorMapping,
} from '../../domain/entities/Iot';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppIconButton,
  AppInput,
  AppText,
} from '../../../../shared/components';
import { MushroomMultiSelectModal } from './MushroomMultiSelectModal';

interface FloorProfileConfigModalProps {
  visible: boolean;
  onClose: () => void;
  floor: FloorMapping;
  initialConfig?: AutoMistingConfig | null;
  suggestion?: AutoControlSuggestions | null;
  activeMushroomIds?: number[]; // Types currently cultivating on this floor
  onSave: (config: AutoMistingConfig, mushroomTypeIds: number[]) => Promise<void>;
  loading?: boolean;
}

const FloorProfileConfigModalContent: React.FC<FloorProfileConfigModalProps> = ({
  visible,
  onClose,
  floor,
  initialConfig,
  suggestion,
  activeMushroomIds = [],
  onSave,
  loading = false,
}) => {
  // Modal state
  const [selectMushroomModalVisible, setSelectMushroomModalVisible] = useState(false);
  const [allMushroomTypes, setAllMushroomTypes] = useState<MushroomType[]>([]);

  // Selected mushroom types for the floor profile
  const initialSelectedIds = useMemo(() => {
    let initialIds: number[] = [];
    if (initialConfig?.source_profiles && initialConfig.source_profiles.length > 0) {
      initialIds = initialConfig.source_profiles
        .map((p) => p.mushroom_type_id)
        .filter((id): id is number => typeof id === 'number' && id > 0);
    } else if (initialConfig?.mushroom_type_ids && initialConfig.mushroom_type_ids.length > 0) {
      initialIds = initialConfig.mushroom_type_ids;
    }
    return Array.from(new Set([...initialIds, ...activeMushroomIds]));
  }, [initialConfig, activeMushroomIds]);

  const [selectedMushroomIds, setSelectedMushroomIds] = useState<number[]>(initialSelectedIds);
  const [computingCommon, setComputingCommon] = useState(false);
  const [commonPreview, setCommonPreview] = useState<{
    minTemp?: number;
    maxTemp?: number;
    minHum?: number;
    maxHum?: number;
    hasConflict?: boolean;
    conflictReason?: string;
  } | null>(null);

  // Form Fields
  const cfg = initialConfig;
  const [profileName, setProfileName] = useState(
    cfg?.profile_name || `Cấu hình ${floor.floor_name || `Tầng ${floor.floor_number}`}`
  );
  const [profileApproved, setProfileApproved] = useState(Boolean(cfg?.profile_approved));

  // Humidity
  const [humMin, setHumMin] = useState(cfg?.humidity_min != null ? String(cfg.humidity_min) : '85');
  const [humMax, setHumMax] = useState(cfg?.humidity_max != null ? String(cfg.humidity_max) : '95');
  const [humStart, setHumStart] = useState(
    cfg?.humidity_start_threshold != null ? String(cfg.humidity_start_threshold) : '85'
  );
  const [humStop, setHumStop] = useState(
    cfg?.humidity_stop_threshold != null ? String(cfg.humidity_stop_threshold) : '90'
  );

  // Cooling
  const [coolingEnabled, setCoolingEnabled] = useState(Boolean(cfg?.cooling_enabled ?? true));
  const [tempMin, setTempMin] = useState(cfg?.temperature_min != null ? String(cfg.temperature_min) : '24');
  const [tempMax, setTempMax] = useState(cfg?.temperature_max != null ? String(cfg.temperature_max) : '28');
  const [tempStart, setTempStart] = useState(
    cfg?.temperature_start_threshold != null ? String(cfg.temperature_start_threshold) : '28'
  );
  const [tempStop, setTempStop] = useState(
    cfg?.temperature_stop_threshold != null ? String(cfg.temperature_stop_threshold) : '26'
  );
  const [coolingHumLimit, setCoolingHumLimit] = useState(
    cfg?.cooling_humidity_limit != null ? String(cfg.cooling_humidity_limit) : '94'
  );

  // Advanced Timings (inputs in seconds)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pulseSec, setPulseSec] = useState(
    cfg?.misting_pulse_ms != null ? String(Math.round(cfg.misting_pulse_ms / 1000)) : '3'
  );
  const [cooldownSec, setCooldownSec] = useState(
    cfg?.cooldown_ms != null ? String(Math.round(cfg.cooldown_ms / 1000)) : '60'
  );
  const [evalSec, setEvalSec] = useState(
    cfg?.evaluation_interval_ms != null ? String(Math.round(cfg.evaluation_interval_ms / 1000)) : '5'
  );
  const [maxActivationsHour, setMaxActivationsHour] = useState(
    cfg?.max_activations_per_hour != null ? String(cfg.max_activations_per_hour) : '20'
  );
  const [maxCumulativeSecHour, setMaxCumulativeSecHour] = useState(
    cfg?.max_cumulative_on_ms_per_hour != null
      ? String(Math.round(cfg.max_cumulative_on_ms_per_hour / 1000))
      : '200'
  );
  const [sensorMaxAgeSec, setSensorMaxAgeSec] = useState(
    cfg?.sensor_max_age_ms != null ? String(Math.round(cfg.sensor_max_age_ms / 1000)) : '20'
  );
  const [requiredSensors, setRequiredSensors] = useState(
    cfg?.required_valid_sensors != null ? String(cfg.required_valid_sensors) : '3'
  );
  const [maxSensorSpread, setMaxSensorSpread] = useState(
    cfg?.max_sensor_spread_percent != null ? String(cfg.max_sensor_spread_percent) : '10'
  );
  const [maxTempSpread, setMaxTempSpread] = useState(
    cfg?.max_temperature_spread_c != null ? String(cfg.max_temperature_spread_c) : '3'
  );

  // Errors map
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load mushroom types catalog on mount
  useEffect(() => {
    let isMounted = true;
    cultivationRepository
      .getMushroomTypes()
      .then((types) => {
        if (isMounted) setAllMushroomTypes(types);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute common intersection preview whenever selected mushroom IDs change
  useEffect(() => {
    let isMounted = true;

    void (async () => {
      if (selectedMushroomIds.length === 0) {
        if (isMounted) {
          setCommonPreview(null);
          setComputingCommon(false);
        }
        return;
      }

      if (isMounted) setComputingCommon(true);

      try {
        const conditionsResults = await Promise.allSettled(
          selectedMushroomIds.map((id) => cultivationRepository.getMushroomConditions(id))
        );

        if (!isMounted) return;

        const allConditions: MushroomCondition[] = conditionsResults.flatMap((r) =>
          r.status === 'fulfilled' && r.value.length > 0 ? r.value[0] : []
        );

        if (allConditions.length === 0) {
          setCommonPreview(null);
          return;
        }

        const validTempMins = allConditions
          .map((c) => c.temperature_min)
          .filter((v): v is number => v != null);
        const validTempMaxs = allConditions
          .map((c) => c.temperature_max)
          .filter((v): v is number => v != null);
        const validHumMins = allConditions
          .map((c) => c.humidity_min)
          .filter((v): v is number => v != null);
        const validHumMaxs = allConditions
          .map((c) => c.humidity_max)
          .filter((v): v is number => v != null);

        const minTemp = validTempMins.length > 0 ? Math.max(...validTempMins) : undefined;
        const maxTemp = validTempMaxs.length > 0 ? Math.min(...validTempMaxs) : undefined;
        const minHum = validHumMins.length > 0 ? Math.max(...validHumMins) : undefined;
        const maxHum = validHumMaxs.length > 0 ? Math.min(...validHumMaxs) : undefined;

        let hasConflict = false;
        let conflictReason = '';

        if (minTemp != null && maxTemp != null && minTemp >= maxTemp) {
          hasConflict = true;
          conflictReason += `Xung đột nhiệt độ: Min chung (${minTemp}°C) >= Max chung (${maxTemp}°C). `;
        }
        if (minHum != null && maxHum != null && minHum >= maxHum) {
          hasConflict = true;
          conflictReason += `Xung đột độ ẩm: Min chung (${minHum}%) >= Max chung (${maxHum}%). `;
        }

        setCommonPreview({
          minTemp,
          maxTemp,
          minHum,
          maxHum,
          hasConflict,
          conflictReason: conflictReason.trim(),
        });
      } catch {
        if (isMounted) setCommonPreview(null);
      } finally {
        if (isMounted) setComputingCommon(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [selectedMushroomIds]);

  const handleApplyCommonPreview = () => {
    if (!commonPreview || commonPreview.hasConflict) return;
    if (commonPreview.minHum != null && commonPreview.maxHum != null) {
      setHumMin(String(commonPreview.minHum));
      setHumMax(String(commonPreview.maxHum));
      setHumStart(String(commonPreview.minHum));
      const midHum = Math.round(((commonPreview.minHum + commonPreview.maxHum) / 2) * 10) / 10;
      setHumStop(String(midHum));
    }
    if (commonPreview.minTemp != null && commonPreview.maxTemp != null) {
      setTempMin(String(commonPreview.minTemp));
      setTempMax(String(commonPreview.maxTemp));
      setTempStart(String(commonPreview.maxTemp));
      const midTemp = Math.round(((commonPreview.minTemp + commonPreview.maxTemp) / 2) * 10) / 10;
      setTempStop(String(midTemp));
      if (commonPreview.maxHum != null) {
        setCoolingHumLimit(String(Math.max(commonPreview.maxHum - 1, commonPreview.minHum || 80)));
      }
    }
    // Any change requires re-approval
    setProfileApproved(false);
  };

  const handleRemoveMushroom = (id: number) => {
    if (activeMushroomIds.includes(id)) {
      Alert.alert(
        'Không thể xóa',
        'Loại nấm này đang có phiên trồng thực tế trên tầng. Cấu hình tầng phải bao gồm tất cả các loại nấm đang trồng.'
      );
      return;
    }
    setSelectedMushroomIds((prev) => prev.filter((item) => item !== id));
    setProfileApproved(false);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (selectedMushroomIds.length === 0) {
      errs.mushrooms = 'Phải chọn ít nhất 1 loại nấm cho tầng.';
    }

    if (!profileName.trim()) {
      errs.profileName = 'Vui lòng nhập tên cấu hình profile.';
    }

    const nHumMin = Number(humMin);
    const nHumMax = Number(humMax);
    const nHumStart = Number(humStart);
    const nHumStop = Number(humStop);

    if (isNaN(nHumMin) || nHumMin < 30 || nHumMin > 100) {
      errs.humMin = 'Độ ẩm min từ 30% đến 100%.';
    }
    if (isNaN(nHumMax) || nHumMax < 30 || nHumMax > 100) {
      errs.humMax = 'Độ ẩm max từ 30% đến 100%.';
    }
    if (nHumMin >= nHumMax) {
      errs.humMax = 'Độ ẩm max phải lớn hơn độ ẩm min.';
    }
    if (isNaN(nHumStart) || nHumStart < nHumMin) {
      errs.humStart = 'Ngưỡng bật phun không được nhỏ hơn độ ẩm min.';
    }
    if (isNaN(nHumStop) || nHumStop <= nHumStart || nHumStop > nHumMax) {
      errs.humStop = 'Ngưỡng tắt phun phải lớn hơn ngưỡng bật và <= max.';
    }

    if (coolingEnabled) {
      const nTempMin = Number(tempMin);
      const nTempMax = Number(tempMax);
      const nTempStart = Number(tempStart);
      const nTempStop = Number(tempStop);
      const nCoolHumLimit = Number(coolingHumLimit);

      if (isNaN(nTempMin) || nTempMin < 0 || nTempMin > 50) {
        errs.tempMin = 'Nhiệt độ min từ 0°C đến 50°C.';
      }
      if (isNaN(nTempMax) || nTempMax < 0 || nTempMax > 50) {
        errs.tempMax = 'Nhiệt độ max từ 0°C đến 50°C.';
      }
      if (nTempMin >= nTempMax) {
        errs.tempMax = 'Nhiệt độ max phải lớn hơn nhiệt độ min.';
      }
      if (isNaN(nTempStart) || nTempStart > nTempMax) {
        errs.tempStart = 'Ngưỡng bật làm mát không được vượt nhiệt độ max.';
      }
      if (isNaN(nTempStop) || nTempStop >= nTempStart || nTempStop < nTempMin) {
        errs.tempStop = 'Ngưỡng tắt làm mát phải nhỏ hơn ngưỡng bật và >= min.';
      }
      if (isNaN(nCoolHumLimit) || nCoolHumLimit > nHumMax) {
        errs.coolingHumLimit = 'Trần độ ẩm làm mát không được vượt độ ẩm max.';
      }
    }

    if (!profileApproved) {
      errs.approved = 'Bạn cần xác nhận phê duyệt cấu hình trước khi lưu.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    const payload: AutoMistingConfig = {
      config_source: 'FLOOR',
      profile_name: profileName.trim(),
      profile_approved: true,
      humidity_min: Number(humMin),
      humidity_max: Number(humMax),
      humidity_start_threshold: Number(humStart),
      humidity_stop_threshold: Number(humStop),
      cooling_enabled: coolingEnabled,
      misting_pulse_ms: Math.max(1000, Number(pulseSec) * 1000),
      cooldown_ms: Math.max(5000, Number(cooldownSec) * 1000),
      evaluation_interval_ms: Math.max(1000, Number(evalSec) * 1000),
      max_activations_per_hour: Number(maxActivationsHour) || 20,
      max_cumulative_on_ms_per_hour: (Number(maxCumulativeSecHour) || 200) * 1000,
      sensor_max_age_ms: (Number(sensorMaxAgeSec) || 20) * 1000,
      required_valid_sensors: Number(requiredSensors) || 3,
      max_sensor_spread_percent: Number(maxSensorSpread) || 10,
    };

    if (coolingEnabled) {
      payload.temperature_min = Number(tempMin);
      payload.temperature_max = Number(tempMax);
      payload.temperature_start_threshold = Number(tempStart);
      payload.temperature_stop_threshold = Number(tempStop);
      payload.cooling_humidity_limit = Number(coolingHumLimit);
      payload.max_temperature_spread_c = Number(maxTempSpread) || 3;
    }

    await onSave(payload, selectedMushroomIds);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <AppText variant="h3" weight="bold">
                Cấu hình AUTO Phun Sương
              </AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                {floor.floor_name} (Tầng {floor.floor_number}) • Cấu hình FLOOR
              </AppText>
            </View>
            <AppIconButton
              accessibilityLabel="Đóng"
              icon={<Ionicons name="close" size={22} color={theme.colors.text.secondary} />}
              onPress={onClose}
              size="sm"
            />
          </View>

          <AppDivider spacing="xs" />

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* GROUP 1: LOẠI NẤM */}
            <AppCard elevation="xs" style={styles.groupCard}>
              <View style={styles.groupHeaderRow}>
                <Ionicons name="leaf" size={18} color={theme.colors.primary[600]} />
                <AppText variant="label" weight="bold">
                  1. LOẠI NẤM ĐƯỢC CHĂM SÓC TRÊN TẦNG ({selectedMushroomIds.length})
                </AppText>
              </View>

              <AppText variant="caption" color={theme.colors.text.secondary}>
                Cấu hình chung cho tầng có thể lưu trước khi có phiên trồng. Nếu tầng đã có phiên, loại nấm đang trồng sẽ được khóa bảo vệ.
              </AppText>

              {/* Selected Mushroom Chips */}
              <View style={styles.chipsRow}>
                {selectedMushroomIds.map((id) => {
                  const mType = allMushroomTypes.find((t) => t.mushroom_type_id === id);
                  const isLocked = activeMushroomIds.includes(id);

                  return (
                    <View
                      key={id}
                      style={[
                        styles.mushroomChip,
                        isLocked ? styles.mushroomChipLocked : styles.mushroomChipSelected,
                      ]}
                    >
                      <Ionicons
                        name={isLocked ? 'leaf' : 'checkmark-circle'}
                        size={14}
                        color={isLocked ? theme.colors.success.dark : theme.colors.primary[700]}
                      />
                      <AppText
                        variant="caption"
                        weight="semibold"
                        color={isLocked ? theme.colors.success.dark : theme.colors.text.primary}
                        style={{ marginLeft: 4 }}
                      >
                        {mType?.name || `Nấm #${id}`}
                        {isLocked ? ' · Đang trồng' : ' · Đã duyệt'}
                      </AppText>

                      {!isLocked && (
                        <Pressable
                          onPress={() => handleRemoveMushroom(id)}
                          style={styles.chipRemoveBtn}
                        >
                          <Ionicons name="close" size={14} color={theme.colors.text.muted} />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>

              {errors.mushrooms && (
                <AppText variant="caption" color={theme.colors.error.main} weight="bold">
                  {errors.mushrooms}
                </AppText>
              )}

              <AppButton
                title="+ Thêm / Thay đổi loại nấm"
                variant="outline"
                size="sm"
                onPress={() => setSelectMushroomModalVisible(true)}
                style={{ marginTop: 4 }}
              />

              {/* Common Intersection Preview */}
              {computingCommon ? (
                <View style={styles.previewLoadingBox}>
                  <ActivityIndicator size="small" color={theme.colors.primary[600]} />
                  <AppText variant="caption" color={theme.colors.text.secondary} style={{ marginLeft: 6 }}>
                    Đang tính toán khoảng giao thoa sinh học từ danh mục nấm...
                  </AppText>
                </View>
              ) : commonPreview ? (
                <View
                  style={[
                    styles.previewBanner,
                    commonPreview.hasConflict && styles.previewBannerConflict,
                  ]}
                >
                  <Ionicons
                    name={commonPreview.hasConflict ? 'alert-circle' : 'sparkles'}
                    size={16}
                    color={commonPreview.hasConflict ? theme.colors.error.main : theme.colors.primary[700]}
                  />
                  <View style={{ flex: 1 }}>
                    <AppText
                      variant="caption"
                      weight="bold"
                      color={commonPreview.hasConflict ? theme.colors.error.dark : theme.colors.primary[800]}
                    >
                      {commonPreview.hasConflict
                        ? 'Cảnh báo xung đột khoảng điều kiện!'
                        : 'Gợi ý khoảng chung giữa các loại nấm đã chọn:'}
                    </AppText>
                    <AppText
                      variant="caption"
                      color={commonPreview.hasConflict ? theme.colors.error.main : theme.colors.text.secondary}
                      style={{ marginTop: 2 }}
                    >
                      {commonPreview.hasConflict
                        ? commonPreview.conflictReason
                        : `Nhiệt độ: ${commonPreview.minTemp ?? '--'}°C - ${commonPreview.maxTemp ?? '--'}°C • Độ ẩm: ${commonPreview.minHum ?? '--'}% - ${commonPreview.maxHum ?? '--'}%`}
                    </AppText>

                    {!commonPreview.hasConflict && (
                      <AppButton
                        title="Áp dụng khoảng gợi ý vào form"
                        variant="ghost"
                        size="sm"
                        onPress={handleApplyCommonPreview}
                        style={{ alignSelf: 'flex-start', marginTop: 4 }}
                      />
                    )}
                  </View>
                </View>
              ) : null}
            </AppCard>

            {/* GROUP 2: ĐIỀU KIỆN CHĂM SÓC */}
            <AppCard elevation="xs" style={styles.groupCard}>
              <View style={styles.groupHeaderRow}>
                <Ionicons name="water" size={18} color="#0EA5E9" />
                <AppText variant="label" weight="bold">
                  2. ĐIỀU KIỆN ĐỘ ẨM & LÀM MÁT
                </AppText>
              </View>

              {/* Humidity Inputs */}
              <AppText variant="caption" weight="bold" color={theme.colors.text.primary}>
                Độ ẩm buồng nuôi (%)
              </AppText>
              <View style={styles.inputsGrid}>
                <View style={styles.inputCol}>
                  <AppInput
                    label="Độ ẩm Min (%)"
                    value={humMin}
                    onChangeText={(v) => {
                      setHumMin(v);
                      setProfileApproved(false);
                    }}
                    keyboardType="numeric"
                    error={errors.humMin}
                  />
                </View>
                <View style={styles.inputCol}>
                  <AppInput
                    label="Độ ẩm Max (%)"
                    value={humMax}
                    onChangeText={(v) => {
                      setHumMax(v);
                      setProfileApproved(false);
                    }}
                    keyboardType="numeric"
                    error={errors.humMax}
                  />
                </View>
              </View>

              <View style={styles.inputsGrid}>
                <View style={styles.inputCol}>
                  <AppInput
                    label="Bật phun khi < (%)"
                    value={humStart}
                    onChangeText={(v) => {
                      setHumStart(v);
                      setProfileApproved(false);
                    }}
                    keyboardType="numeric"
                    error={errors.humStart}
                  />
                </View>
                <View style={styles.inputCol}>
                  <AppInput
                    label="Ngừng phun khi >= (%)"
                    value={humStop}
                    onChangeText={(v) => {
                      setHumStop(v);
                      setProfileApproved(false);
                    }}
                    keyboardType="numeric"
                    error={errors.humStop}
                  />
                </View>
              </View>

              <AppDivider spacing="xs" />

              {/* Cooling Toggle */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="label" weight="semibold">
                    Kích hoạt chế độ làm mát bằng sương
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Tự động phun giảm nhiệt khi nhiệt độ buồng tăng cao
                  </AppText>
                </View>
                <Switch
                  value={coolingEnabled}
                  onValueChange={(v) => {
                    setCoolingEnabled(v);
                    setProfileApproved(false);
                  }}
                  trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary[500] }}
                />
              </View>

              {coolingEnabled && (
                <View style={styles.coolingBox}>
                  <AppText variant="caption" weight="bold" color={theme.colors.text.primary}>
                    Ngưỡng nhiệt độ làm mát (°C)
                  </AppText>
                  <View style={styles.inputsGrid}>
                    <View style={styles.inputCol}>
                      <AppInput
                        label="Nhiệt độ Min (°C)"
                        value={tempMin}
                        onChangeText={(v) => {
                          setTempMin(v);
                          setProfileApproved(false);
                        }}
                        keyboardType="numeric"
                        error={errors.tempMin}
                      />
                    </View>
                    <View style={styles.inputCol}>
                      <AppInput
                        label="Nhiệt độ Max (°C)"
                        value={tempMax}
                        onChangeText={(v) => {
                          setTempMax(v);
                          setProfileApproved(false);
                        }}
                        keyboardType="numeric"
                        error={errors.tempMax}
                      />
                    </View>
                  </View>

                  <View style={styles.inputsGrid}>
                    <View style={styles.inputCol}>
                      <AppInput
                        label="Bật làm mát khi >= (°C)"
                        value={tempStart}
                        onChangeText={(v) => {
                          setTempStart(v);
                          setProfileApproved(false);
                        }}
                        keyboardType="numeric"
                        error={errors.tempStart}
                      />
                    </View>
                    <View style={styles.inputCol}>
                      <AppInput
                        label="Tắt làm mát khi <= (°C)"
                        value={tempStop}
                        onChangeText={(v) => {
                          setTempStop(v);
                          setProfileApproved(false);
                        }}
                        keyboardType="numeric"
                        error={errors.tempStop}
                      />
                    </View>
                  </View>

                  <AppInput
                    label="Trần độ ẩm làm mát (%)"
                    value={coolingHumLimit}
                    onChangeText={(v) => {
                      setCoolingHumLimit(v);
                      setProfileApproved(false);
                    }}
                    keyboardType="numeric"
                    helperText="Nếu độ ẩm vượt trần này, van sẽ khóa để tránh làm ngập úng nấm"
                    error={errors.coolingHumLimit}
                  />
                </View>
              )}
            </AppCard>

            {/* GROUP 3: NHỊP PHUN VÀ GIỚI HẠN AN TOÀN */}
            <AppCard elevation="xs" style={styles.groupCard}>
              <Pressable
                onPress={() => setShowAdvanced((prev) => !prev)}
                style={styles.expandableHeaderRow}
              >
                <View style={styles.groupHeaderRow}>
                  <Ionicons name="timer" size={18} color="#F59E0B" />
                  <AppText variant="label" weight="bold">
                    3. NHỊP PHUN & GIỚI HẠN AN TOÀN
                  </AppText>
                </View>
                <Ionicons
                  name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.colors.text.secondary}
                />
              </Pressable>

              {showAdvanced && (
                <View style={{ gap: theme.spacing.sm, marginTop: 4 }}>
                  <View style={styles.inputsGrid}>
                    <View style={styles.inputCol}>
                      <AppInput
                        label="Xung phun (giây)"
                        value={pulseSec}
                        onChangeText={(v) => {
                          setPulseSec(v);
                          setProfileApproved(false);
                        }}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.inputCol}>
                      <AppInput
                        label="Thời gian nghỉ (giây)"
                        value={cooldownSec}
                        onChangeText={(v) => {
                          setCooldownSec(v);
                          setProfileApproved(false);
                        }}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.inputsGrid}>
                    <View style={styles.inputCol}>
                      <AppInput
                        label="Chu kỳ đánh giá (giây)"
                        value={evalSec}
                        onChangeText={(v) => {
                          setEvalSec(v);
                          setProfileApproved(false);
                        }}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.inputCol}>
                      <AppInput
                        label="Tối đa lượt phun / giờ"
                        value={maxActivationsHour}
                        onChangeText={(v) => {
                          setMaxActivationsHour(v);
                          setProfileApproved(false);
                        }}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.inputsGrid}>
                    <View style={styles.inputCol}>
                      <AppInput
                        label="Tổng thời gian phun/h (giây)"
                        value={maxCumulativeSecHour}
                        onChangeText={(v) => {
                          setMaxCumulativeSecHour(v);
                          setProfileApproved(false);
                        }}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.inputCol}>
                      <AppInput
                        label="Tuổi mẫu cảm biến max (giây)"
                        value={sensorMaxAgeSec}
                        onChangeText={(v) => {
                          setSensorMaxAgeSec(v);
                          setProfileApproved(false);
                        }}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.inputsGrid}>
                    <View style={styles.inputCol}>
                      <AppInput
                        label="Số cảm biến hợp lệ tối thiểu"
                        value={requiredSensors}
                        onChangeText={(v) => {
                          setRequiredSensors(v);
                          setProfileApproved(false);
                        }}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.inputCol}>
                      <AppInput
                        label="Chênh lệch độ ẩm max (%)"
                        value={maxSensorSpread}
                        onChangeText={(v) => {
                          setMaxSensorSpread(v);
                          setProfileApproved(false);
                        }}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.inputsGrid}>
                    <View style={styles.inputCol}>
                      <AppInput
                        label="Chênh lệch nhiệt độ max (°C)"
                        value={maxTempSpread}
                        onChangeText={(v) => {
                          setMaxTempSpread(v);
                          setProfileApproved(false);
                        }}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.inputCol} />
                  </View>
                </View>
              )}
            </AppCard>

            {/* GROUP 4: DUYỆT CẤU HÌNH */}
            <AppCard elevation="xs" style={styles.groupCard}>
              <View style={styles.groupHeaderRow}>
                <Ionicons name="shield-checkmark" size={18} color={theme.colors.success.dark} />
                <AppText variant="label" weight="bold">
                  4. PHÊ DUYỆT & ĐẶT TÊN CẤU HÌNH
                </AppText>
              </View>

              <AppInput
                label="Tên hồ sơ cấu hình"
                value={profileName}
                onChangeText={(v) => {
                  setProfileName(v);
                  setProfileApproved(false);
                }}
                placeholder="VD: Cấu hình tầng 1 vụ mùa đông"
                error={errors.profileName}
              />

              {/* Approval Checkbox */}
              <Pressable
                onPress={() => setProfileApproved((prev) => !prev)}
                style={[
                  styles.approvalCheckboxRow,
                  profileApproved && styles.approvalCheckboxRowApproved,
                ]}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    profileApproved && styles.checkboxBoxApproved,
                  ]}
                >
                  {profileApproved && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySmall" weight="semibold">
                    Tôi đã kiểm tra và phê duyệt cấu hình chăm sóc này
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Bắt buộc phê duyệt trước khi lưu. Khi lưu, cấu hình sẽ có hiệu lực ngay cho tầng nhưng KHÔNG tự động bật thiết bị.
                  </AppText>
                </View>
              </Pressable>

              {errors.approved && (
                <AppText variant="caption" color={theme.colors.error.main} weight="bold">
                  {errors.approved}
                </AppText>
              )}
            </AppCard>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer Save Button */}
          <View style={styles.footerRow}>
            <AppButton
              title="Lưu cấu hình tầng"
              variant="primary"
              size="md"
              fullWidth
              loading={loading}
              disabled={loading || selectedMushroomIds.length === 0 || !profileApproved}
              onPress={handleSave}
            />
          </View>
        </View>
      </View>

      {/* Mushroom Multi-select Modal */}
      <MushroomMultiSelectModal
        visible={selectMushroomModalVisible}
        onClose={() => setSelectMushroomModalVisible(false)}
        selectedIds={selectedMushroomIds}
        lockedIds={activeMushroomIds}
        onConfirm={(ids) => {
          setSelectedMushroomIds(ids);
          setProfileApproved(false);
        }}
      />
    </Modal>
  );
};

export const FloorProfileConfigModal: React.FC<FloorProfileConfigModalProps> = (props) => {
  if (!props.visible) return null;
  return (
    <FloorProfileConfigModalContent
      key={`${props.floor.floor_id}-${props.initialConfig?.id ?? 'new'}`}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    maxHeight: '92%',
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
  },
  scrollBody: {
    marginVertical: theme.spacing.xs,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  expandableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  mushroomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  mushroomChipSelected: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[300],
  },
  mushroomChipLocked: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: theme.colors.success.main,
  },
  chipRemoveBtn: {
    marginLeft: 6,
    padding: 2,
  },
  previewLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginTop: 6,
    gap: theme.spacing.xs,
  },
  previewBannerConflict: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  inputsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  inputCol: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  coolingBox: {
    backgroundColor: 'rgba(14, 165, 233, 0.04)',
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
    marginTop: 4,
  },
  approvalCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    backgroundColor: theme.colors.neutral[50],
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  approvalCheckboxRowApproved: {
    borderColor: theme.colors.primary[600],
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.neutral[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxApproved: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  footerRow: {
    paddingTop: theme.spacing.xs,
  },
});
