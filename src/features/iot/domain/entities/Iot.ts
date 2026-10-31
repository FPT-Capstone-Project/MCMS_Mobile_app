/**
 * IoT & Automation Domain Entities
 * Strictly matching SmartMush backend OpenAPI contracts
 */

export interface IotMaster {
  id: number;
  masterId: string;
  cultivationRoomId: number | null;
  light_ssr_channel?: number | null;
  reportedStatus: 'online' | 'offline' | null;
  lastSeenAt: string | null;
  statusReceivedAt: string | null;
  statusRetained: boolean | null;
}

export interface IotSensor {
  masterId: string;
  nodeId: number;
  sensorId: number;
  temperature: number | null;
  humidity: number | null;
  ok: boolean;
  lastReceivedAt: string | null;
  lastValidAt: string | null;
  measuredAt: string | null;
  retained: boolean;
}

export interface IotReading {
  id: string;
  temperature: number | null;
  humidity: number | null;
  ok: boolean;
  receivedAt: string | null;
  measuredAt: string | null;
  retained: boolean;
}

export interface IotHistory {
  masterId: string;
  nodeId: number;
  sensorId: number;
  limit: number;
  offset: number;
  readings: IotReading[];
}

export interface IotSsrChannel {
  channel: number;
  desiredState: 'ON' | 'OFF' | null;
  reportedState: 'ON' | 'OFF' | null;
  lastCommandAt: string | null;
  lastReportedAt: string | null;
  reportedRetained: boolean | null;
  statesMatch: boolean | null;
}

export interface IotSsr {
  masterId: string;
  channels: IotSsrChannel[];
}

export interface IotCommand {
  commandId: string;
  masterId: string;
  channel: number;
  action: 'ON' | 'OFF';
  status: 'PENDING' | 'PUBLISHED' | 'FAILED' | 'TIMED_OUT';
  requestedBy: number | null;
  requestedAt: string | null;
  expiresAt: string | null;
  publishedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface FloorMapping {
  id?: number;
  floor_id?: number;
  room_id: number;
  floor_number: number;
  floor_name: string;
  master_id: number;
  node_address: number;
  misting_ssr_channel: number;
  status: 'ACTIVE' | 'INACTIVE';
  total_rows?: number | null;
  total_columns?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface SourceProfile {
  mushroom_type_id: number;
  temperature_min: number | null;
  temperature_max: number | null;
  humidity_min: number | null;
  humidity_max: number | null;
}

export interface CommonConditions {
  temperature_min?: number;
  temperature_max?: number;
  humidity_min?: number;
  humidity_max?: number;
}

export interface AutoMistingConfig {
  id?: number;
  floor_id?: number;
  config_source?: 'LEGACY' | 'FLOOR';
  profile_name?: string | null;
  profile_approved?: boolean;
  humidity_min: number;
  humidity_max: number;
  humidity_start_threshold: number;
  humidity_stop_threshold: number;
  cooling_enabled?: boolean;
  temperature_min?: number;
  temperature_max?: number;
  temperature_start_threshold?: number;
  temperature_stop_threshold?: number;
  cooling_humidity_limit?: number;
  max_temperature_spread_c?: number;
  misting_pulse_ms: number;
  cooldown_ms: number;
  evaluation_interval_ms: number;
  sensor_max_age_ms?: number;
  required_valid_sensors?: number;
  max_sensor_spread_percent: number;
  max_activations_per_hour: number;
  max_cumulative_on_ms_per_hour: number;
  mushroom_type_id?: number | null;
  source_profiles?: SourceProfile[] | null;
  configured_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AutoControlSuggestions {
  sourceProfiles: SourceProfile[];
  common: CommonConditions;
  issues: string[];
  warnings: string[];
  config: AutoMistingConfig | null;
}

export interface CultivationTrayInfo {
  tray_id: number;
  tray_code: string;
  tray_status: string;
  session_id?: number | null;
  rental_id?: number | null;
  mushroom_type_id?: number | null;
  mushroom_name?: string | null;
  cultivation_status?: string | null;
  position_id?: number | null;
  row_number?: number | null;
  column_number?: number | null;
  position_status?: string | null;
}

export interface AutoControlConfigResponse {
  mode: 'MANUAL' | 'AUTO';
  config?: AutoMistingConfig | null;
  cultivation?: {
    profiles: SourceProfile[];
    trays: CultivationTrayInfo[];
    conflict: boolean;
    unassignedTrays: number;
    requiresApproval: boolean;
  };
  suggestions?: any;
  floorSuggestion?: AutoControlSuggestions;
}

export interface FloorEnvironment {
  masterId: string;
  nodeId: number;
  averageHumidity: number | null;
  averageTemperature: number | null;
  temperatureSpread?: number | null;
  healthy: boolean;
  reason: string | null;
  sensors: {
    sensorId: number;
    humidity: number | null;
    temperature?: number | null;
    valid: boolean;
    ageMs: number | null;
    retained?: boolean;
  }[];
  thresholds?: AutoMistingConfig;
}

export type AutoControlState =
  | 'DISABLED'
  | 'IDLE'
  | 'ON_REQUESTED'
  | 'MISTING'
  | 'OFF_PENDING'
  | 'COOLDOWN'
  | 'SENSOR_FAULT'
  | 'DEVICE_OFFLINE'
  | 'FAULT';

export interface AutoControlStatus {
  mode: 'MANUAL' | 'AUTO';
  run: {
    id?: number;
    status: 'RUNNING' | 'STOPPED' | 'FAULT';
    dry_run: boolean;
    started_by: number | null;
    stop_reason?: string | null;
  } | null;
  runtime: {
    control_state: AutoControlState;
    demand?: boolean;
    cooling_demand?: boolean;
    last_reason?: string | null;
    last_error?: string | null;
    pulse_started_at?: string | null;
    pulse_deadline_at?: string | null;
    off_requested_at?: string | null;
    cooldown_until?: string | null;
  };
  environment?: FloorEnvironment;
  ssr?: {
    desired_state: 'ON' | 'OFF' | null;
    reported_state: 'ON' | 'OFF' | null;
    state_reported_at?: string;
  } | null;
  cooldownRemainingMs: number;
  lastDecision?: {
    id?: number;
    event_type?: string;
    reason?: string;
    action?: string;
    state?: string;
    created_at?: string;
  } | null;
}

export interface AutoControlLogItem {
  id?: number;
  floor_id?: number;
  run_id?: number | null;
  event_type: string;
  reason: string;
  average_humidity?: number | null;
  average_temperature?: number | null;
  timestamp?: string;
  created_at?: string;
}

export interface AutoControlLogsResponse {
  limit: number;
  offset: number;
  logs: AutoControlLogItem[];
}

export interface AdminRental {
  rental_id: number;
  order_id: number;
  user_id: number;
  package_id: number;
  tray_id: number | null;
  status: 'CONFIRMED' | 'PREPARING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  customer_name?: string;
  customer_email?: string;
  mushroom_name?: string;
  mushroom_type_id?: number;
  tray_code?: string;
}
