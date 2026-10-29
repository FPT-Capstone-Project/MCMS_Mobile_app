/**
 * Misting & IoT Automation Translation and Status Mapping
 * Strictly matching SmartMush specifications and Clean Architecture.
 *
 * Rules:
 * - Field names, data codes, API payloads remain unchanged.
 * - Display labels in Vietnamese only.
 * - Split into isolated groups to avoid cross-context code collisions.
 * - null/undefined/empty string displays "Chưa có dữ liệu".
 * - Untranslated/unrecognized codes fallback to original code.
 * - Booleans: null/undefined are not treated as false.
 * - Backend messages (reason, error, etc.) are kept verbatim.
 */

export const NO_DATA_TEXT = 'Chưa có dữ liệu';

/**
 * 1. event_type / lastDecision.event_type
 */
export const EVENT_TYPE_MAP: Record<string, string> = {
  CONFIG_SAVED: 'Đã lưu cấu hình',
  START: 'Bắt đầu chế độ tự động',
  STOP: 'Dừng chế độ tự động',
  MANUAL_OVERRIDE: 'Dừng tự động bằng lệnh thủ công',
  DECISION: 'Đánh giá điều kiện điều khiển',
  PULSE_RESERVED: 'Đã giữ hạn mức cho đợt phun',
  ON_REQUESTED: 'Đã yêu cầu bật phun sương',
  OFF_REQUESTED: 'Đã yêu cầu tắt phun sương',
  OFF_CONFIRMED: 'Đã xác nhận trạng thái tắt',
  OFF_FAILED: 'Gửi lệnh tắt thất bại',
  RETRY_WAIT: 'Đang chờ thử lại',
  RECOVERY_WAIT: 'Đang chờ khôi phục sau gián đoạn',
  FAULT: 'Lỗi điều khiển tự động',
};

/**
 * 2. runtime.control_state / decision.state
 */
export const CONTROL_STATE_MAP: Record<string, string> = {
  DISABLED: 'Chế độ tự động đã tắt',
  IDLE: 'Đang chờ điều kiện phun',
  ON_REQUESTED: 'Đang yêu cầu bật phun sương',
  MISTING: 'Đang trong đợt phun sương',
  OFF_PENDING: 'Đang chờ xác nhận tắt',
  COOLDOWN: 'Đang chờ giữa các đợt phun',
  SENSOR_FAULT: 'Dữ liệu cảm biến không đạt yêu cầu',
  DEVICE_OFFLINE: 'Thiết bị hoặc kết nối MQTT mất kết nối',
  FAULT: 'Lỗi điều khiển',
};

/**
 * 3. mode
 */
export const MODE_MAP: Record<string, string> = {
  AUTO: 'Tự động',
  MANUAL: 'Thủ công',
};

/**
 * 4. run.status
 */
export const RUN_STATUS_MAP: Record<string, string> = {
  RUNNING: 'Đang chạy',
  STOPPED: 'Đã dừng',
  FAULT: 'Dừng do lỗi',
};

/**
 * 5. decision.action
 */
export const ACTION_MAP: Record<string, string> = {
  ON: 'Bật phun sương',
  OFF: 'Tắt phun sương',
  NONE: 'Không thực hiện thao tác',
  FAULT: 'Lỗi điều khiển',
};

/**
 * 6. ssr.desired_state / ssr.reported_state (or desiredState / reportedState)
 */
export const SSR_STATE_MAP: Record<string, string> = {
  ON: 'Bật',
  OFF: 'Tắt',
};

/**
 * 7. Trạng thái gửi lệnh IoT (IoT Command Status)
 */
export const IOT_COMMAND_STATUS_MAP: Record<string, string> = {
  PENDING: 'Đang chờ gửi',
  PUBLISHED: 'Đã gửi đến máy chủ MQTT',
  FAILED: 'Gửi thất bại',
  TIMED_OUT: 'Quá thời gian gửi lệnh',
};

/**
 * 8. reported_status / reportedStatus (mã chữ thường)
 */
export const REPORTED_STATUS_MAP: Record<string, string> = {
  online: 'Trực tuyến',
  offline: 'Mất kết nối',
};

/**
 * 9. config.config_source
 */
export const CONFIG_SOURCE_MAP: Record<string, string> = {
  LEGACY: 'Cấu hình theo loại nấm',
  FLOOR: 'Cấu hình chung cho tầng',
};

/**
 * 10. floor.status
 */
export const FLOOR_STATUS_MAP: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
};

/**
 * Group types for safe lookup
 */
export type MistingMapGroup =
  | 'eventType'
  | 'controlState'
  | 'mode'
  | 'runStatus'
  | 'action'
  | 'ssrState'
  | 'iotCommandStatus'
  | 'reportedStatus'
  | 'configSource'
  | 'floorStatus';

const GROUP_MAPS: Record<MistingMapGroup, Record<string, string>> = {
  eventType: EVENT_TYPE_MAP,
  controlState: CONTROL_STATE_MAP,
  mode: MODE_MAP,
  runStatus: RUN_STATUS_MAP,
  action: ACTION_MAP,
  ssrState: SSR_STATE_MAP,
  iotCommandStatus: IOT_COMMAND_STATUS_MAP,
  reportedStatus: REPORTED_STATUS_MAP,
  configSource: CONFIG_SOURCE_MAP,
  floorStatus: FLOOR_STATUS_MAP,
};

/**
 * Format code to Vietnamese label:
 * - null/undefined/empty string -> "Chưa có dữ liệu"
 * - found in dictionary -> translated Vietnamese label
 * - not found -> original code
 */
export function formatMistingCode(
  group: MistingMapGroup,
  code: string | null | undefined
): string {
  if (code === null || code === undefined || code === '') {
    return NO_DATA_TEXT;
  }
  const dict = GROUP_MAPS[group];
  return dict?.[code] ?? code;
}

/**
 * Boolean fields formatting
 */
export type MistingBooleanField =
  | 'dryRun'
  | 'environmentHealthy'
  | 'sensorValid'
  | 'demand'
  | 'coolingDemand'
  | 'coolingEnabled'
  | 'profileApproved';

const BOOLEAN_LABELS: Record<MistingBooleanField, { trueLabel: string; falseLabel: string }> = {
  dryRun: {
    trueLabel: 'Chạy mô phỏng',
    falseLabel: 'Điều khiển thiết bị thực',
  },
  environmentHealthy: {
    trueLabel: 'Dữ liệu cảm biến đạt yêu cầu',
    falseLabel: 'Dữ liệu cảm biến không đạt yêu cầu',
  },
  sensorValid: {
    trueLabel: 'Hợp lệ',
    falseLabel: 'Không hợp lệ',
  },
  demand: {
    trueLabel: 'Có nhu cầu tăng độ ẩm',
    falseLabel: 'Không có nhu cầu tăng độ ẩm',
  },
  coolingDemand: {
    trueLabel: 'Có nhu cầu làm mát',
    falseLabel: 'Không có nhu cầu làm mát',
  },
  coolingEnabled: {
    trueLabel: 'Bật làm mát',
    falseLabel: 'Tắt làm mát',
  },
  profileApproved: {
    trueLabel: 'Đã phê duyệt',
    falseLabel: 'Chưa phê duyệt',
  },
};

/**
 * Format boolean values:
 * Does NOT treat null/undefined as false -> returns "Chưa có dữ liệu".
 */
export function formatMistingBoolean(
  field: MistingBooleanField,
  val: boolean | null | undefined
): string {
  if (val === null || val === undefined) {
    return NO_DATA_TEXT;
  }
  const entry = BOOLEAN_LABELS[field];
  return val ? entry.trueLabel : entry.falseLabel;
}

/**
 * Keep backend messages verbatim (reason, last_error, stop_reason, errorMessage).
 * Does not match sentence-by-sentence.
 * null/undefined/empty string -> "Chưa có dữ liệu".
 */
export function formatBackendMessage(msg: string | null | undefined): string {
  if (msg === null || msg === undefined || msg === '') {
    return NO_DATA_TEXT;
  }
  return msg;
}

/**
 * Generate options for Dropdown / Filter / Picker:
 * - label: Vietnamese translation
 * - value: Original code for API requests
 */
export function getMistingFilterOptions(group: MistingMapGroup): { label: string; value: string }[] {
  const dict = GROUP_MAPS[group];
  return Object.entries(dict).map(([value, label]) => ({
    label,
    value,
  }));
}

