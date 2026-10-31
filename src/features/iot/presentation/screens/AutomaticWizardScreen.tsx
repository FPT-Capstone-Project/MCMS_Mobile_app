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
import { cultivationRepository } from '../../../cultivation/data/repositories/CultivationRepository';
import type {
  CultivationRoom,
  CultivationTray,
} from '../../../cultivation/domain/entities/Cultivation';
import { CultivationTrayDetailModal } from '../../../cultivation/presentation/components/CultivationTrayDetailModal';
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
import {
  formatMistingCode,
  formatMistingBoolean,
  formatBackendMessage,
  getMistingFilterOptions,
  NO_DATA_TEXT,
  CONTROL_STATE_MAP,
} from '../../utils/mistingI18n';

/**
 * State label mapping matching SmartMush IoT contracts
 */
export const AUTO_CONTROL_STATE_LABELS: Record<AutoControlState, string> =
  CONTROL_STATE_MAP as Record<AutoControlState, string>;

/**
 * Dịch các thông báo warning, issue và reason từ hệ thống backend IoT sang tiếng Việt
 */
export const translateIotMessage = (rawMsg: string): string => {
  if (!rawMsg || typeof rawMsg !== 'string') return '';
  const trimmed = rawMsg.trim();

  // 1. Tra cứu chính xác
  const exactMap: Record<string, string> = {
    'Some crops lack CO2 data': 'Một số giống nấm thiếu dữ liệu CO₂.',
    'Some crops do not have CO2 data; CO2 compatibility check skipped':
      'Một số giống nấm chưa có dữ liệu CO₂; hệ thống bỏ qua kiểm tra tương thích CO₂.',
    'Missing CO2 data': 'Thiếu thông số CO₂ của giống nấm.',
    'Missing CO2 range': 'Chưa thiết lập khoảng CO₂ cho giống nấm.',
    'No active cultivation sessions found on this floor':
      'Chưa có phiên trồng nào đang hoạt động (ACTIVE) trên tầng này.',
    'No active sessions found':
      'Chưa có phiên trồng nào đang hoạt động (ACTIVE) trên tầng này.',
    'No distinct mushroom crops found':
      'Chưa tìm thấy giống nấm nào trên các khay của tầng này.',
    'No mushroom profiles found':
      'Không tìm thấy hồ sơ điều kiện của giống nấm.',
    'Incompatible humidity ranges':
      'Khoảng độ ẩm của các giống nấm bị xung đột (không có khoảng chung).',
    'Incompatible temperature ranges':
      'Khoảng nhiệt độ của các giống nấm bị xung đột (không có khoảng chung).',
    'No overlapping humidity range':
      'Các loại nấm trên tầng không có khoảng độ ẩm chung phù hợp.',
    'No overlapping temperature range':
      'Các loại nấm trên tầng không có khoảng nhiệt độ chung phù hợp.',
    'Empty humidity range':
      'Khoảng độ ẩm chung bị rỗng do điều kiện các loại nấm trái ngược nhau.',
    'Empty temperature range':
      'Khoảng nhiệt độ chung bị rỗng do điều kiện các loại nấm trái ngược nhau.',
    'Common humidity range is narrower than 2%':
      'Độ ẩm chung quá hẹp (dưới 2%), không đủ an toàn để thiết lập tự động.',
    'Common temperature range is narrower than 1°C':
      'Nhiệt độ chung quá hẹp (dưới 1°C), không đủ an toàn để thiết lập tự động.',
    'Cooling blocked by humidity limit; ventilation or other cooling required':
      'Làm mát bị chặn do độ ẩm đã chạm ngưỡng trần; cần thông gió hoặc giải pháp làm mát khác.',
    'Cooling blocked by humidity limit':
      'Làm mát bị chặn do độ ẩm chạm ngưỡng trần.',
    'Conflict between mushroom profiles':
      'Xung đột điều kiện sinh trưởng giữa các giống nấm trồng cùng tầng.',
    'Profile approved is required':
      'Yêu cầu người vận hành xác nhận duyệt cấu hình trước khi lưu/kích hoạt.',
    'Not enough valid sensors':
      'Không đủ số lượng cảm biến hợp lệ đang hoạt động.',
    'Sensor data is stale or invalid':
      'Dữ liệu cảm biến bị cũ hoặc không gửi về số đo hợp lệ.',
    'Floor is currently busy':
      'Tầng đang bận xử lý chu kỳ hoặc có lệnh chưa xác nhận.',
    'Floor not found':
      'Không tìm thấy thông tin tầng.',
    'Cannot save configuration':
      'Không thể lưu cấu hình.',
  };

  if (exactMap[trimmed]) {
    return exactMap[trimmed];
  }

  // 2. Nhận diện theo từ khóa và mẫu câu
  const lower = trimmed.toLowerCase();

  if (lower.includes('co2') && (lower.includes('lack') || lower.includes('missing') || lower.includes('skip') || lower.includes('not have') || lower.includes('without'))) {
    return 'Một số giống nấm chưa có dữ liệu CO₂; hệ thống bỏ qua kiểm tra tương thích CO₂.';
  }

  if (lower.includes('no active') && (lower.includes('session') || lower.includes('cultivation') || lower.includes('crop') || lower.includes('floor'))) {
    return 'Chưa có phiên trồng nào đang hoạt động (ACTIVE) trên tầng này. Vui lòng gán lượt thuê ở Bước 3.';
  }

  if (lower.includes('humidity') && (lower.includes('narrow') || lower.includes('less than') || lower.includes('2%') || lower.includes('2 percentage') || lower.includes('tight'))) {
    return 'Khoảng độ ẩm chung quá hẹp (dưới 2 điểm %), không thể tự động tạo cấu hình an toàn.';
  }

  if (lower.includes('temperature') && (lower.includes('narrow') || lower.includes('less than') || lower.includes('1°c') || lower.includes('1 deg') || lower.includes('tight'))) {
    return 'Khoảng nhiệt độ chung quá hẹp (dưới 1°C), không thể tự động tạo cấu hình an toàn.';
  }

  if (lower.includes('humidity') && (lower.includes('empty') || lower.includes('incompatible') || lower.includes('conflict') || lower.includes('no overlap'))) {
    return 'Độ ẩm sinh trưởng giữa các loại nấm bị xung đột (không tìm thấy khoảng độ ẩm chung).';
  }

  if (lower.includes('temperature') && (lower.includes('empty') || lower.includes('incompatible') || lower.includes('conflict') || lower.includes('no overlap'))) {
    return 'Nhiệt độ sinh trưởng giữa các loại nấm bị xung đột (không tìm thấy khoảng nhiệt độ chung).';
  }

  if (lower.includes('cooling') && (lower.includes('humidity limit') || lower.includes('ventilation'))) {
    return 'Làm mát bị chặn do độ ẩm chạm ngưỡng trần; cần thông gió hoặc biện pháp làm mát khác.';
  }

  if (lower.includes('cooling humidity limit must be greater than')) {
    return 'Trần độ ẩm làm mát phải lớn hơn ngưỡng dừng phun bù ẩm.';
  }

  if (lower.includes('cooling humidity limit must not exceed')) {
    return 'Trần độ ẩm làm mát không được vượt quá độ ẩm tối đa của nấm.';
  }

  if (lower.includes('profile approved') || lower.includes('profile_approved')) {
    return 'Vui lòng tích chọn xác nhận duyệt cấu hình trước khi lưu.';
  }

  if (lower.includes('sensor') && (lower.includes('valid') || lower.includes('require') || lower.includes('offline') || lower.includes('stale') || lower.includes('fault'))) {
    return 'Cảm biến chưa đủ số lượng hợp lệ hoặc dữ liệu đo bị gián đoạn.';
  }

  if (lower.includes('busy') || lower.includes('lock')) {
    return 'Tầng đang bận hoặc đang thực hiện chu kỳ phun; vui lòng đợi.';
  }

  return trimmed;
};

/**
 * Chuẩn hóa và dịch mã lỗi HTTP từ backend IoT sang tiếng Việt rõ ràng
 */
function formatApiErrorMessage(err: unknown, fallbackMessage: string): string {
  if (err && typeof err === 'object') {
    const errorObj = err as any;
    const status = errorObj.statusCode || errorObj.response?.status;
    const msg = errorObj.message || errorObj.response?.data?.message || fallbackMessage;
    switch (status) {
      case 400:
        return `Dữ liệu không hợp lệ (400): ${msg}`;
      case 401:
        return 'Phiên đăng nhập đã hết hạn (401). Vui lòng đăng nhập lại.';
      case 403:
        return 'Không có quyền thực hiện thao tác (403). Yêu cầu quyền iot.automation.manage.';
      case 409:
        return `Xung đột hoặc chưa đủ điều kiện (409): ${msg}`;
      case 503:
        return `Dịch vụ chưa sẵn sàng (503): ${msg}`;
      case 504:
        return `Quá thời gian gửi lệnh / chờ phản hồi từ thiết bị (504): ${msg}`;
      default:
        return msg;
    }
  }
  return typeof err === 'string' ? err : fallbackMessage;
}

export const AutomaticWizardScreen: React.FC = () => {
  const router = useRouter();
  const { canControlIot, canManageAutomation } = useAuth();

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
  const [totalRowsInput, setTotalRowsInput] = useState('');
  const [totalColumnsInput, setTotalColumnsInput] = useState('');

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
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [logs, setLogs] = useState<AutoControlLogItem[]>([]);
  const [logsOffset, setLogsOffset] = useState(0);
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [loadingMoreLogs, setLoadingMoreLogs] = useState(false);
  const [selectedLogEventType, setSelectedLogEventType] = useState<string>('ALL');

  // Status of all floors to track active sessions across the farm
  const [floorStatuses, setFloorStatuses] = useState<Record<number, AutoControlStatus>>({});
  const [loadingFloorStatuses, setLoadingFloorStatuses] = useState(false);

  // Tray Cultivation Detail Modal State
  const [selectedTrayForDetail, setSelectedTrayForDetail] = useState<CultivationTray | null>(null);
  const [trayDetailModalVisible, setTrayDetailModalVisible] = useState(false);

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

  // Fetch status of all floors to detect active AUTO sessions across rooms
  const fetchFloorStatuses = useCallback(async (floorsList: FloorMapping[]) => {
    try {
      setLoadingFloorStatuses(true);
      const results = await Promise.allSettled(
        floorsList.map(async (floor) => {
          const fid = floor.floor_id ?? floor.id;
          if (!fid) return null;
          const st = await iotRepository.getAutoControlStatus(fid);
          return { floorId: fid, status: st };
        })
      );
      const map: Record<number, AutoControlStatus> = {};
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value) {
          map[r.value.floorId] = r.value.status;
        }
      });
      setFloorStatuses(map);
    } catch {
      // Ignore background errors
    } finally {
      setLoadingFloorStatuses(false);
    }
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

      // Concurrently scan all floors for active runs
      fetchFloorStatuses(floorsData);
    } catch (err: unknown) {
      Alert.alert(
        'Lỗi nạp dữ liệu',
        typeof err === 'string' ? err : err instanceof Error ? err.message : 'Không thể tải thông tin hệ thống.'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedRoomId, masterIdInput, fetchFloorStatuses]);

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
            setIsNetworkError(false);
          }
        } catch {
          if (currentFloorIdRef.current === floorId) {
            setIsNetworkError(true);
          }
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
    if (currentFloorBusy || statusData?.runtime?.control_state === 'OFF_PENDING') {
      Alert.alert(
        'Không thể thực hiện',
        'Tầng đang chạy AUTO hoặc có lệnh điều khiển đang chờ / đang tắt (OFF_PENDING). Vui lòng dừng AUTO trước.'
      );
      return;
    }
    setEditingFloorId(null);
    setFloorNumberInput('');
    setFloorNameInput('');
    setNodeAddressInput('');
    setSsrChannelInput('');
    setFloorStatusInput('ACTIVE');
    setTotalRowsInput('');
    setTotalColumnsInput('');
    if (masters.length > 0) setMasterIdInput(String(masters[0].id));
    setIsCreatingFloor(true);
  };

  const handleOpenEditFloor = (floor: FloorMapping) => {
    if (
      (currentFloorBusy || statusData?.runtime?.control_state === 'OFF_PENDING') &&
      (floor.floor_id === selectedFloor?.floor_id || floor.id === selectedFloor?.id)
    ) {
      Alert.alert(
        'Không thể sửa',
        'Tầng đang chạy AUTO hoặc có lệnh ON/OFF đang xử lý (OFF_PENDING). Dừng AUTO và đợi xác nhận tắt trước khi sửa mapping.'
      );
      return;
    }
    setEditingFloorId(floor.floor_id ?? floor.id ?? null);
    setFloorNumberInput(String(floor.floor_number));
    setFloorNameInput(floor.floor_name);
    setMasterIdInput(String(floor.master_id));
    setNodeAddressInput(String(floor.node_address));
    setSsrChannelInput(String(floor.misting_ssr_channel));
    setFloorStatusInput(floor.status || 'ACTIVE');
    setTotalRowsInput(floor.total_rows != null ? String(floor.total_rows) : '');
    setTotalColumnsInput(floor.total_columns != null ? String(floor.total_columns) : '');
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

    let totalRows: number | null | undefined = undefined;
    if (totalRowsInput.trim()) {
      const rows = parseInt(totalRowsInput.trim(), 10);
      if (isNaN(rows) || rows < 1 || rows > 32767) {
        Alert.alert('Lỗi số hàng', 'Số hàng phải nằm trong khoảng 1 đến 32767.');
        return;
      }
      totalRows = rows;
    } else if (editingFloorId) {
      totalRows = null;
    }

    let totalCols: number | null | undefined = undefined;
    if (totalColumnsInput.trim()) {
      const cols = parseInt(totalColumnsInput.trim(), 10);
      if (isNaN(cols) || cols < 1 || cols > 32767) {
        Alert.alert('Lỗi số cột', 'Số cột phải nằm trong khoảng 1 đến 32767.');
        return;
      }
      totalCols = cols;
    } else if (editingFloorId) {
      totalCols = null;
    }

    const mappingPayload: FloorMapping = {
      room_id: selectedRoomId,
      floor_number: floorNum,
      floor_name: floorNameInput.trim() || `Tầng ${floorNum}`,
      master_id: masterId,
      node_address: nodeAddr,
      misting_ssr_channel: ssrChan,
      status: floorStatusInput,
      ...(totalRows !== undefined && { total_rows: totalRows }),
      ...(totalCols !== undefined && { total_columns: totalCols }),
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
      Alert.alert('Lỗi lưu mapping', formatApiErrorMessage(err, 'Không thể lưu mapping tầng.'));
    } finally {
      setActionLoading(false);
    }
  };

  // ================= STEP 3 ACTIONS: TRAY & CULTIVATION SESSION =================
  const handleAssignTrayToFloor = async (tray: CultivationTray) => {
    const floorId = selectedFloor?.floor_id ?? selectedFloor?.id;
    if (!floorId) return;

    if (currentFloorBusy || statusData?.runtime?.control_state === 'OFF_PENDING') {
      Alert.alert(
        'Khóa thao tác',
        'Không thể gán khay khi tầng đang chạy AUTO hoặc có lệnh chưa xác nhận / đang chờ tắt (OFF_PENDING).'
      );
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
        formatApiErrorMessage(err, 'Lỗi gán khay vào tầng.')
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

    if (!canManageAutomation) {
      Alert.alert('Không có quyền', 'Bạn không có quyền quản lý tự động hóa (yêu cầu quyền iot.automation.manage).');
      return;
    }

    if (currentFloorBusy || statusData?.runtime?.control_state === 'OFF_PENDING') {
      Alert.alert(
        'Khóa sửa cấu hình',
        'Không thể sửa cấu hình khi AUTO đang chạy hoặc van đang mở/chờ tắt (OFF_PENDING).'
      );
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
      Alert.alert('Lưu cấu hình thất bại', formatApiErrorMessage(err, 'Không thể lưu cấu hình.'));
    } finally {
      setActionLoading(false);
    }
  };

  // ================= STEP 5 ACTIONS: EVALUATE, START, STOP =================
  const handleEvaluate = async () => {
    const floorId = selectedFloor?.floor_id ?? selectedFloor?.id;
    if (!floorId) return;

    if (!canManageAutomation) {
      Alert.alert('Không có quyền', 'Bạn không có quyền quản lý tự động hóa (yêu cầu quyền iot.automation.manage).');
      return;
    }

    try {
      setActionLoading(true);
      const res = await iotRepository.evaluateAutoControl(floorId);
      Alert.alert(
        'Kết quả Đánh giá vi khí hậu',
        `Hành động: ${res.decision.action}\nTrạng thái: ${res.decision.state}\nLý do: ${res.decision.reason}`
      );
    } catch (err: unknown) {
      Alert.alert('Lỗi đánh giá', formatApiErrorMessage(err, 'Không thể đánh giá vi khí hậu.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartDryRun = async () => {
    const floorId = selectedFloor?.floor_id ?? selectedFloor?.id;
    if (!floorId) return;

    if (!canManageAutomation) {
      Alert.alert('Không có quyền', 'Bạn không có quyền quản lý tự động hóa (yêu cầu quyền iot.automation.manage).');
      return;
    }

    if (currentFloorBusy || statusData?.runtime?.control_state === 'OFF_PENDING') {
      Alert.alert('Không thể khởi chạy', 'Tầng đang chạy hoặc đang chờ tắt (OFF_PENDING). Vui lòng đợi hoàn tất.');
      return;
    }

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
      setFloorStatuses((prev) => ({ ...prev, [floorId]: st }));
    } catch (err: unknown) {
      Alert.alert(
        'Lỗi khởi chạy mô phỏng',
        formatApiErrorMessage(err, 'Không thể bắt đầu mô phỏng.')
      );
      // Re-check status on timeout / error
      iotRepository.getAutoControlStatus(floorId).then((st) => {
        setStatusData(st);
        setFloorStatuses((prev) => ({ ...prev, [floorId]: st }));
      }).catch(() => {});
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartRealRun = () => {
    const floorId = selectedFloor?.floor_id ?? selectedFloor?.id;
    if (!floorId) return;

    if (!canManageAutomation) {
      Alert.alert('Không có quyền', 'Bạn không có quyền quản lý tự động hóa (yêu cầu quyền iot.automation.manage).');
      return;
    }

    if (currentFloorBusy || statusData?.runtime?.control_state === 'OFF_PENDING') {
      Alert.alert('Không thể khởi chạy', 'Tầng đang chạy hoặc đang chờ tắt (OFF_PENDING). Vui lòng đợi hoàn tất.');
      return;
    }

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
              setFloorStatuses((prev) => ({ ...prev, [floorId]: st }));
            } catch (err: unknown) {
              Alert.alert(
                'Khởi chạy thực tế thất bại',
                formatApiErrorMessage(err, 'Không thể kích hoạt chạy thật.')
              );
              // Re-check real state
              iotRepository.getAutoControlStatus(floorId).then((st) => {
                setStatusData(st);
                setFloorStatuses((prev) => ({ ...prev, [floorId]: st }));
              }).catch(() => {});
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

    if (!canManageAutomation) {
      Alert.alert('Không có quyền', 'Bạn không có quyền quản lý tự động hóa (yêu cầu quyền iot.automation.manage).');
      return;
    }

    try {
      setActionLoading(true);
      const res = await iotRepository.stopAutoControl(floorId);
      setStatusData(res);
      setFloorStatuses((prev) => ({ ...prev, [floorId]: res }));
      Alert.alert(
        'Đã dừng tự động',
        'Đã gửi lệnh dừng. Hệ thống chuyển về MANUAL. Nếu còn OFF_PENDING, hệ thống sẽ tiếp tục đợi xác nhận từ rơ-le.'
      );
    } catch (err: unknown) {
      Alert.alert(
        'Lỗi dừng AUTO',
        formatApiErrorMessage(err, 'Không thể dừng tiến trình.')
      );
      iotRepository.getAutoControlStatus(floorId).then((st) => {
        setStatusData(st);
        setFloorStatuses((prev) => ({ ...prev, [floorId]: st }));
      }).catch(() => {});
    } finally {
      setActionLoading(false);
    }
  };

  // Direct Navigation Helpers
  const canNavigateToStep = (targetStep: number): boolean => {
    if (targetStep === 1) return true;
    if (targetStep === 2) return selectedRoomId != null;
    return selectedFloor != null;
  };

  const handleJumpToStep5 = useCallback(
    (floor: FloorMapping) => {
      setSelectedFloor(floor);
      if (floor.room_id) {
        setSelectedRoomId(floor.room_id);
      }
      const floorId = floor.floor_id ?? floor.id;
      if (floorId) {
        loadFloorCultivationAndConfig(floorId);
        loadFloorSuggestions(floorId, true);
        if (floorStatuses[floorId]) {
          setStatusData(floorStatuses[floorId]);
        }
      }
      setStep(5);
    },
    [floorStatuses, loadFloorCultivationAndConfig, loadFloorSuggestions]
  );

  const handleJumpToStep4 = useCallback(
    (floor: FloorMapping) => {
      setSelectedFloor(floor);
      if (floor.room_id) {
        setSelectedRoomId(floor.room_id);
      }
      const floorId = floor.floor_id ?? floor.id;
      if (floorId) {
        loadFloorCultivationAndConfig(floorId);
        loadFloorSuggestions(floorId, true);
        if (floorStatuses[floorId]) {
          setStatusData(floorStatuses[floorId]);
        }
      }
      setStep(4);
    },
    [floorStatuses, loadFloorCultivationAndConfig, loadFloorSuggestions]
  );

  const handleQuickStop = useCallback(
    (floor: FloorMapping, roomName?: string) => {
      const floorId = floor.floor_id ?? floor.id;
      if (!floorId) return;

      if (!canManageAutomation) {
        Alert.alert('Không có quyền', 'Bạn không có quyền quản lý tự động hóa (yêu cầu quyền iot.automation.manage).');
        return;
      }

      Alert.alert(
        'DỪNG TỰ ĐỘNG KHẨN CẤP',
        `Bạn có chắc chắn muốn dừng chế độ tự động cho "${floor.floor_name}"${roomName ? ` (${roomName})` : ''} và tắt rơ-le phun sương ngay lập tức?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Dừng ngay',
            style: 'destructive',
            onPress: async () => {
              try {
                setActionLoading(true);
                const res = await iotRepository.stopAutoControl(floorId);
                Alert.alert('Đã dừng thành công', `Hệ thống đã dừng điều khiển tự động cho ${floor.floor_name}.`);
                setFloorStatuses((prev) => ({ ...prev, [floorId]: res }));
                if ((selectedFloor?.floor_id ?? selectedFloor?.id) === floorId) {
                  setStatusData(res);
                }
              } catch (err: unknown) {
                Alert.alert('Lỗi dừng tự động', formatApiErrorMessage(err, 'Không thể dừng tiến trình.'));
              } finally {
                setActionLoading(false);
              }
            },
          },
        ]
      );
    },
    [selectedFloor, canManageAutomation]
  );

  // Active running sessions across all floors
  const activeFloorSessions = floors
    .map((floor) => {
      const fid = floor.floor_id ?? floor.id;
      const status = fid ? floorStatuses[fid] : undefined;
      const room = rooms.find((r) => r.room_id === floor.room_id);
      return { floor, room, status };
    })
    .filter((item): item is { floor: FloorMapping; room: CultivationRoom | undefined; status: AutoControlStatus } => {
      if (!item.status) return false;
      const isAuto = item.status.mode === 'AUTO';
      const isRunning = item.status.run?.status === 'RUNNING';
      const isTransitional = ['MISTING', 'ON_REQUESTED', 'OFF_PENDING'].includes(
        item.status.runtime?.control_state
      );
      return isAuto || isRunning || isTransitional;
    });

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
          ].map((item) => {
            const isAccessible = canNavigateToStep(item.s);
            const isActive = step === item.s;
            return (
              <Pressable
                key={item.s}
                onPress={() => {
                  if (isAccessible) {
                    setStep(item.s as any);
                  } else {
                    if (item.s === 2 && !selectedRoomId) {
                      Alert.alert('Chưa chọn phòng', 'Vui lòng chọn một phòng nuôi trồng ở Bước 1 trước.');
                    } else if (item.s >= 3 && !selectedFloor) {
                      Alert.alert('Chưa chọn tầng', 'Vui lòng chọn một tầng ở Bước 2 trước khi sang bước này.');
                    }
                  }
                }}
                style={[
                  styles.stepItem,
                  isActive && styles.stepItemActive,
                  !isAccessible && styles.stepItemDisabled,
                ]}
              >
                <AppText
                  variant="caption"
                  weight={isActive ? 'bold' : 'normal'}
                  color={
                    isActive
                      ? theme.colors.primary[600]
                      : isAccessible
                      ? theme.colors.text.primary
                      : theme.colors.text.muted
                  }
                >
                  {item.title}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ================= STEP 1: CHỌN PHÒNG & TỔNG QUAN AUTO ================= */}
        {step === 1 && (
          <View style={styles.section}>
            {/* Active Sessions Overview */}
            <View style={styles.activeSessionsContainer}>
              <View style={styles.activeSessionsHeader}>
                <View style={styles.activeSessionsTitleRow}>
                  <Ionicons name="flash" size={18} color={theme.colors.secondary[700]} />
                  <AppText variant="title" weight="bold" style={{ marginLeft: 6 }}>
                    Phiên Tự Động Đang Vận Hành ({activeFloorSessions.length})
                  </AppText>
                </View>
                <Pressable
                  onPress={() => fetchFloorStatuses(floors)}
                  style={styles.refreshIconBtn}
                  hitSlop={8}
                >
                  {loadingFloorStatuses ? (
                    <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                  ) : (
                    <Ionicons name="refresh" size={18} color={theme.colors.primary[600]} />
                  )}
                </Pressable>
              </View>

              {activeFloorSessions.length === 0 ? (
                <View style={styles.emptyActiveBox}>
                  <Ionicons name="checkmark-circle-outline" size={22} color={theme.colors.success.main} />
                  <AppText variant="caption" color={theme.colors.text.secondary} style={{ marginLeft: 8 }}>
                    Hiện không có tầng nào đang chạy tự động.
                  </AppText>
                </View>
              ) : (
                <View style={styles.activeCardsList}>
                  {activeFloorSessions.map(({ floor, room, status }) => {
                    const floorId = floor.floor_id ?? floor.id;
                    const isDryRun = status.run?.dry_run;
                    const isFault =
                      status.run?.status === 'FAULT' ||
                      status.runtime?.control_state === 'FAULT' ||
                      status.runtime?.control_state === 'SENSOR_FAULT';
                    const ssrOn = status.ssr?.reported_state === 'ON';
                    const stateLabel = formatMistingCode('controlState', status.runtime?.control_state);

                    return (
                      <AppCard key={floorId} elevation="sm" style={styles.activeCard}>
                        <View style={styles.activeCardHeader}>
                          <View style={styles.activeCardTitleCol}>
                            <View style={styles.activeCardTitleRow}>
                              <Ionicons name="layers" size={16} color={theme.colors.primary[600]} />
                              <AppText variant="title" weight="bold" style={{ marginLeft: 6 }}>
                                {floor.floor_name}
                              </AppText>
                              <AppText variant="caption" color={theme.colors.text.secondary} style={{ marginLeft: 6 }}>
                                • {room?.room_name || `Phòng ID ${floor.room_id}`}
                              </AppText>
                            </View>
                            <AppText variant="caption" color={theme.colors.text.secondary}>
                              Master: {floor.master_id} • Node {floor.node_address} • Kênh SSR {floor.misting_ssr_channel}
                            </AppText>
                          </View>

                          {/* Status Badge */}
                          <View
                            style={[
                              styles.statusBadge,
                              isFault
                                ? styles.statusBadgeFault
                                : isDryRun
                                ? styles.statusBadgeDryRun
                                : styles.statusBadgeRunning,
                            ]}
                          >
                            <Ionicons
                              name={isFault ? 'alert-circle' : isDryRun ? 'flask' : 'play'}
                              size={12}
                              color="#FFFFFF"
                            />
                            <AppText variant="caption" weight="bold" color="#FFFFFF" style={{ marginLeft: 4, fontSize: 10 }}>
                              {isFault ? 'LỖI' : isDryRun ? 'MÔ PHỎNG' : formatMistingCode('runStatus', status.run?.status)}
                            </AppText>
                          </View>
                        </View>

                        {/* Live sensor & state info */}
                        <View style={styles.activeCardMetricsRow}>
                          <View style={styles.metricItem}>
                            <AppText variant="caption" color={theme.colors.text.secondary}>
                              Trạng thái
                            </AppText>
                            <AppText
                              variant="caption"
                              weight="bold"
                              color={isFault ? theme.colors.error.main : theme.colors.primary[700]}
                            >
                              {stateLabel}
                            </AppText>
                          </View>
                          <View style={styles.metricItem}>
                            <AppText variant="caption" color={theme.colors.text.secondary}>
                              Rơ-le SSR
                            </AppText>
                            <AppText
                              variant="caption"
                              weight="bold"
                              color={ssrOn ? theme.colors.success.main : theme.colors.text.secondary}
                            >
                              {formatMistingCode('ssrState', status.ssr?.reported_state)}
                            </AppText>
                          </View>
                          {status.environment && (
                            <View style={styles.metricItem}>
                              <AppText variant="caption" color={theme.colors.text.secondary}>
                                Khí hậu đo
                              </AppText>
                              <AppText variant="caption" weight="bold" style={{ textAlign: 'center' }}>
                                {status.environment.averageTemperature != null
                                  ? `${Number(status.environment.averageTemperature).toFixed(2)}°C`
                                  : '--'}{' '}
                                •{' '}
                                {status.environment.averageHumidity != null
                                  ? `${Number(status.environment.averageHumidity).toFixed(2)}%`
                                  : '--'}
                              </AppText>
                            </View>
                          )}
                        </View>

                        {/* Quick Action Buttons */}
                        <View style={styles.activeCardActionsRow}>
                          <AppButton
                            title="Dừng ngay (STOP)"
                            variant="danger"
                            size="sm"
                            style={styles.activeActionBtn}
                            loading={actionLoading}
                            onPress={() => handleQuickStop(floor, room?.room_name)}
                          />
                          <AppButton
                            title="Vào giám sát (Bước 5) ⚡"
                            variant="primary"
                            size="sm"
                            style={styles.activeActionBtn}
                            onPress={() => handleJumpToStep5(floor)}
                          />
                        </View>
                      </AppCard>
                    );
                  })}
                </View>
              )}
            </View>

            <AppDivider spacing="sm" />

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

                <View style={styles.rowTwoInputs}>
                  <View style={styles.flexOne}>
                    <AppInput
                      label="Số hàng khay (1 - 32767)"
                      placeholder="Tùy chọn, ví dụ: 10"
                      value={totalRowsInput}
                      onChangeText={setTotalRowsInput}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.flexOne}>
                    <AppInput
                      label="Số cột khay (1 - 32767)"
                      placeholder="Tùy chọn, ví dụ: 5"
                      value={totalColumnsInput}
                      onChangeText={setTotalColumnsInput}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={styles.switchRow}>
                  <AppText variant="label">Trạng thái tầng: {formatMistingCode('floorStatus', floorStatusInput)}</AppText>
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
                    const status = floorId ? floorStatuses[floorId] : undefined;
                    const isAutoRunning = status?.mode === 'AUTO' || status?.run?.status === 'RUNNING';
                    const isDryRun = status?.run?.dry_run;
                    const isFault =
                      status?.run?.status === 'FAULT' ||
                      status?.runtime?.control_state === 'FAULT' ||
                      status?.runtime?.control_state === 'SENSOR_FAULT';
                    const stateLabel = status?.runtime?.control_state
                      ? formatMistingCode('controlState', status.runtime.control_state)
                      : null;

                    return (
                      <AppCard
                        key={floorId || floor.floor_number}
                        elevation={isSelected ? 'md' : 'xs'}
                        style={[styles.cardItem, isSelected && styles.cardSelected]}
                      >
                        <Pressable
                          onPress={() => handleSelectFloor(floor)}
                          style={styles.cardHeaderRow}
                        >
                          <View style={styles.iconCircle}>
                            <Ionicons name="layers" size={22} color={theme.colors.primary[600]} />
                          </View>
                          <View style={styles.cardInfo}>
                            <View style={styles.rowAlign}>
                              <AppText variant="title" weight="bold">
                                {floor.floor_name} (Tầng {floor.floor_number})
                              </AppText>
                              {isAutoRunning && (
                                <View
                                  style={[
                                    styles.miniBadge,
                                    isFault ? styles.statusBadgeFault : isDryRun ? styles.statusBadgeDryRun : styles.statusBadgeRunning,
                                  ]}
                                >
                                  <AppText variant="caption" weight="bold" color="#FFFFFF" style={{ fontSize: 10 }}>
                                    {isFault ? 'LỖI' : isDryRun ? 'MÔ PHỎNG' : formatMistingCode('runStatus', status?.run?.status)}
                                  </AppText>
                                </View>
                              )}
                            </View>
                            <AppText variant="caption" color={theme.colors.text.secondary}>
                              Master: {masterMatch?.masterId || floor.master_id} • Node: {floor.node_address} • SSR Kênh {floor.misting_ssr_channel} • {formatMistingCode('floorStatus', floor.status)}
                            </AppText>
                            {stateLabel && (
                              <AppText variant="caption" color={isFault ? theme.colors.error.main : theme.colors.primary[700]} weight="bold">
                                Trạng thái: {stateLabel}
                              </AppText>
                            )}
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
                        </Pressable>

                        {/* Quick Navigation & Action Buttons for Floor */}
                        <View style={styles.floorQuickActionsRow}>
                          <Pressable
                            style={styles.floorQuickActionBtn}
                            onPress={() => handleSelectFloor(floor)}
                          >
                            <Ionicons name="cube-outline" size={13} color={theme.colors.primary[700]} />
                            <AppText variant="caption" weight="semibold" color={theme.colors.primary[700]} style={{ marginLeft: 4 }}>
                              Khay (B3)
                            </AppText>
                          </Pressable>

                          <Pressable
                            style={styles.floorQuickActionBtn}
                            onPress={() => handleJumpToStep4(floor)}
                          >
                            <Ionicons name="settings-outline" size={13} color={theme.colors.primary[700]} />
                            <AppText variant="caption" weight="semibold" color={theme.colors.primary[700]} style={{ marginLeft: 4 }}>
                              Cấu hình (B4)
                            </AppText>
                          </Pressable>

                          <Pressable
                            style={[styles.floorQuickActionBtn, styles.floorQuickActionBtnHighlight]}
                            onPress={() => handleJumpToStep5(floor)}
                          >
                            <Ionicons name="flash" size={13} color="#FFFFFF" />
                            <AppText variant="caption" weight="bold" color="#FFFFFF" style={{ marginLeft: 4 }}>
                              Vận hành (B5) ⚡
                            </AppText>
                          </Pressable>

                          {isAutoRunning && (
                            <Pressable
                              style={[styles.floorQuickActionBtn, styles.floorQuickActionBtnStop]}
                              onPress={() => {
                                const room = rooms.find((r) => r.room_id === selectedRoomId);
                                handleQuickStop(floor, room?.room_name);
                              }}
                            >
                              <Ionicons name="stop-circle" size={13} color={theme.colors.error.main} />
                              <AppText variant="caption" weight="bold" color={theme.colors.error.main} style={{ marginLeft: 4 }}>
                                Dừng
                              </AppText>
                            </Pressable>
                          )}
                        </View>
                      </AppCard>
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
                      <View style={styles.trayCardTopRow}>
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
                            <AppText variant="caption" color={theme.colors.text.secondary} style={styles.traySubtitle}>
                              Nấm: <AppText variant="caption" weight="bold">{tray.mushroom_name}</AppText> • Phiên #{tray.session_id} • Đơn thuê #{tray.rental_id}
                            </AppText>
                          ) : (
                            <AppText variant="caption" color={theme.colors.text.secondary} style={styles.traySubtitle}>
                              {tray.tray_status ? `Trạng thái: ${tray.tray_status} • ` : ''}Sẵn sàng gán lượt thuê
                            </AppText>
                          )}

                          {(tray.row_number != null ||
                            tray.column_number != null ||
                            tray.position_id != null) && (
                            <AppText
                              variant="caption"
                              color={theme.colors.text.secondary}
                              style={{ marginTop: 2 }}
                            >
                              Vị trí:{' '}
                              {tray.row_number != null && tray.column_number != null
                                ? `Hàng ${tray.row_number}, Cột ${tray.column_number}`
                                : ''}
                              {tray.position_id != null ? ` (Vị trí #${tray.position_id})` : ''}
                              {tray.position_status
                                ? ` • ${formatMistingCode('positionStatus', tray.position_status)}`
                                : ''}
                            </AppText>
                          )}
                        </View>
                      </View>

                      {hasActiveSession && (
                        <View style={styles.trayActionRow}>
                          <AppButton
                            title="Xem chi tiết nuôi trồng"
                            variant="ghost"
                            size="sm"
                            leftIcon={
                              <Ionicons
                                name="information-circle-outline"
                                size={16}
                                color={theme.colors.primary[600]}
                              />
                            }
                            onPress={() => {
                              const convertedTray: CultivationTray = {
                                tray_id: tray.tray_id,
                                room_id: selectedRoomId || 0,
                                floor_id: selectedFloor?.floor_id ?? selectedFloor?.id ?? null,
                                tray_code: tray.tray_code,
                                tray_name: `Khay ${tray.tray_code}`,
                                status: 'OCCUPIED',
                                session_id: tray.session_id,
                                rental_id: tray.rental_id,
                                mushroom_name: tray.mushroom_name,
                                mushroom_type_id: tray.mushroom_type_id,
                                cultivation_status: tray.cultivation_status,
                              };
                              setSelectedTrayForDetail(convertedTray);
                              setTrayDetailModalVisible(true);
                            }}
                          />
                        </View>
                      )}

                      {!hasActiveSession && canControlIot && (
                        <View style={styles.trayActionRow}>
                          <AppButton
                            title="Gán lượt thuê"
                            variant="outline"
                            size="sm"
                            disabled={currentFloorBusy}
                            onPress={() => handleOpenStartSessionModal(tray)}
                          />
                        </View>
                      )}
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

                {!suggestions.config && (
                  <View style={styles.noSuggestionNotice}>
                    <Ionicons name="alert-circle-outline" size={18} color={theme.colors.warning.dark} />
                    <AppText
                      variant="caption"
                      weight="bold"
                      color={theme.colors.warning.dark}
                      style={{ flex: 1, marginLeft: 6 }}
                    >
                      Không thể tạo cấu hình gợi ý tự động. Vui lòng kiểm tra các vấn đề bên dưới hoặc nhập thông số thủ công.
                    </AppText>
                  </View>
                )}

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
                        • {translateIotMessage(issue)}
                      </AppText>
                    ))}
                  </View>
                )}

                {/* Warnings if any */}
                {suggestions.warnings && suggestions.warnings.length > 0 && (
                  <View style={styles.warningsBox}>
                    {suggestions.warnings.map((warn, idx) => (
                      <AppText key={idx} variant="caption" color={theme.colors.warning.dark}>
                        ⚠️ {translateIotMessage(warn)}
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
                  <AppText variant="label">Làm mát bằng phun sương: {formatMistingBoolean('coolingEnabled', coolingEnabled)}</AppText>
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
                    Phê duyệt cấu hình: {formatMistingBoolean('profileApproved', profileApproved)} *
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

              <View style={styles.step4ActionButtons}>
                <AppButton
                  title="Lưu cấu hình & Tiếp tục →"
                  variant="primary"
                  size="md"
                  loading={actionLoading}
                  disabled={currentFloorBusy || statusData?.runtime?.control_state === 'OFF_PENDING' || suggestions?.config === null}
                  onPress={handleSaveConfig}
                  style={styles.flexOne}
                />
                <AppButton
                  title="Sang Vận hành (B5) ⚡"
                  variant="outline"
                  size="md"
                  onPress={() => setStep(5)}
                  style={styles.flexOne}
                />
              </View>
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
            {/* Network Offline Banner */}
            {isNetworkError && (
              <View style={styles.networkErrorBanner}>
                <Ionicons name="cloud-offline" size={20} color={theme.colors.error.main} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <AppText variant="caption" weight="bold" color={theme.colors.error.dark}>
                    Mất kết nối, chưa xác định trạng thái mới nhất
                  </AppText>
                  <AppText variant="caption" color={theme.colors.error.dark}>
                    Không thể kết nối máy chủ. Thao tác điều khiển tạm khóa để đảm bảo an toàn. Không tự động ngầm định van đã đóng.
                  </AppText>
                </View>
              </View>
            )}

            {/* OFF_PENDING Banner */}
            {statusData?.runtime?.control_state === 'OFF_PENDING' && (
              <View style={styles.offPendingBanner}>
                <ActivityIndicator size="small" color={theme.colors.warning.dark} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <AppText variant="caption" weight="bold" color={theme.colors.warning.dark}>
                    Đang chờ thiết bị xác nhận tắt
                  </AppText>
                  <AppText variant="caption" color={theme.colors.warning.dark}>
                    Đã gửi lệnh tắt, hệ thống đang đợi phản hồi xác nhận từ rơ-le SSR. Khóa Start và sửa cấu hình cho đến khi hoàn tất.
                  </AppText>
                </View>
              </View>
            )}

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
                      {statusData?.mode ? `CHẾ ĐỘ ${formatMistingCode('mode', statusData.mode).toUpperCase()}` : NO_DATA_TEXT}
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
                        {formatMistingBoolean('dryRun', statusData.run.dry_run).toUpperCase()}
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
                  {formatMistingCode('controlState', statusData?.runtime?.control_state)}
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
                    {formatMistingCode('ssrState', statusData?.ssr?.reported_state)}
                  </AppText>
                </View>
                <View style={styles.ssrGridItem}>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Rơ-le SSR mong muốn:
                  </AppText>
                  <AppText variant="title" weight="bold">
                    {formatMistingCode('ssrState', statusData?.ssr?.desired_state)}
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
                    Nhu cầu độ ẩm:
                  </AppText>
                  <AppText variant="captionMedium" weight="bold">
                    {formatMistingBoolean('demand', statusData?.runtime?.demand)}
                  </AppText>
                </View>
              </View>

              {/* Second row of demands & details */}
              <View style={[styles.ssrGrid, { marginTop: 8 }]}>
                <View style={styles.ssrGridItem}>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Nhu cầu làm mát:
                  </AppText>
                  <AppText variant="captionMedium" weight="bold">
                    {formatMistingBoolean('coolingDemand', statusData?.runtime?.cooling_demand)}
                  </AppText>
                </View>
                {statusData?.run?.status && (
                  <View style={styles.ssrGridItem}>
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Trạng thái phiên:
                    </AppText>
                    <AppText variant="captionMedium" weight="bold">
                      {formatMistingCode('runStatus', statusData.run.status)}
                    </AppText>
                  </View>
                )}
              </View>

              {statusData?.runtime?.last_reason && (
                <View style={styles.reasonRow}>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Lý do: <AppText variant="caption" color={theme.colors.text.primary}>{formatBackendMessage(statusData.runtime.last_reason)}</AppText>
                  </AppText>
                </View>
              )}

              {statusData?.run?.stop_reason && (
                <View style={styles.reasonRow}>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Lý do dừng phiên:{' '}
                    <AppText variant="caption" color={theme.colors.error.main} weight="bold">
                      {formatBackendMessage(statusData.run.stop_reason)}
                    </AppText>
                  </AppText>
                </View>
              )}

              {statusData?.runtime?.last_error && (
                <View style={styles.errorBox}>
                  <Ionicons name="warning" size={14} color={theme.colors.error.main} />
                  <AppText variant="caption" color={theme.colors.error.main}>
                    {formatBackendMessage(statusData.runtime.last_error)}
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
                  disabled={actionLoading || isNetworkError}
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
                    disabled={currentFloorBusy || isNetworkError || statusData?.runtime?.control_state === 'OFF_PENDING'}
                    onPress={handleStartDryRun}
                  />
                  <AppButton
                    title="Bắt đầu chạy thật"
                    variant="primary"
                    size="md"
                    style={styles.flexOne}
                    loading={actionLoading}
                    disabled={currentFloorBusy || isNetworkError || statusData?.runtime?.control_state === 'OFF_PENDING'}
                    onPress={handleStartRealRun}
                  />
                </View>

                <AppButton
                  title="Dừng tự động hóa (Stop)"
                  variant="danger"
                  size="md"
                  loading={actionLoading}
                  disabled={isNetworkError || (!currentFloorBusy && statusData?.runtime?.control_state === 'DISABLED')}
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
                    {formatMistingBoolean('environmentHealthy', envData?.healthy)}
                  </AppText>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Độ ẩm trung bình
                  </AppText>
                  <AppText variant="h2" weight="bold" color={theme.colors.primary[600]}>
                    {envData?.averageHumidity != null ? `${envData.averageHumidity.toFixed(2)}%` : '—'}
                  </AppText>
                </View>
                <AppDivider orientation="vertical" spacing="md" />
                <View style={styles.metricItem}>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Nhiệt độ trung bình
                  </AppText>
                  <AppText variant="h2" weight="bold" color={theme.colors.text.primary}>
                    {envData?.averageTemperature != null ? `${envData.averageTemperature.toFixed(2)}°C` : '—'}
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
                        {s.humidity != null ? `${s.humidity.toFixed(2)}%` : 'N/A'} • {s.temperature != null ? `${s.temperature.toFixed(2)}°C` : 'N/A'}
                      </AppText>
                      <AppText variant="caption" color={s.valid ? theme.colors.success.main : theme.colors.error.main}>
                        ({formatMistingBoolean('sensorValid', s.valid)})
                      </AppText>
                    </View>
                  ))}
                </View>
              )}
            </AppCard>

            {/* Last Decision Card */}
            {statusData?.lastDecision && (
              <AppCard elevation="xs" style={[styles.logsCard, { marginBottom: 12 }]}>
                <View style={styles.sectionHeaderRow}>
                  <AppText variant="label" color={theme.colors.text.muted}>
                    QUYẾT ĐỊNH ĐIỀU KHIỂN GẦN NHẤT
                  </AppText>
                  {statusData.lastDecision.created_at && (
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      {new Date(statusData.lastDecision.created_at).toLocaleTimeString('vi-VN')}
                    </AppText>
                  )}
                </View>

                <View style={styles.ssrGrid}>
                  <View style={styles.ssrGridItem}>
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Sự kiện:
                    </AppText>
                    <AppText variant="captionMedium" weight="bold">
                      {formatMistingCode('eventType', statusData.lastDecision.event_type)}
                    </AppText>
                  </View>
                  <View style={styles.ssrGridItem}>
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Hành động:
                    </AppText>
                    <AppText variant="captionMedium" weight="bold" color={theme.colors.primary[700]}>
                      {formatMistingCode('action', statusData.lastDecision.action)}
                    </AppText>
                  </View>
                  <View style={styles.ssrGridItem}>
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Trạng thái:
                    </AppText>
                    <AppText variant="captionMedium" weight="bold">
                      {formatMistingCode('controlState', statusData.lastDecision.state)}
                    </AppText>
                  </View>
                </View>

                {statusData.lastDecision.reason && (
                  <View style={[styles.reasonRow, { marginTop: 8 }]}>
                    <AppText variant="caption" color={theme.colors.text.muted}>
                      Lý do: <AppText variant="caption" color={theme.colors.text.primary}>{formatBackendMessage(statusData.lastDecision.reason)}</AppText>
                    </AppText>
                  </View>
                )}
              </AppCard>
            )}

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

              {/* Event Type Filter Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.logFilterPills}
              >
                {[
                  { label: 'Tất cả sự kiện', value: 'ALL' },
                  ...getMistingFilterOptions('eventType'),
                ].map((opt) => {
                  const isSel = selectedLogEventType === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setSelectedLogEventType(opt.value)}
                      style={[styles.logFilterPill, isSel && styles.logFilterPillActive]}
                    >
                      <AppText
                        variant="caption"
                        weight={isSel ? 'bold' : 'normal'}
                        color={isSel ? '#FFFFFF' : theme.colors.text.secondary}
                      >
                        {opt.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {logs.length === 0 ? (
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Chưa có nhật ký quyết định nào.
                </AppText>
              ) : (
                (() => {
                  const filteredLogs =
                    selectedLogEventType === 'ALL'
                      ? logs
                      : logs.filter((l) => l.event_type === selectedLogEventType);

                  if (filteredLogs.length === 0) {
                    return (
                      <AppText variant="caption" color={theme.colors.text.secondary}>
                        Không có nhật ký nào cho sự kiện này.
                      </AppText>
                    );
                  }

                  return (
                    <View style={styles.logsList}>
                      {filteredLogs.map((log, idx) => {
                        const isSimulation =
                          (log as any).dry_run === true ||
                          (log as any).dryRun === true;

                        return (
                          <View key={log.id ?? idx} style={styles.logItem}>
                            <Ionicons name="time-outline" size={14} color={theme.colors.text.muted} />
                            <View style={styles.logTextGroup}>
                              <View style={styles.titleRow}>
                                <AppText variant="caption" weight="bold">
                                  {formatMistingCode('eventType', log.event_type)}
                                </AppText>
                                {isSimulation && (
                                  <View style={styles.simulationLogBadge}>
                                    <AppText style={styles.simulationLogBadgeText}>
                                      Mô phỏng
                                    </AppText>
                                  </View>
                                )}
                                {log.created_at && (
                                  <AppText variant="caption" color={theme.colors.text.muted}>
                                    {new Date(log.created_at).toLocaleTimeString('vi-VN')}
                                  </AppText>
                                )}
                              </View>
                              <AppText variant="caption" color={theme.colors.text.secondary}>
                                {formatBackendMessage(log.reason)}
                              </AppText>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })()
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

      {/* Tray Cultivation Detail Modal */}
      <CultivationTrayDetailModal
        visible={trayDetailModalVisible}
        onClose={() => setTrayDetailModalVisible(false)}
        tray={selectedTrayForDetail}
        room={rooms.find((r) => r.room_id === selectedRoomId)}
        floor={selectedFloor}
      />
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
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  trayCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  traySubtitle: {
    marginTop: 2,
  },
  trayActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  badgeMini: {
    paddingHorizontal: 8,
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
  stepItemDisabled: {
    opacity: 0.45,
  },
  activeSessionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  activeSessionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeSessionsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshIconBtn: {
    padding: 6,
  },
  emptyActiveBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
  },
  activeCardsList: {
    gap: theme.spacing.sm,
  },
  activeCard: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  activeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  activeCardTitleCol: {
    flex: 1,
  },
  activeCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  statusBadgeRunning: {
    backgroundColor: theme.colors.success.main,
  },
  statusBadgeDryRun: {
    backgroundColor: theme.colors.secondary[700],
  },
  statusBadgeFault: {
    backgroundColor: theme.colors.error.main,
  },
  activeCardMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginVertical: 4,
  },
  activeCardActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  activeActionBtn: {
    flex: 1,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  floorQuickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: theme.spacing.xs,
    marginTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    flexWrap: 'wrap',
  },
  floorQuickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  floorQuickActionBtnHighlight: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[700],
  },
  floorQuickActionBtnStop: {
    backgroundColor: theme.colors.error.light,
    borderColor: theme.colors.error.main,
  },
  step4ActionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  simulationLogBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    marginLeft: 6,
  },
  simulationLogBadgeText: {
    color: theme.colors.warning.dark,
    fontSize: 10,
    fontWeight: 'bold',
  },
  logFilterPills: {
    gap: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  logFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  logFilterPillActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[700],
  },
  networkErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: theme.colors.error.main,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  offPendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    borderColor: theme.colors.warning.main,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  noSuggestionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: theme.colors.warning.light,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
});
