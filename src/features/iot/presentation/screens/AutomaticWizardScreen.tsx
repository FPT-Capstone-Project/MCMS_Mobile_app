import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppHeader,
  AppInput,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import { useAuth } from '../../../auth';
import {
  cultivationRepository,
  CultivationRoom,
  CultivationTray,
} from '../../../cultivation';
import {
  AdminRental,
  AutoControlLogItem,
  AutoControlState,
  AutoControlStatus,
  AutoControlSuggestions,
  AutoMistingConfig,
  CultivationTrayInfo,
  FloorEnvironment,
  FloorMapping,
  IotMaster,
} from '../../domain/entities/Iot';
import { iotRepository } from '../../data/repositories/IotRepository';

/**
 * State label mapping matching SmartMush IoT contracts
 */
export const AUTO_CONTROL_STATE_LABELS: Record<AutoControlState, string> = {
  IDLE: 'Đang theo dõi',
  ON_REQUESTED: 'Đang gửi lệnh bật',
  MISTING: 'Đã gửi lệnh phun',
  OFF_PENDING: 'Đang chờ xác nhận tắt',
  COOLDOWN: 'Đang nghỉ giữa các nhịp',
  DISABLED: 'Đã dừng điều khiển tự động',
  SENSOR_FAULT: 'Lỗi dữ liệu cảm biến',
  DEVICE_OFFLINE: 'Thiết bị mất kết nối',
  FAULT: 'Lỗi hệ thống',
};

export const AutomaticWizardScreen: React.FC = () => {
  const router = useRouter();
  const { canControlIot } = useAuth();

  // Wizard Step: 1. Phòng, 2. Tầng & Thiết bị, 3. Khay & Phiên Trồng, 4. Cấu hình AUTO, 5. Vận hành
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Master Data
  const [rooms, setRooms] = useState<CultivationRoom[]>([]);
  const [masters, setMasters] = useState<IotMaster[]>([]);
  const [floors, setFloors] = useState<FloorMapping[]>([]);
  const [traysInRoom, setTraysInRoom] = useState<CultivationTray[]>([]);

  // Selection states
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<FloorMapping | null>(null);

  // Floor Mapping Form (Create / Edit)
  const [isCreatingFloor, setIsCreatingFloor] = useState(false);
  const [editingFloorId, setEditingFloorId] = useState<number | null>(null);
  const [floorNumberInput, setFloorNumberInput] = useState('1');
  const [floorNameInput, setFloorNameInput] = useState('Tầng 1');
  const [masterIdInput, setMasterIdInput] = useState('');
  const [nodeAddressInput, setNodeAddressInput] = useState('1');
  const [ssrChannelInput, setSsrChannelInput] = useState('1');
  const [floorStatusInput, setFloorStatusInput] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Cultivation Trays on current Floor
  const [floorCultivationTrays, setFloorCultivationTrays] = useState<CultivationTrayInfo[]>([]);

  // Rental Assignment Modal (POST /api/rentals/admin/:rentalId/cultivation-session)
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [targetTrayForSession, setTargetTrayForSession] = useState<CultivationTrayInfo | null>(null);
  const [adminRentals, setAdminRentals] = useState<AdminRental[]>([]);
  const [selectedRentalId, setSelectedRentalId] = useState<number | null>(null);
  const [loadingRentals, setLoadingRentals] = useState(false);

  // Suggestions & Active Profiles
  const [suggestions, setSuggestions] = useState<AutoControlSuggestions | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Configuration Form State (FLOOR preset)
  const [profileName, setProfileName] = useState('Shared floor profile');
  const [coolingEnabled, setCoolingEnabled] = useState(true);
  const [profileApproved, setProfileApproved] = useState(false);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Humidity thresholds
  const [humidityMin, setHumidityMin] = useState('85');
  const [humidityMax, setHumidityMax] = useState('95');
  const [humidityStartThreshold, setHumidityStartThreshold] = useState('85');
  const [humidityStopThreshold, setHumidityStopThreshold] = useState('90');

  // Cooling & Temperature thresholds
  const [tempMin, setTempMin] = useState('18');
  const [tempMax, setTempMax] = useState('26');
  const [tempStartThreshold, setTempStartThreshold] = useState('26');
  const [tempStopThreshold, setTempStopThreshold] = useState('22');
  const [coolingHumidityLimit, setCoolingHumidityLimit] = useState('94');
  const [maxTempSpreadC, setMaxTempSpreadC] = useState('3');

  // Timing & Pulse (UI in seconds, saved in ms)
  const [mistingPulseSec, setMistingPulseSec] = useState('3');
  const [cooldownSec, setCooldownSec] = useState('60');
  const [evalIntervalSec, setEvalIntervalSec] = useState('5');

  // Sensors & Budgets
  const [sensorMaxAgeSec, setSensorMaxAgeSec] = useState('20');
  const [requiredSensors, setRequiredSensors] = useState('3');
  const [maxSensorSpreadPercent, setMaxSensorSpreadPercent] = useState('10');
  const [maxActivationsPerHour, setMaxActivationsPerHour] = useState('20');
  const [maxCumulativeOnSecPerHour, setMaxCumulativeOnSecPerHour] = useState('200');

  // Step 5: Runtime status & Monitoring
  const [statusData, setStatusData] = useState<AutoControlStatus | null>(null);
  const [envData, setEnvData] = useState<FloorEnvironment | null>(null);
  const [logs, setLogs] = useState<AutoControlLogItem[]>([]);
  const [logsOffset, setLogsOffset] = useState(0);
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [loadingMoreLogs, setLoadingMoreLogs] = useState(false);

  // General Loading & Action Loading
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Polling Refs for Safety (Prevent Overlap, Handle AppState and Floor Switching)
  const isPollingRef = useRef(false);
  const currentFloorIdRef = useRef<number | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop polling helper
  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  // Check if Floor is currently Running or in transitional state
  const isFloorBusy = useCallback((status: AutoControlStatus | null): boolean => {
    if (!status) return false;
    const isAuto = status.mode === 'AUTO';
    const state = status.runtime?.control_state;
    const isTransitional = ['ON_REQUESTED', 'MISTING', 'OFF_PENDING'].includes(state);
    return isAuto || isTransitional;
  }, []);

  const currentFloorBusy = isFloorBusy(statusData);

  // Apply suggested config values into form fields without recalculating thresholds
  const applySuggestedConfig = useCallback((config: AutoMistingConfig) => {
    if (config.profile_name) setProfileName(config.profile_name);
    setCoolingEnabled(Boolean(config.cooling_enabled));
    setProfileApproved(Boolean(config.profile_approved));
    setHumidityMin(String(config.humidity_min));
    setHumidityMax(String(config.humidity_max));
    setHumidityStartThreshold(String(config.humidity_start_threshold));
    setHumidityStopThreshold(String(config.humidity_stop_threshold));
    setMistingPulseSec(String(Math.round(config.misting_pulse_ms / 1000)));
    setCooldownSec(String(Math.round(config.cooldown_ms / 1000)));
    setEvalIntervalSec(String(Math.round(config.evaluation_interval_ms / 1000)));
    setSensorMaxAgeSec(String(Math.round((config.sensor_max_age_ms ?? 20000) / 1000)));
    setRequiredSensors(String(config.required_valid_sensors ?? 3));
    setMaxSensorSpreadPercent(String(config.max_sensor_spread_percent));
    setMaxActivationsPerHour(String(config.max_activations_per_hour));
    setMaxCumulativeOnSecPerHour(String(Math.round(config.max_cumulative_on_ms_per_hour / 1000)));

    if (config.temperature_min != null) setTempMin(String(config.temperature_min));
    if (config.temperature_max != null) setTempMax(String(config.temperature_max));
    if (config.temperature_start_threshold != null) setTempStartThreshold(String(config.temperature_start_threshold));
    if (config.temperature_stop_threshold != null) setTempStopThreshold(String(config.temperature_stop_threshold));
    if (config.cooling_humidity_limit != null) setCoolingHumidityLimit(String(config.cooling_humidity_limit));
    if (config.max_temperature_spread_c != null) setMaxTempSpreadC(String(config.max_temperature_spread_c));
    setIsFormDirty(false);
  }, []);

  // 1. Initial Data Load
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [roomsData, mastersData, floorsData] = await Promise.all([
        cultivationRepository.getRooms('ACTIVE'),
        iotRepository.getMasters(),
        iotRepository.getFloors(),
      ]);

      setRooms(roomsData);
      setMasters(mastersData);
      setFloors(floorsData);

      if (roomsData.length > 0 && selectedRoomId === null) {
        setSelectedRoomId(roomsData[0].room_id);
      }
      if (mastersData.length > 0 && !masterIdInput) {
        setMasterIdInput(String(mastersData[0].id));
      }
    } catch (err: unknown) {
      Alert.alert(
        'Lỗi nạp dữ liệu',
        typeof err === 'string' ? err : err instanceof Error ? err.message : 'Không thể tải thông tin hệ thống.'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedRoomId, masterIdInput]);

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
      return () => {
        stopPolling();
      };
    }, [loadInitialData, stopPolling])
  );

  // 2. When Room changes, fetch its Trays
  useEffect(() => {
    if (selectedRoomId) {
      cultivationRepository
        .getTrays(selectedRoomId)
        .then(setTraysInRoom)
        .catch(() => {});
    }
  }, [selectedRoomId]);

  // Keep currentFloorIdRef in sync with selectedFloor
  useEffect(() => {
    const fId = selectedFloor?.floor_id ?? selectedFloor?.id ?? null;
    currentFloorIdRef.current = fId;
  }, [selectedFloor]);

  // 3. Load Cultivation & Suggestions functions
  const loadFloorCultivationAndConfig = useCallback(async (floorId: number) => {
    try {
      const configRes = await iotRepository.getAutoControlConfig(floorId);
      if (configRes.cultivation?.trays) {
        setFloorCultivationTrays(configRes.cultivation.trays);
      }

      // If saved config exists, populate initial values
      if (configRes.config) {
        const c = configRes.config;
        if (c.profile_name) setProfileName(c.profile_name);
        setCoolingEnabled(Boolean(c.cooling_enabled));
        setProfileApproved(Boolean(c.profile_approved));
        setHumidityMin(String(c.humidity_min));
        setHumidityMax(String(c.humidity_max));
        setHumidityStartThreshold(String(c.humidity_start_threshold));
        setHumidityStopThreshold(String(c.humidity_stop_threshold));
        setMistingPulseSec(String(Math.round(c.misting_pulse_ms / 1000)));
        setCooldownSec(String(Math.round(c.cooldown_ms / 1000)));
        setEvalIntervalSec(String(Math.round(c.evaluation_interval_ms / 1000)));
        setSensorMaxAgeSec(String(Math.round((c.sensor_max_age_ms ?? 20000) / 1000)));
        setRequiredSensors(String(c.required_valid_sensors ?? 3));
        setMaxSensorSpreadPercent(String(c.max_sensor_spread_percent));
        setMaxActivationsPerHour(String(c.max_activations_per_hour));
        setMaxCumulativeOnSecPerHour(String(Math.round(c.max_cumulative_on_ms_per_hour / 1000)));

        if (c.temperature_min != null) setTempMin(String(c.temperature_min));
        if (c.temperature_max != null) setTempMax(String(c.temperature_max));
        if (c.temperature_start_threshold != null) setTempStartThreshold(String(c.temperature_start_threshold));
        if (c.temperature_stop_threshold != null) setTempStopThreshold(String(c.temperature_stop_threshold));
        if (c.cooling_humidity_limit != null) setCoolingHumidityLimit(String(c.cooling_humidity_limit));
        if (c.max_temperature_spread_c != null) setMaxTempSpreadC(String(c.max_temperature_spread_c));
      }
    } catch {
      // Ignore initial config fetch errors
    }
  }, []);

  const loadFloorSuggestions = useCallback(async (floorId: number, autoApplyIfClean = false) => {
    try {
      setLoadingSuggestions(true);
      const data = await iotRepository.getAutoControlSuggestions(floorId);
      setSuggestions(data);

      // Auto-fill if form is not dirty and config is present
      if (data?.config && autoApplyIfClean && !isFormDirty) {
        applySuggestedConfig(data.config);
      }
    } catch (err: unknown) {
      // Suggestions may return 409 or 403; handle gracefully
      const msg = err instanceof Error ? err.message : 'Không thể lấy cấu hình gợi ý.';
      setSuggestions({
        sourceProfiles: [],
        common: {},
        issues: [msg],
        warnings: [],
        config: null,
      });
    } finally {
      setLoadingSuggestions(false);
    }
  }, [applySuggestedConfig, isFormDirty]);

  // Handler when selecting a floor
  const handleSelectFloor = (floor: FloorMapping) => {
    setSelectedFloor(floor);
    const floorId = floor.floor_id ?? floor.id;
    if (floorId) {
      loadFloorCultivationAndConfig(floorId);
      loadFloorSuggestions(floorId, true);
    }
    setStep(3);
  };

  // 4. Step 5 Polling (Status & Logs)
  useEffect(() => {
    const floorId = selectedFloor?.floor_id ?? selectedFloor?.id;
    if (step === 5 && floorId) {
      const fetchPoll = async () => {
        if (isPollingRef.current) return;
        if (currentFloorIdRef.current !== floorId) return;

        try {
          isPollingRef.current = true;
          const status = await iotRepository.getAutoControlStatus(floorId);
          if (currentFloorIdRef.current === floorId) {
            setStatusData(status);
            if (status.environment) setEnvData(status.environment);
          }
        } catch {
          // Ignore transient polling failure
        } finally {
          isPollingRef.current = false;
        }
      };

      // Initial fetch + interval
      fetchPoll();
      pollingTimerRef.current = setInterval(fetchPoll, 2000);

      // Initial logs fetch
      iotRepository
        .getAutoControlLogs(floorId, 50, 0)
        .then((res) => {
          if (currentFloorIdRef.current === floorId) {
            setLogs(res.logs || []);
            setLogsOffset(res.logs?.length || 0);
            setHasMoreLogs((res.logs?.length || 0) >= 50);
          }
        })
        .catch(() => {});

      // AppState listener: pause polling in background
      const subscription = AppState.addEventListener('change', (nextState) => {
        if (nextState !== 'active') {
          stopPolling();
        } else {
          stopPolling();
          fetchPoll();
          pollingTimerRef.current = setInterval(fetchPoll, 2000);
        }
      });

      return () => {
        stopPolling();
        subscription.remove();
      };
    } else {
      stopPolling();
    }
  }, [step, selectedFloor, stopPolling]);

  // Load more logs pagination
  const handleLoadMoreLogs = async () => {
    const floorId = selectedFloor?.floor_id ?? selectedFloor?.id;
    if (!floorId || loadingMoreLogs || !hasMoreLogs) return;

    try {
      setLoadingMoreLogs(true);
      const res = await iotRepository.getAutoControlLogs(floorId, 50, logsOffset);
      const newItems = res.logs || [];
      setLogs((prev) => [...prev, ...newItems]);
      setLogsOffset((prev) => prev + newItems.length);
      setHasMoreLogs(newItems.length >= 50);
    } catch {
      // Ignore pagination errors
    } finally {
      setLoadingMoreLogs(false);
    }
  };

  // ================= STEP 2 ACTIONS: CREATE / EDIT FLOOR MAPPING =================
  const handleOpenCreateFloor = () => {
    if (currentFloorBusy) {
      Alert.alert('Không thể thực hiện', 'Tầng đang chạy AUTO hoặc có lệnh điều khiển đang chờ. Vui lòng dừng AUTO trước.');
      return;
    }
    setEditingFloorId(null);
    setFloorNumberInput('');
    setFloorNameInput('');
    setNodeAddressInput('');
    setSsrChannelInput('');
    setFloorStatusInput('ACTIVE');
    if (masters.length > 0) setMasterIdInput(String(masters[0].id));
    setIsCreatingFloor(true);
  };

  const handleOpenEditFloor = (floor: FloorMapping) => {
    if (currentFloorBusy && (floor.floor_id === selectedFloor?.floor_id || floor.id === selectedFloor?.id)) {
      Alert.alert('Không thể sửa', 'Tầng đang chạy AUTO hoặc có lệnh ON/OFF đang xử lý. Dừng AUTO trước khi sửa mapping.');
      return;
    }
    setEditingFloorId(floor.floor_id ?? floor.id ?? null);
    setFloorNumberInput(String(floor.floor_number));
    setFloorNameInput(floor.floor_name);
    setMasterIdInput(String(floor.master_id));
    setNodeAddressInput(String(floor.node_address));
    setSsrChannelInput(String(floor.misting_ssr_channel));
    setFloorStatusInput(floor.status || 'ACTIVE');
    setIsCreatingFloor(true);
  };

  const handleSaveFloorMapping = async () => {
    if (!selectedRoomId) {
      Alert.alert('Lỗi', 'Vui lòng chọn phòng trước.');
      return;
    }
    const masterId = parseInt(masterIdInput, 10);
    const floorNum = parseInt(floorNumberInput, 10);
    const nodeAddr = parseInt(nodeAddressInput, 10);
    const ssrChan = parseInt(ssrChannelInput, 10);

    if (!masterId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn Master IoT thuộc phòng.');
      return;
    }
    if (isNaN(floorNum) || floorNum < 1) {
      Alert.alert('Lỗi số tầng', 'Số tầng phải là số nguyên dương.');
      return;
    }
    if (isNaN(nodeAddr) || nodeAddr < 1 || nodeAddr > 247) {
      Alert.alert('Lỗi Node Address', 'Node Address phải nằm trong khoảng 1 đến 247.');
      return;
    }
    if (isNaN(ssrChan) || ssrChan < 1 || ssrChan > 8) {
      Alert.alert('Lỗi Kênh SSR', 'Kênh SSR Van Phun Sương phải nằm trong khoảng 1 đến 8.');
      return;
    }

    const mappingPayload: FloorMapping = {
      room_id: selectedRoomId,
      floor_number: floorNum,
      floor_name: floorNameInput.trim() || `Tầng ${floorNum}`,
      master_id: masterId,
      node_address: nodeAddr,
      misting_ssr_channel: ssrChan,
      status: floorStatusInput,
    };

    try {
      setActionLoading(true);
      let saved: FloorMapping;
      if (editingFloorId) {
        saved = await iotRepository.updateFloor(editingFloorId, mappingPayload);
        Alert.alert('Thành công', 'Đã cập nhật mapping tầng.');
      } else {
        saved = await iotRepository.createFloor(mappingPayload);
        Alert.alert('Thành công', 'Đã tạo mapping tầng mới.');
      }

      const updatedFloors = await iotRepository.getFloors(selectedRoomId);
      setFloors(updatedFloors);
      setSelectedFloor(saved);
      setIsCreatingFloor(false);
      setEditingFloorId(null);
    } catch (err: unknown) {
      Alert.alert(
        'Lỗi lưu mapping',
        typeof err === 'string' ? err : err instanceof Error ? err.message : 'Không thể lưu mapping tầng.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ================= STEP 3 ACTIONS: TRAY & CULTIVATION SESSION =================
  const handleAssignTrayToFloor = async (tray: CultivationTray) => {
    const floorId = selectedFloor?.floor_id ?? selectedFloor?.id;
    if (!floorId) return;

    if (currentFloorBusy) {
      Alert.alert('Khóa thao tác', 'Không thể gán khay khi tầng đang chạy AUTO hoặc có lệnh chưa xác nhận.');
      return;
    }

    try {
      setActionLoading(true);
      await iotRepository.assignTrayToFloor(floorId, tray.tray_id);
      Alert.alert('Thành công', `Đã gán khay ${tray.tray_code} vào tầng ${selectedFloor?.floor_name}.`);
      loadFloorCultivationAndConfig(floorId);
      loadFloorSuggestions(floorId, false);
      // Refresh room trays
      if (selectedRoomId) {
        const fresh = await cultivationRepository.getTrays(selectedRoomId);
        setTraysInRoom(fresh);
      }
    } catch (err: unknown) {
      Alert.alert(
        'Không thể gán khay',
        typeof err === 'string' ? err : err instanceof Error ? err.message : 'Lỗi gán khay vào tầng.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenStartSessionModal = async (tray: CultivationTrayInfo) => {
    setTargetTrayForSession(tray);
    setIsAssignModalVisible(true);
    try {
      setLoadingRentals(true);
      const list = await iotRepository.getAdminRentals();
      const readyRentals = list.filter((r) => r.status === 'CONFIRMED' || r.status === 'PREPARING');
      setAdminRentals(readyRentals);
      if (readyRentals.length > 0) {
        setSelectedRentalId(readyRentals[0].rental_id);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách đơn thuê.');
    } finally {
      setLoadingRentals(false);
    }
  };

  const handleConfirmStartSession = async () => {
    const floorId = selectedFloor?.floor_id ?? selectedFloor?.id;
    if (!targetTrayForSession || !selectedRentalId || !floorId) return;

    try {
      setActionLoading(true);
      await iotRepository.startCultivationSession(selectedRentalId, targetTrayForSession.tray_id);
      Alert.alert('Thành công', 'Đã bắt đầu phiên trồng cho khay từ lượt thuê.');
      setIsAssignModalVisible(false);
      setTargetTrayForSession(null);
      // Reload cultivation & suggestions
      loadFloorCultivationAndConfig(floorId);
      loadFloorSuggestions(floorId, false);
    } catch (err: unknown) {
      Alert.alert(
        'Không thể bắt đầu phiên trồng',
        typeof err === 'string' ? err : err instanceof Error ? err.message : 'Lỗi gán lượt thuê vào khay.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ================= STEP 4 ACTIONS: CONFIG FORM VALIDATION & SAVE =================
  const buildAndValidateConfig = (): AutoMistingConfig | null => {
    const hMin = parseFloat(humidityMin);
    const hMax = parseFloat(humidityMax);
    const hStart = parseFloat(humidityStartThreshold);
    const hStop = parseFloat(humidityStopThreshold);

    const tMin = parseFloat(tempMin);
    const tMax = parseFloat(tempMax);
    const tStart = parseFloat(tempStartThreshold);
    const tStop = parseFloat(tempStopThreshold);
    const coolHumLimit = parseFloat(coolingHumidityLimit);
    const maxTSpread = parseFloat(maxTempSpreadC);

    const pulseMs = parseInt(mistingPulseSec, 10) * 1000;
    const cdMs = parseInt(cooldownSec, 10) * 1000;
    const evalMs = parseInt(evalIntervalSec, 10) * 1000;
    const sensorAgeMs = parseInt(sensorMaxAgeSec, 10) * 1000;
    const validSensors = parseInt(requiredSensors, 10);
    const spreadPercent = parseFloat(maxSensorSpreadPercent);
    const acts = parseInt(maxActivationsPerHour, 10);
    const cumMs = parseInt(maxCumulativeOnSecPerHour, 10) * 1000;

    if (!profileName.trim()) {
      Alert.alert('Thiếu tên cấu hình', 'Vui lòng đặt tên cho cấu hình (Profile Name).');
      return null;
    }

    if (!profileApproved) {
      Alert.alert(
        'Chưa duyệt cấu hình',
        'Người vận hành phải kiểm tra và xác nhận duyệt (Profile Approved) trước khi lưu cấu hình FLOOR.'
      );
      return null;
    }

    if (hMin >= hMax) {
      Alert.alert('Độ ẩm không hợp lệ', 'Độ ẩm tối thiểu (humidity_min) phải nhỏ hơn độ ẩm tối đa (humidity_max).');
      return null;
    }
    if (hStart >= hStop) {
      Alert.alert('Ngưỡng kích hoạt không hợp lệ', 'Ngưỡng bật bù ẩm phải nhỏ hơn ngưỡng dừng.');
      return null;
    }
    if (hStart > hMin) {
      Alert.alert('Ngưỡng bật không hợp lệ', 'Ngưỡng bật bù ẩm phải nhỏ hơn hoặc bằng độ ẩm tối thiểu.');
      return null;
    }
    if (hStop > hMax) {
      Alert.alert('Ngưỡng dừng không hợp lệ', 'Ngưỡng dừng bù ẩm phải nhỏ hơn hoặc bằng độ ẩm tối đa.');
      return null;
    }

    if (coolingEnabled) {
      if (tMin >= tMax) {
        Alert.alert('Nhiệt độ không hợp lệ', 'Nhiệt độ tối thiểu phải nhỏ hơn nhiệt độ tối đa.');
        return null;
      }
      if (tStop < tMin || tStop >= tStart || tStart > tMax) {
        Alert.alert(
          'Ngưỡng làm mát không hợp lệ',
          'Yêu cầu: temperature_min <= temperature_stop_threshold < temperature_start_threshold <= temperature_max.'
        );
        return null;
      }
      if (coolHumLimit <= hStop || coolHumLimit > hMax) {
        Alert.alert(
          'Giới hạn độ ẩm làm mát không hợp lệ',
          'Giới hạn trần độ ẩm khi làm mát (cooling_humidity_limit) phải lớn hơn ngưỡng ngừng bù ẩm và không vượt quá độ ẩm tối đa.'
        );
        return null;
      }
    }

    if (cumMs < pulseMs) {
      Alert.alert(
        'Giới hạn an toàn không hợp lệ',
        'Tổng thời gian phun tối đa mỗi giờ phải lớn hơn hoặc bằng thời lượng 1 xung phun.'
      );
      return null;
    }

    return {
      config_source: 'FLOOR',
      profile_name: profileName.trim(),
      profile_approved: true,
      humidity_min: hMin,
      humidity_max: hMax,
      humidity_start_threshold: hStart,
      humidity_stop_threshold: hStop,
      cooling_enabled: coolingEnabled,
      temperature_min: coolingEnabled ? tMin : undefined,
      temperature_max: coolingEnabled ? tMax : undefined,
      temperature_start_threshold: coolingEnabled ? tStart : undefined,
      temperature_stop_threshold: coolingEnabled ? tStop : undefined,
      cooling_humidity_limit: coolingEnabled ? coolHumLimit : undefined,
      max_temperature_spread_c: coolingEnabled ? maxTSpread : undefined,
      misting_pulse_ms: pulseMs,
      cooldown_ms: cdMs,
      evaluation_interval_ms: evalMs,
      sensor_max_age_ms: sensorAgeMs,
      required_valid_sensors: validSensors,
      max_sensor_spread_percent: spreadPercent,
      max_activations_per_hour: acts,
      max_cumulative_on_ms_per_hour: cumMs,
    };
  };

  const handleSaveConfig = async () => {
    const floorId = selectedFloor?.floor_id ?? selectedFloor?.id;
    if (!floorId) return;

    if (currentFloorBusy) {
      Alert.alert('Khóa sửa cấu hình', 'Không thể sửa cấu hình khi AUTO đang chạy hoặc van đang mở/chờ tắt.');
      return;
    }

    const config = buildAndValidateConfig();
    if (!config) return;

    try {
      setActionLoading(true);
      await iotRepository.saveAutoControlConfig(floorId, config);
      Alert.alert(
        'Đã lưu cấu hình thành công',
        'Cấu hình FLOOR đã được lưu vào hệ thống. Chế độ hiện tại vẫn là MANUAL (chưa bật phun). Chuyển sang bước Vận hành để kích hoạt.'
      );
      setStep(5);
    } catch (err: unknown) {
      Alert.alert(
        'Lưu cấu hình thất bại',
        typeof err === 'string' ? err : err instanceof Error ? err.message : 'Không thể lưu cấu hình.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ================= STEP 5 ACTIONS: EVALUATE, START, STOP =================
  const handleEvaluate = async () => {
    const floorId = selectedFloor?.floor_id ?? selectedFloor?.id;
    if (!floorId) return;

    try {
      setActionLoading(true);
      const res = await iotRepository.evaluateAutoControl(floorId);
      Alert.alert(
        'Kết quả Đánh giá vi khí hậu',
        `Hành động: ${res.decision.action}\nTrạng thái: ${res.decision.state}\nLý do: ${res.decision.reason}`
      );
    } catch (err: unknown) {
      Alert.alert(
        'Lỗi đánh giá',
        typeof err === 'string' ? err : err instanceof Error ? err.message : 'Không thể đánh giá vi khí hậu.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartDryRun = async () => {
    const floorId = selectedFloor?.floor_id ?? selectedFloor?.id;
    if (!floorId) return;

    try {
      setActionLoading(true);
      await iotRepository.startAutoControl(floorId, true);
      Alert.alert(
        'Đã bắt đầu Mô phỏng (Dry Run)',
        'Hệ thống đang chạy thuật toán mô phỏng (dryRun = true). Không có lệnh bật van thực tế gửi xuống phần cứng.'
      );
      // Re-fetch status immediately
      const st = await iotRepository.getAutoControlStatus(floorId);
      setStatusData(st);
    } catch (err: unknown) {
      Alert.alert(
        'Lỗi khởi chạy mô phỏng',
        typeof err === 'string' ? err : err instanceof Error ? err.message : 'Không thể bắt đầu mô phỏng.'
      );
      // Re-check status on timeout / error
      iotRepository.getAutoControlStatus(floorId).then(setStatusData).catch(() => {});
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartRealRun = () => {
    const floorId = selectedFloor?.floor_id ?? selectedFloor?.id;
    if (!floorId) return;

    Alert.alert(
      'XÁC NHẬN BẬT PHUN THẬT',
      `CẢNH BÁO: Bắt đầu điều khiển van phun sương vật lý thực tế bằng rơ-le SSR cho tầng "${selectedFloor?.floor_name}".\n\nBạn có chắc chắn thiết bị, đường ống nước và cảm biến đã sẵn sàng?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Bắt đầu chạy thật',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await iotRepository.startAutoControl(floorId, false);
              Alert.alert('Thành công', 'Đã kích hoạt điều khiển phun sương tự động thực tế.');
              const st = await iotRepository.getAutoControlStatus(floorId);
              setStatusData(st);
            } catch (err: unknown) {
              Alert.alert(
                'Khởi chạy thực tế thất bại',
                typeof err === 'string' ? err : err instanceof Error ? err.message : 'Không thể kích hoạt chạy thật.'
              );
              // Re-check real state
              iotRepository.getAutoControlStatus(floorId).then(setStatusData).catch(() => {});
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleStopAuto = async () => {
    const floorId = selectedFloor?.floor_id ?? selectedFloor?.id;
    if (!floorId) return;

    try {
      setActionLoading(true);
      const res = await iotRepository.stopAutoControl(floorId);
      setStatusData(res);
      Alert.alert(
        'Đã dừng tự động',
        'Đã gửi lệnh dừng. Hệ thống chuyển về MANUAL. Nếu còn OFF_PENDING, hệ thống sẽ tiếp tục đợi xác nhận từ rơ-le.'
      );
    } catch (err: unknown) {
      Alert.alert(
        'Lỗi dừng AUTO',
        typeof err === 'string' ? err : err instanceof Error ? err.message : 'Không thể dừng tiến trình.'
      );
      iotRepository.getAutoControlStatus(floorId).then(setStatusData).catch(() => {});
    } finally {
      setActionLoading(false);
    }
  };

  // Distinct mushroom crops on this floor
  const activeCropNames = Array.from(
    new Set(
      floorCultivationTrays
        .map((t) => t.mushroom_name)
        .filter((n): n is string => Boolean(n))
    )
  );

  const roomFloors = floors.filter((f) => f.room_id === selectedRoomId);

  if (loading) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <AppHeader title="Automatic Misting" subtitle="Tự động hóa vi khí hậu tầng" />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.loadingText}>
            Đang tải dữ liệu phòng & tầng...
          </AppText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="AUTO Phun Sương Theo Tầng"
        subtitle={
          selectedFloor
            ? `${selectedFloor.floor_name} • Phòng ${rooms.find((r) => r.room_id === selectedRoomId)?.room_name || ''}`
            : 'Thiết lập & Điều phối vi khí hậu tự động'
        }
        showBack
        onBack={step > 1 ? () => setStep((prev) => (prev - 1) as any) : () => router.back()}
      />

      <View style={styles.content}>
        {/* ================= STEP BARS ================= */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepsBar}>
          {[
            { s: 1, title: '1. Phòng' },
            { s: 2, title: '2. Tầng & Thiết bị' },
            { s: 3, title: '3. Khay & Trồng' },
            { s: 4, title: '4. Cấu hình' },
            { s: 5, title: '5. Vận hành' },
          ].map((item) => (
            <Pressable
              key={item.s}
              onPress={() => item.s < step && setStep(item.s as any)}
              style={[styles.stepItem, step === item.s && styles.stepItemActive]}
            >
              <AppText
                variant="caption"
                weight={step === item.s ? 'bold' : 'normal'}
                color={step === item.s ? theme.colors.primary[600] : theme.colors.text.muted}
              >
                {item.title}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>

        {/* ================= STEP 1: CHỌN PHÒNG ================= */}
        {step === 1 && (
          <View style={styles.section}>
            <AppText variant="h3">Chọn phòng nuôi trồng</AppText>
            <AppText variant="bodySmall" color={theme.colors.text.secondary}>
              Chọn buồng nuôi trồng thông minh để cấu hình hệ thống phun sương vi khí hậu theo tầng.
            </AppText>

            <View style={styles.listContainer}>
              {rooms.map((room) => {
                const isSelected = room.room_id === selectedRoomId;
                return (
                  <Pressable
                    key={room.room_id}
                    onPress={() => {
                      setSelectedRoomId(room.room_id);
                      setIsCreatingFloor(false);
                      setStep(2);
                    }}
                  >
                    <AppCard
                      elevation={isSelected ? 'md' : 'xs'}
                      style={[styles.cardItem, isSelected && styles.cardSelected]}
                    >
                      <View style={styles.cardHeaderRow}>
                        <View style={styles.iconCircle}>
                          <Ionicons name="business" size={22} color={theme.colors.primary[600]} />
                        </View>
                        <View style={styles.cardInfo}>
                          <AppText variant="title" weight="bold">
                            {room.room_name}
                          </AppText>
                          <AppText variant="caption" color={theme.colors.text.secondary}>
                            Mã: {room.room_code} • Sức chứa: {room.capacity} khay
                          </AppText>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.text.muted} />
                      </View>
                    </AppCard>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ================= STEP 2: TẦNG & THIẾT BỊ ================= */}
        {step === 2 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <AppText variant="h3">Tầng & Liên kết Thiết bị</AppText>
                <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                  Phòng: {rooms.find((r) => r.room_id === selectedRoomId)?.room_name}
                </AppText>
              </View>
              <AppButton
                title={isCreatingFloor ? 'Hủy' : '+ Thêm tầng'}
                variant={isCreatingFloor ? 'ghost' : 'outline'}
                size="sm"
                disabled={currentFloorBusy}
                onPress={isCreatingFloor ? () => setIsCreatingFloor(false) : handleOpenCreateFloor}
              />
            </View>

            {isCreatingFloor ? (
              <AppCard elevation="sm" style={styles.formCard}>
                <AppText variant="title" weight="bold">
                  {editingFloorId ? 'Chỉnh sửa mapping tầng' : 'Tạo mapping tầng mới'}
                </AppText>
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Mapping liên kết Master, Node cảm biến và Kênh SSR van. Không gửi số GPIO.
                </AppText>

                <AppInput
                  label="Số tầng (Floor Number)"
                  placeholder="Ví dụ: 1, 2, 3"
                  value={floorNumberInput}
                  onChangeText={setFloorNumberInput}
                  keyboardType="number-pad"
                  required
                />

                <AppInput
                  label="Tên tầng (Floor Name)"
                  placeholder="Ví dụ: Tầng 1"
                  value={floorNameInput}
                  onChangeText={setFloorNameInput}
                  required
                />

                <View style={styles.masterSelectHeader}>
                  <AppText variant="label" style={styles.inputLabel}>
                    Chọn Master IoT thuộc phòng:
                  </AppText>
                  {masters.length > 0 && (
                    <AppText variant="caption" color={theme.colors.primary[700]} weight="bold">
                      Đã chọn: {masters.find((m) => String(m.id) === masterIdInput)?.masterId || 'Chưa chọn'}
                    </AppText>
                  )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.masterPills}>
                  {masters.map((m) => {
                    const isSel = masterIdInput === String(m.id);
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => setMasterIdInput(String(m.id))}
                        style={[styles.masterPill, isSel && styles.masterPillActive]}
                      >
                        <Ionicons
                          name={isSel ? 'checkmark-circle' : 'radio-button-off'}
                          size={16}
                          color={isSel ? '#FFFFFF' : theme.colors.text.secondary}
                        />
                        <AppText variant="caption" color={isSel ? '#FFFFFF' : theme.colors.text.primary} weight="bold">
                          {m.masterId} (ID #{m.id})
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <AppInput
                  label="Node cảm biến (Node Address: 1 - 247)"
                  placeholder="Nhập địa chỉ node cảm biến (1-247)"
                  value={nodeAddressInput}
                  onChangeText={setNodeAddressInput}
                  keyboardType="number-pad"
                  required
                />

                <AppInput
                  label="Kênh SSR Phun Sương (1 - 8)"
                  placeholder="Nhập kênh rơ-le SSR (1-8)"
                  value={ssrChannelInput}
                  onChangeText={setSsrChannelInput}
                  keyboardType="number-pad"
                  required
                />

                <View style={styles.switchRow}>
                  <AppText variant="label">Trạng thái tầng hoạt động (ACTIVE)</AppText>
                  <Switch
                    value={floorStatusInput === 'ACTIVE'}
                    onValueChange={(val) => setFloorStatusInput(val ? 'ACTIVE' : 'INACTIVE')}
                    trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary[500] }}
                  />
                </View>

                <AppButton
                  title={editingFloorId ? 'Cập nhật tầng' : 'Lưu tầng mới'}
                  variant="primary"
                  size="md"
                  loading={actionLoading}
                  onPress={handleSaveFloorMapping}
                />
              </AppCard>
            ) : (
              <View style={styles.listContainer}>
                {roomFloors.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="layers-outline" size={36} color={theme.colors.text.muted} />
                    <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                      Phòng này chưa có tầng nào được cấu hình.
                    </AppText>
                    <AppButton title="Tạo tầng ngay" variant="primary" size="sm" onPress={handleOpenCreateFloor} />
                  </View>
                ) : (
                  roomFloors.map((floor) => {
                    const floorId = floor.floor_id ?? floor.id;
                    const isSelected = (selectedFloor?.floor_id ?? selectedFloor?.id) === floorId;
                    const masterMatch = masters.find((m) => m.id === floor.master_id);

                    return (
                      <Pressable
                        key={floorId || floor.floor_number}
                        onPress={() => handleSelectFloor(floor)}
                      >
                        <AppCard
                          elevation={isSelected ? 'md' : 'xs'}
                          style={[styles.cardItem, isSelected && styles.cardSelected]}
                        >
                          <View style={styles.cardHeaderRow}>
                            <View style={styles.iconCircle}>
                              <Ionicons name="layers" size={22} color={theme.colors.primary[600]} />
                            </View>
                            <View style={styles.cardInfo}>
                              <AppText variant="title" weight="bold">
                                {floor.floor_name} (Tầng {floor.floor_number})
                              </AppText>
                              <AppText variant="caption" color={theme.colors.text.secondary}>
                                Master: {masterMatch?.masterId || floor.master_id} • Node: {floor.node_address} • SSR Kênh {floor.misting_ssr_channel}
                              </AppText>
                            </View>
                            {canControlIot && (
                              <Pressable
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditFloor(floor);
                                }}
                                style={styles.iconBtn}
                              >
                                <Ionicons name="pencil" size={18} color={theme.colors.primary[700]} />
                              </Pressable>
                            )}
                            <Ionicons name="chevron-forward" size={20} color={theme.colors.text.muted} />
                          </View>
                        </AppCard>
                      </Pressable>
                    );
                  })
                )}
              </View>
            )}
          </View>
        )}

        {/* ================= STEP 3: KHAY & PHIÊN TRỒNG ================= */}
        {step === 3 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <AppText variant="h3">Khay & Phiên Trồng</AppText>
                <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                  Tầng: <AppText variant="label">{selectedFloor?.floor_name}</AppText> (ID #{selectedFloor?.floor_id ?? selectedFloor?.id})
                </AppText>
              </View>
              <AppButton
                title="Sang cấu hình →"
                variant="primary"
                size="sm"
                onPress={() => setStep(4)}
              />
            </View>

            {/* Trays already on this floor */}
            <AppText variant="label" color={theme.colors.primary[700]}>
              DANH SÁCH KHAY ĐÃ GÁN VÀO TẦNG ({floorCultivationTrays.length})
            </AppText>

            {floorCultivationTrays.length === 0 ? (
              <AppCard elevation="xs" style={styles.emptyCard}>
                <Ionicons name="cube-outline" size={32} color={theme.colors.text.muted} />
                <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                  Chưa có khay nào được gán vào tầng này.
                </AppText>
              </AppCard>
            ) : (
              <View style={styles.listContainer}>
                {floorCultivationTrays.map((tray) => {
                  const hasActiveSession = Boolean(tray.mushroom_name && tray.session_id);
                  return (
                    <AppCard key={tray.tray_id} elevation="xs" style={styles.trayCard}>
                      <View style={styles.cardHeaderRow}>
                        <View style={[styles.iconCircle, { backgroundColor: hasActiveSession ? theme.colors.success.light : theme.colors.neutral[100] }]}>
                          <Ionicons
                            name="cube"
                            size={20}
                            color={hasActiveSession ? theme.colors.success.main : theme.colors.text.secondary}
                          />
                        </View>
                        <View style={styles.cardInfo}>
                          <View style={styles.titleRow}>
                            <AppText variant="title" weight="bold">
                              Khay {tray.tray_code}
                            </AppText>
                            <View
                              style={[
                                styles.badgeMini,
                                {
                                  backgroundColor: hasActiveSession
                                    ? 'rgba(34, 197, 94, 0.15)'
                                    : 'rgba(234, 179, 8, 0.15)',
                                },
                              ]}
                            >
                              <AppText
                                variant="caption"
                                weight="bold"
                                color={hasActiveSession ? theme.colors.success.dark : theme.colors.warning.dark}
                              >
                                {hasActiveSession ? 'Đang trồng' : 'Chưa có phiên'}
                              </AppText>
                            </View>
                          </View>

                          {hasActiveSession ? (
                            <AppText variant="caption" color={theme.colors.text.secondary}>
                              Nấm: <AppText variant="caption" weight="bold">{tray.mushroom_name}</AppText> • Phiên #{tray.session_id} • Đơn thuê #{tray.rental_id}
                            </AppText>
                          ) : (
                            <AppText variant="caption" color={theme.colors.text.secondary}>
                              Trạng thái: {tray.tray_status} • Sẵn sàng gán lượt thuê
                            </AppText>
                          )}
                        </View>

                        {!hasActiveSession && canControlIot && (
                          <AppButton
                            title="Gán lượt thuê"
                            variant="outline"
                            size="sm"
                            disabled={currentFloorBusy}
                            onPress={() => handleOpenStartSessionModal(tray)}
                          />
                        )}
                      </View>
                    </AppCard>
                  );
                })}
              </View>
            )}

            <AppDivider spacing="sm" />

            {/* Trays in room available to be assigned to this floor */}
            <AppText variant="label" color={theme.colors.text.muted}>
              CÁC KHAY KHÁC TRONG PHÒNG CÓ THỂ GÁN VÀO TẦNG
            </AppText>

            <View style={styles.listContainer}>
              {traysInRoom
                .filter((t) => !floorCultivationTrays.some((fct) => fct.tray_id === t.tray_id))
                .slice(0, 8)
                .map((tray) => (
                  <View key={tray.tray_id} style={styles.unassignedTrayRow}>
                    <View style={styles.cardInfo}>
                      <AppText variant="bodySmall" weight="bold">
                        {tray.tray_code} {tray.tray_name ? `(${tray.tray_name})` : ''}
                      </AppText>
                      <AppText variant="caption" color={theme.colors.text.secondary}>
                        Trạng thái: {tray.status}
                      </AppText>
                    </View>
                    {canControlIot && (
                      <AppButton
                        title="+ Gán vào tầng"
                        variant="ghost"
                        size="sm"
                        loading={actionLoading}
                        disabled={currentFloorBusy}
                        onPress={() => handleAssignTrayToFloor(tray)}
                      />
                    )}
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* ================= STEP 4: CẤU HÌNH AUTO ================= */}
        {step === 4 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <AppText variant="h3">Cấu hình AUTO Phun Sương</AppText>
                <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                  Tầng: {selectedFloor?.floor_name} (ID #{selectedFloor?.floor_id ?? selectedFloor?.id})
                </AppText>
              </View>
              <AppButton
                title="Lấy gợi ý mới"
                variant="outline"
                size="sm"
                loading={loadingSuggestions}
                leftIcon={<Ionicons name="refresh" size={16} color={theme.colors.primary[600]} />}
                onPress={() => {
                  const floorId = selectedFloor?.floor_id ?? selectedFloor?.id;
                  if (floorId) loadFloorSuggestions(floorId, true);
                }}
              />
            </View>

            {/* Active Crops Summary Card */}
            <AppCard elevation="xs" style={styles.cropsCard}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="leaf" size={20} color={theme.colors.primary[600]} />
                <View style={styles.cardInfo}>
                  <AppText variant="title" weight="bold">
                    Cây nấm canh tác trên tầng
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Hệ thống tự động lấy loại nấm từ các phiên ACTIVE. Không yêu cầu chọn lại loại nấm.
                  </AppText>
                </View>
              </View>

              <View style={styles.cropPillsRow}>
                {activeCropNames.length > 0 ? (
                  activeCropNames.map((name, i) => (
                    <View key={i} style={styles.cropPill}>
                      <Ionicons name="checkmark-circle" size={14} color={theme.colors.success.main} />
                      <AppText variant="caption" weight="bold" color={theme.colors.text.primary}>
                        {name}
                      </AppText>
                    </View>
                  ))
                ) : (
                  <AppText variant="caption" color={theme.colors.warning.dark}>
                    Chưa có phiên trồng nào đang ACTIVE trên tầng này. Vui lòng gán lượt thuê ở Bước 3.
                  </AppText>
                )}
              </View>
            </AppCard>

            {/* Suggestions & Common Range Card */}
            {suggestions && (
              <AppCard elevation="sm" style={styles.suggestionsCard}>
                <View style={styles.suggestionsHeader}>
                  <View style={styles.cardInfo}>
                    <AppText variant="title" weight="bold">
                      Khoảng vi khí hậu chung & Gợi ý
                    </AppText>
                    <AppText variant="caption" color={theme.colors.text.secondary}>
                      Tổng hợp từ các điều kiện sinh trưởng của các giống nấm đang trồng
                    </AppText>
                  </View>
                  {suggestions.config && (
                    <AppButton
                      title="Áp dụng gợi ý"
                      variant="secondary"
                      size="sm"
                      leftIcon={<Ionicons name="sparkles" size={16} color={theme.colors.primary[700]} />}
                      onPress={() => applySuggestedConfig(suggestions.config!)}
                    />
                  )}
                </View>

                {/* Shared common conditions */}
                <View style={styles.commonGrid}>
                  <View style={styles.commonItem}>
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Độ ẩm chung
                    </AppText>
                    <AppText variant="title" weight="bold" color={theme.colors.primary[600]}>
                      {suggestions.common.humidity_min != null && suggestions.common.humidity_max != null
                        ? `${suggestions.common.humidity_min}% - ${suggestions.common.humidity_max}%`
                        : 'Chưa đủ dữ liệu'}
                    </AppText>
                  </View>
                  <AppDivider orientation="vertical" spacing="sm" />
                  <View style={styles.commonItem}>
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Nhiệt độ chung
                    </AppText>
                    <AppText variant="title" weight="bold" color={theme.colors.text.primary}>
                      {suggestions.common.temperature_min != null && suggestions.common.temperature_max != null
                        ? `${suggestions.common.temperature_min}°C - ${suggestions.common.temperature_max}°C`
                        : 'Chưa đủ dữ liệu'}
                    </AppText>
                  </View>
                  {suggestions.common.co2_min != null && (
                    <>
                      <AppDivider orientation="vertical" spacing="sm" />
                      <View style={styles.commonItem}>
                        <AppText variant="caption" color={theme.colors.text.muted}>
                          CO₂ (Kiểm tra)
                        </AppText>
                        <AppText variant="title" weight="bold" color={theme.colors.text.secondary}>
                          {`${suggestions.common.co2_min} - ${suggestions.common.co2_max} ppm`}
                        </AppText>
                      </View>
                    </>
                  )}
                </View>

                {/* Issues if any */}
                {suggestions.issues && suggestions.issues.length > 0 && (
                  <View style={styles.issuesBox}>
                    <View style={styles.issueTitleRow}>
                      <Ionicons name="alert-circle" size={16} color={theme.colors.error.main} />
                      <AppText variant="caption" weight="bold" color={theme.colors.error.main}>
                        Vấn đề ngăn cản tạo cấu hình gợi ý:
                      </AppText>
                    </View>
                    {suggestions.issues.map((issue, idx) => (
                      <AppText key={idx} variant="caption" color={theme.colors.error.dark}>
                        • {issue}
                      </AppText>
                    ))}
                  </View>
                )}

                {/* Warnings if any */}
                {suggestions.warnings && suggestions.warnings.length > 0 && (
                  <View style={styles.warningsBox}>
                    {suggestions.warnings.map((warn, idx) => (
                      <AppText key={idx} variant="caption" color={theme.colors.warning.dark}>
                        ⚠️ {warn}
                      </AppText>
                    ))}
                  </View>
                )}
              </AppCard>
            )}

            {/* Main Form Card */}
            <AppCard elevation="sm" style={styles.formCard}>
              <AppText variant="title" weight="bold">
                Thông số điều khiển chính
              </AppText>

              <AppInput
                label="Tên cấu hình (Profile Name)"
                value={profileName}
                onChangeText={(val) => {
                  setProfileName(val);
                  setIsFormDirty(true);
                }}
                placeholder="Ví dụ: Shared floor profile"
                required
              />

              <View style={styles.switchCard}>
                <View style={styles.cardInfo}>
                  <AppText variant="label">Bật làm mát bằng phun sương (Cooling)</AppText>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Kích hoạt phun sương hạ nhiệt khi nhiệt độ vượt ngưỡng cho phép
                  </AppText>
                </View>
                <Switch
                  value={coolingEnabled}
                  onValueChange={(val) => {
                    setCoolingEnabled(val);
                    setIsFormDirty(true);
                  }}
                  trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary[500] }}
                />
              </View>

              <View style={[styles.switchCard, { backgroundColor: profileApproved ? 'rgba(34, 197, 94, 0.08)' : 'rgba(234, 179, 8, 0.08)' }]}>
                <View style={styles.cardInfo}>
                  <AppText variant="label" weight="bold" color={profileApproved ? theme.colors.success.dark : theme.colors.warning.dark}>
                    Xác nhận duyệt cấu hình (Profile Approved) *
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Người vận hành xác nhận đã kiểm tra khoảng vi khí hậu phù hợp với nấm
                  </AppText>
                </View>
                <Switch
                  value={profileApproved}
                  onValueChange={(val) => {
                    setProfileApproved(val);
                    setIsFormDirty(true);
                  }}
                  trackColor={{ false: theme.colors.neutral[300], true: theme.colors.success.main }}
                />
              </View>

              {/* Advanced Settings Accordion */}
              <Pressable
                onPress={() => setIsAdvancedExpanded((prev) => !prev)}
                style={styles.accordionHeader}
              >
                <View style={styles.accordionHeaderLeft}>
                  <Ionicons name="options-outline" size={18} color={theme.colors.primary[700]} />
                  <AppText variant="label" color={theme.colors.primary[700]}>
                    Cài đặt nâng cao vi khí hậu & bảo vệ thiết bị
                  </AppText>
                </View>
                <Ionicons
                  name={isAdvancedExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.colors.primary[700]}
                />
              </Pressable>

              {isAdvancedExpanded && (
                <View style={styles.advancedSection}>
                  <AppText variant="caption" weight="bold" color={theme.colors.text.muted}>
                    NGƯỠNG ĐỘ ẨM (%)
                  </AppText>
                  <View style={styles.rowTwoInputs}>
                    <View style={styles.flexOne}>
                      <AppInput
                        label="Độ ẩm Min (%)"
                        value={humidityMin}
                        onChangeText={(v) => { setHumidityMin(v); setIsFormDirty(true); }}
                        keyboardType="numeric"
                        required
                      />
                    </View>
                    <View style={styles.flexOne}>
                      <AppInput
                        label="Độ ẩm Max (%)"
                        value={humidityMax}
                        onChangeText={(v) => { setHumidityMax(v); setIsFormDirty(true); }}
                        keyboardType="numeric"
                        required
                      />
                    </View>
                  </View>

                  <View style={styles.rowTwoInputs}>
                    <View style={styles.flexOne}>
                      <AppInput
                        label="Bật bù ẩm khi dưới (%)"
                        value={humidityStartThreshold}
                        onChangeText={(v) => { setHumidityStartThreshold(v); setIsFormDirty(true); }}
                        keyboardType="numeric"
                        required
                      />
                    </View>
                    <View style={styles.flexOne}>
                      <AppInput
                        label="Ngừng bù ẩm khi đạt (%)"
                        value={humidityStopThreshold}
                        onChangeText={(v) => { setHumidityStopThreshold(v); setIsFormDirty(true); }}
                        keyboardType="numeric"
                        required
                      />
                    </View>
                  </View>

                  {coolingEnabled && (
                    <>
                      <AppDivider spacing="xs" />
                      <AppText variant="caption" weight="bold" color={theme.colors.text.muted}>
                        NGƯỠNG LÀM MÁT & NHIỆT ĐỘ (°C)
                      </AppText>

                      <View style={styles.rowTwoInputs}>
                        <View style={styles.flexOne}>
                          <AppInput
                            label="Nhiệt độ Min (°C)"
                            value={tempMin}
                            onChangeText={(v) => { setTempMin(v); setIsFormDirty(true); }}
                            keyboardType="numeric"
                            required
                          />
                        </View>
                        <View style={styles.flexOne}>
                          <AppInput
                            label="Nhiệt độ Max (°C)"
                            value={tempMax}
                            onChangeText={(v) => { setTempMax(v); setIsFormDirty(true); }}
                            keyboardType="numeric"
                            required
                          />
                        </View>
                      </View>

                      <View style={styles.rowTwoInputs}>
                        <View style={styles.flexOne}>
                          <AppInput
                            label="Bật làm mát khi đạt (°C)"
                            value={tempStartThreshold}
                            onChangeText={(v) => { setTempStartThreshold(v); setIsFormDirty(true); }}
                            keyboardType="numeric"
                            required
                          />
                        </View>
                        <View style={styles.flexOne}>
                          <AppInput
                            label="Dừng làm mát khi xuống (°C)"
                            value={tempStopThreshold}
                            onChangeText={(v) => { setTempStopThreshold(v); setIsFormDirty(true); }}
                            keyboardType="numeric"
                            required
                          />
                        </View>
                      </View>

                      <View style={styles.rowTwoInputs}>
                        <View style={styles.flexOne}>
                          <AppInput
                            label="Trần độ ẩm làm mát (%)"
                            value={coolingHumidityLimit}
                            onChangeText={(v) => { setCoolingHumidityLimit(v); setIsFormDirty(true); }}
                            keyboardType="numeric"
                            required
                          />
                        </View>
                        <View style={styles.flexOne}>
                          <AppInput
                            label="Độ chênh nhiệt độ max (°C)"
                            value={maxTempSpreadC}
                            onChangeText={(v) => { setMaxTempSpreadC(v); setIsFormDirty(true); }}
                            keyboardType="numeric"
                            required
                          />
                        </View>
                      </View>
                    </>
                  )}

                  <AppDivider spacing="xs" />
                  <AppText variant="caption" weight="bold" color={theme.colors.text.muted}>
                    XUNG PHUN VÀ CHU KỲ (GIÂY)
                  </AppText>

                  <View style={styles.rowTwoInputs}>
                    <View style={styles.flexOne}>
                      <AppInput
                        label="Xung phun (giây)"
                        value={mistingPulseSec}
                        onChangeText={(v) => { setMistingPulseSec(v); setIsFormDirty(true); }}
                        keyboardType="numeric"
                        required
                      />
                    </View>
                    <View style={styles.flexOne}>
                      <AppInput
                        label="Nghỉ Cooldown (giây)"
                        value={cooldownSec}
                        onChangeText={(v) => { setCooldownSec(v); setIsFormDirty(true); }}
                        keyboardType="numeric"
                        required
                      />
                    </View>
                  </View>

                  <View style={styles.rowTwoInputs}>
                    <View style={styles.flexOne}>
                      <AppInput
                        label="Chu kỳ đánh giá (giây)"
                        value={evalIntervalSec}
                        onChangeText={(v) => { setEvalIntervalSec(v); setIsFormDirty(true); }}
                        keyboardType="numeric"
                        required
                      />
                    </View>
                    <View style={styles.flexOne}>
                      <AppInput
                        label="Tuổi cảm biến max (giây)"
                        value={sensorMaxAgeSec}
                        onChangeText={(v) => { setSensorMaxAgeSec(v); setIsFormDirty(true); }}
                        keyboardType="numeric"
                        required
                      />
                    </View>
                  </View>

                  <AppDivider spacing="xs" />
                  <AppText variant="caption" weight="bold" color={theme.colors.text.muted}>
                    GIỚI HẠN AN TOÀN & BẢO VỆ VAN
                  </AppText>

                  <View style={styles.rowTwoInputs}>
                    <View style={styles.flexOne}>
                      <AppInput
                        label="Cảm biến hợp lệ tối thiểu"
                        value={requiredSensors}
                        onChangeText={(v) => { setRequiredSensors(v); setIsFormDirty(true); }}
                        keyboardType="numeric"
                        required
                      />
                    </View>
                    <View style={styles.flexOne}>
                      <AppInput
                        label="Độ lệch ẩm max (%)"
                        value={maxSensorSpreadPercent}
                        onChangeText={(v) => { setMaxSensorSpreadPercent(v); setIsFormDirty(true); }}
                        keyboardType="numeric"
                        required
                      />
                    </View>
                  </View>

                  <View style={styles.rowTwoInputs}>
                    <View style={styles.flexOne}>
                      <AppInput
                        label="Lần kích hoạt max/giờ"
                        value={maxActivationsPerHour}
                        onChangeText={(v) => { setMaxActivationsPerHour(v); setIsFormDirty(true); }}
                        keyboardType="numeric"
                        required
                      />
                    </View>
                    <View style={styles.flexOne}>
                      <AppInput
                        label="Tổng thời gian max (giây/giờ)"
                        value={maxCumulativeOnSecPerHour}
                        onChangeText={(v) => { setMaxCumulativeOnSecPerHour(v); setIsFormDirty(true); }}
                        keyboardType="numeric"
                        required
                      />
                    </View>
                  </View>
                </View>
              )}

              <AppButton
                title="Lưu cấu hình & Tiếp tục →"
                variant="primary"
                size="lg"
                loading={actionLoading}
                disabled={currentFloorBusy || (suggestions?.config === null)}
                onPress={handleSaveConfig}
                style={styles.btnFull}
              />
              {suggestions?.config === null && (
                <AppText variant="caption" color={theme.colors.error.main} style={{ textAlign: 'center' }}>
                  Không thể lưu cấu hình do chưa có phiên trồng hợp lệ hoặc điều kiện xung đột.
                </AppText>
              )}
            </AppCard>
          </View>
        )}

        {/* ================= STEP 5: VẬN HÀNH & GIÁM SÁT ================= */}
        {step === 5 && (
          <View style={styles.section}>
            {/* Real-time Status Card */}
            <AppCard elevation="sm" style={styles.statusCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardInfo}>
                  <AppText variant="title" weight="bold">
                    {selectedFloor?.floor_name}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Kênh SSR: {selectedFloor?.misting_ssr_channel} • Node: {selectedFloor?.node_address}
                  </AppText>
                </View>

                {/* Badges */}
                <View style={styles.badgesGroup}>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: statusData?.mode === 'AUTO' ? theme.colors.success.light : theme.colors.neutral[100] },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      weight="bold"
                      color={statusData?.mode === 'AUTO' ? theme.colors.success.dark : theme.colors.text.secondary}
                    >
                      {statusData?.mode === 'AUTO' ? 'CHẾ ĐỘ AUTO' : 'CHẾ ĐỘ MANUAL'}
                    </AppText>
                  </View>

                  {statusData?.run?.dry_run != null && (
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: statusData.run.dry_run
                            ? 'rgba(234, 179, 8, 0.15)'
                            : 'rgba(59, 130, 246, 0.15)',
                        },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        weight="bold"
                        color={statusData.run.dry_run ? theme.colors.warning.dark : '#2563EB'}
                      >
                        {statusData.run.dry_run ? 'MÔ PHỎNG (DRY RUN)' : 'CHẠY THẬT (PHẦN CỨNG)'}
                      </AppText>
                    </View>
                  )}
                </View>
              </View>

              <AppDivider spacing="xs" />

              {/* Control state display */}
              <View style={styles.controlStateBox}>
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Trạng thái điều khiển:
                </AppText>
                <AppText variant="h3" weight="bold" color={theme.colors.primary[700]}>
                  {statusData?.runtime?.control_state
                    ? AUTO_CONTROL_STATE_LABELS[statusData.runtime.control_state] || statusData.runtime.control_state
                    : 'Đang kết nối...'}
                </AppText>

                {statusData?.runtime?.control_state === 'MISTING' && (
                  <AppText variant="caption" color={theme.colors.warning.dark} style={{ marginTop: 2 }}>
                    Lưu ý: MISTING biểu thị đã gửi lệnh bật; không chứng minh nước thực tế đang chảy.
                  </AppText>
                )}

                {statusData?.runtime?.control_state === 'OFF_PENDING' && (
                  <AppText variant="caption" color={theme.colors.warning.dark} style={{ marginTop: 2 }}>
                    Đang chờ xác nhận tắt từ rơ-le. Sau khi Stop, hệ thống tiếp tục hiển thị chờ tắt cho đến khi nhận được báo cáo phản hồi thực tế.
                  </AppText>
                )}

                {statusData?.mode === 'MANUAL' && (
                  <AppText variant="caption" color={theme.colors.text.muted} style={{ marginTop: 2 }}>
                    (mode=MANUAL không đủ để kết luận van đã OFF; luôn quan sát trạng thái SSR bên dưới)
                  </AppText>
                )}
              </View>

              {/* SSR State & Demands */}
              <View style={styles.ssrGrid}>
                <View style={styles.ssrGridItem}>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Rơ-le SSR thực tế:
                  </AppText>
                  <AppText variant="title" weight="bold">
                    {statusData?.ssr?.reported_state === 'ON' ? 'BẬT (ON)' : statusData?.ssr?.reported_state === 'OFF' ? 'TẮT (OFF)' : (statusData?.ssr?.reported_state || '—')}
                  </AppText>
                </View>
                <View style={styles.ssrGridItem}>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Rơ-le SSR mong muốn:
                  </AppText>
                  <AppText variant="title" weight="bold">
                    {statusData?.ssr?.desired_state === 'ON' ? 'BẬT (ON)' : statusData?.ssr?.desired_state === 'OFF' ? 'TẮT (OFF)' : (statusData?.ssr?.desired_state || '—')}
                  </AppText>
                </View>
                <View style={styles.ssrGridItem}>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Nghỉ Cooldown:
                  </AppText>
                  <AppText variant="title" weight="bold" color={theme.colors.primary[600]}>
                    {statusData?.cooldownRemainingMs != null ? `${Math.round(statusData.cooldownRemainingMs / 1000)}s` : '0s'}
                  </AppText>
                </View>
                <View style={styles.ssrGridItem}>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Nhu cầu hiện tại:
                  </AppText>
                  <AppText variant="title" weight="bold">
                    {statusData?.runtime?.demand ? 'Bù ẩm' : ''}
                    {statusData?.runtime?.demand && statusData?.runtime?.cooling_demand ? ' + ' : ''}
                    {statusData?.runtime?.cooling_demand ? 'Làm mát' : ''}
                    {!statusData?.runtime?.demand && !statusData?.runtime?.cooling_demand ? 'Không có' : ''}
                  </AppText>
                </View>
              </View>

              {statusData?.runtime?.last_reason && (
                <View style={styles.reasonRow}>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Lý do: <AppText variant="caption" color={theme.colors.text.primary}>{statusData.runtime.last_reason}</AppText>
                  </AppText>
                </View>
              )}

              {statusData?.runtime?.last_error && (
                <View style={styles.errorBox}>
                  <Ionicons name="warning" size={14} color={theme.colors.error.main} />
                  <AppText variant="caption" color={theme.colors.error.main}>
                    {statusData.runtime.last_error}
                  </AppText>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionsGrid}>
                <AppButton
                  title="Đánh giá vi khí hậu (Evaluate)"
                  variant="outline"
                  size="sm"
                  loading={actionLoading}
                  onPress={handleEvaluate}
                  leftIcon={<Ionicons name="eye-outline" size={16} color={theme.colors.primary[600]} />}
                />

                <View style={styles.runActionRow}>
                  <AppButton
                    title="Mô phỏng (Dry Run)"
                    variant="secondary"
                    size="md"
                    style={styles.flexOne}
                    loading={actionLoading}
                    disabled={currentFloorBusy}
                    onPress={handleStartDryRun}
                  />
                  <AppButton
                    title="Bắt đầu chạy thật"
                    variant="primary"
                    size="md"
                    style={styles.flexOne}
                    loading={actionLoading}
                    disabled={currentFloorBusy}
                    onPress={handleStartRealRun}
                  />
                </View>

                <AppButton
                  title="Dừng tự động hóa (Stop)"
                  variant="danger"
                  size="md"
                  loading={actionLoading}
                  disabled={!currentFloorBusy && statusData?.runtime?.control_state === 'DISABLED'}
                  onPress={handleStopAuto}
                  leftIcon={<Ionicons name="stop-circle" size={18} color="#FFFFFF" />}
                />
              </View>
            </AppCard>

            {/* Environment Sensor Card */}
            <AppCard elevation="sm" style={styles.envCard}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <AppText variant="title" weight="bold">
                    Cảm biến môi trường
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    Node #{envData?.nodeId ?? selectedFloor?.node_address} • Master {envData?.masterId || '—'}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.healthBadge,
                    {
                      backgroundColor: envData?.healthy
                        ? 'rgba(34, 197, 94, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    weight="bold"
                    color={envData?.healthy ? theme.colors.success.dark : theme.colors.error.main}
                  >
                    {envData?.healthy ? 'Cảm biến khỏe' : envData?.reason || 'Lỗi cảm biến'}
                  </AppText>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Độ ẩm trung bình
                  </AppText>
                  <AppText variant="h2" weight="bold" color={theme.colors.primary[600]}>
                    {envData?.averageHumidity != null ? `${envData.averageHumidity.toFixed(1)}%` : '—'}
                  </AppText>
                </View>
                <AppDivider orientation="vertical" spacing="md" />
                <View style={styles.metricItem}>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Nhiệt độ trung bình
                  </AppText>
                  <AppText variant="h2" weight="bold" color={theme.colors.text.primary}>
                    {envData?.averageTemperature != null ? `${envData.averageTemperature.toFixed(1)}°C` : '—'}
                  </AppText>
                </View>
              </View>

              {/* Individual sensors */}
              {envData?.sensors && envData.sensors.length > 0 && (
                <View style={styles.sensorPillsRow}>
                  {envData.sensors.map((s) => (
                    <View key={s.sensorId} style={styles.sensorMiniBadge}>
                      <AppText variant="caption" weight="bold">
                        Sensor #{s.sensorId}:
                      </AppText>
                      <AppText variant="caption">
                        {s.humidity != null ? `${s.humidity.toFixed(0)}%` : 'N/A'} • {s.temperature != null ? `${s.temperature.toFixed(1)}°C` : 'N/A'}
                      </AppText>
                      <AppText variant="caption" color={s.valid ? theme.colors.success.main : theme.colors.error.main}>
                        ({s.valid ? 'Hợp lệ' : 'Lỗi/Cũ'})
                      </AppText>
                    </View>
                  ))}
                </View>
              )}
            </AppCard>

            {/* Decision Logs Card */}
            <AppCard elevation="xs" style={styles.logsCard}>
              <View style={styles.sectionHeaderRow}>
                <AppText variant="label" color={theme.colors.text.muted}>
                  NHẬT KÝ QUYẾT ĐỊNH HỆ THỐNG
                </AppText>
                {hasMoreLogs && (
                  <AppButton
                    title="Tải thêm"
                    variant="ghost"
                    size="sm"
                    loading={loadingMoreLogs}
                    onPress={handleLoadMoreLogs}
                  />
                )}
              </View>

              {logs.length === 0 ? (
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Chưa có nhật ký quyết định nào.
                </AppText>
              ) : (
                <View style={styles.logsList}>
                  {logs.map((log, idx) => (
                    <View key={log.id ?? idx} style={styles.logItem}>
                      <Ionicons name="time-outline" size={14} color={theme.colors.text.muted} />
                      <View style={styles.logTextGroup}>
                        <View style={styles.titleRow}>
                          <AppText variant="caption" weight="bold">
                            {log.event_type}
                          </AppText>
                          {log.created_at && (
                            <AppText variant="caption" color={theme.colors.text.muted}>
                              {new Date(log.created_at).toLocaleTimeString()}
                            </AppText>
                          )}
                        </View>
                        <AppText variant="caption" color={theme.colors.text.secondary}>
                          {log.reason}
                        </AppText>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </AppCard>
          </View>
        )}
      </View>

      {/* ================= MODAL: GÁN LƯỢT THUÊ VÀO KHAY ================= */}
      <Modal
        visible={isAssignModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.sectionHeaderRow}>
              <AppText variant="title" weight="bold">
                Bắt đầu phiên trồng cho Khay {targetTrayForSession?.tray_code}
              </AppText>
              <Pressable onPress={() => setIsAssignModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text.muted} />
              </Pressable>
            </View>

            <AppText variant="caption" color={theme.colors.text.secondary}>
              Chọn đơn thuê đã thanh toán để gán loại nấm và tạo phiên trồng ACTIVE.
            </AppText>

            {loadingRentals ? (
              <ActivityIndicator size="small" color={theme.colors.primary[500]} style={{ marginVertical: 20 }} />
            ) : adminRentals.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="file-tray-outline" size={32} color={theme.colors.text.muted} />
                <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                  Không có đơn thuê nào đang ở trạng thái CONFIRMED / PREPARING để gán.
                </AppText>
              </View>
            ) : (
              <ScrollView style={styles.rentalListModal}>
                {adminRentals.map((r) => {
                  const isSel = selectedRentalId === r.rental_id;
                  return (
                    <Pressable
                      key={r.rental_id}
                      onPress={() => setSelectedRentalId(r.rental_id)}
                      style={[styles.rentalItemModal, isSel && styles.rentalItemModalSelected]}
                    >
                      <View style={styles.cardInfo}>
                        <AppText variant="bodySmall" weight="bold">
                          Đơn #{r.order_id} • Thuê #{r.rental_id}
                        </AppText>
                        <AppText variant="caption" color={theme.colors.text.secondary}>
                          Nấm: {r.mushroom_name || 'N/A'} • Khách: {r.customer_name || r.customer_email || '—'}
                        </AppText>
                      </View>
                      <Ionicons
                        name={isSel ? 'checkmark-circle' : 'radio-button-off'}
                        size={20}
                        color={isSel ? theme.colors.primary[600] : theme.colors.neutral[300]}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.modalBtnRow}>
              <AppButton
                title="Hủy"
                variant="ghost"
                size="md"
                style={styles.flexOne}
                onPress={() => setIsAssignModalVisible(false)}
              />
              <AppButton
                title="Xác nhận gán"
                variant="primary"
                size="md"
                style={styles.flexOne}
                loading={actionLoading}
                disabled={!selectedRentalId}
                onPress={handleConfirmStartSession}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

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
  stepsBar: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  stepItem: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  stepItemActive: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[500],
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listContainer: {
    gap: theme.spacing.sm,
  },
  cardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  iconBtn: {
    padding: 6,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  inputLabel: {
    marginTop: theme.spacing.xs,
  },
  masterSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  masterPills: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.xs,
  },
  masterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  masterPillActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[700],
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  switchCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  rowTwoInputs: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  flexOne: {
    flex: 1,
  },
  btnFull: {
    marginTop: theme.spacing.sm,
  },
  emptyBox: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  trayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  unassignedTrayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  cropsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  cropPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  cropPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  suggestionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commonGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
  },
  commonItem: {
    alignItems: 'center',
    flex: 1,
  },
  issuesBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  issueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  warningsBox: {
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  advancedSection: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  badgesGroup: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusPill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  controlStateBox: {
    paddingVertical: theme.spacing.xs,
  },
  ssrGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  ssrGridItem: {
    width: '47%',
  },
  reasonRow: {
    paddingTop: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: 6,
    borderRadius: theme.borderRadius.sm,
  },
  actionsGrid: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  runActionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  envCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  healthBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.sm,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  sensorPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  sensorMiniBadge: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  logsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  logsList: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    paddingVertical: 2,
  },
  logTextGroup: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    maxHeight: '80%',
  },
  rentalListModal: {
    maxHeight: 250,
    marginVertical: theme.spacing.xs,
  },
  rentalItemModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    marginBottom: theme.spacing.xs,
  },
  rentalItemModalSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
});
