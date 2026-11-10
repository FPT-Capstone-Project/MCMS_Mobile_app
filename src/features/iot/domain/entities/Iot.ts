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
  fan_ssr_channel?: number | null;
  status: 'ACTIVE' | 'INACTIVE';
  total_rows?: number | null;
  total_columns?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface SourceProfile {
  mushroom_type_id: number;
  mushroom_name?: string | null;
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
  mushroom_type_ids?: number[];
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
  session_tray_id?: number | null;
  rental_id?: number | null;
  mushroom_type_id?: number | null;
  mushroom_name?: string | null;
  cultivation_status?: string | null;
  position_id?: number | null;
  row_number?: number | null;
  column_number?: number | null;
  position_status?: string | null;
}

export type FarmSessionStatus =
  | 'PENDING'
  | 'SPAWN_RESTING'
  | 'MYCELIAL_DEVELOPMENT'
  | 'READY_FOR_CULTIVATION'
  | 'CULTIVATING'
  | 'HARVEST_READY'
  | 'HARVESTING'
  | 'COMPLETED'
  | 'CANCELLED';

export type GrowthStage =
  | 'FRUITING_INITIATION'
  | 'PINNING'
  | 'YOUNG_FRUITING'
  | 'MATURATION';

export interface CultivationSessionAdmin {
  session_id: number;
  id?: number;
  order_id?: number | null;
  order_item_id?: number | null;
  package_id?: number | null;
  package_name?: string | null;
  rental_id?: number | null;
  status: FarmSessionStatus;
  spawn_status?: string | null;
  spawn_issued?: boolean;
  mushroom_type_id: number;
  mushroom_name?: string | null;
  required_trays?: number;
  tray_quantity?: number;
  tray_count?: number;
  spawn_quantity?: number;
  start_at?: string | null;
  start_date?: string | null;
  end_at?: string | null;
  end_date?: string | null;
  harvest_date?: string | null;
  duration_days?: number | null;
  harvest_status?: 'NOT_READY' | 'HARVEST_READY' | null;
  harvest_ready?: boolean;
  harvest_ready_at?: string | null;
  harvest_ready_by?: number | null;
  growth_status?: GrowthStage | string | null;
  current_stage?: GrowthStage | string | null;
  progress_percent?: number | null;
  condition?: string | null;
  notes?: string | null;
  progress_updated_at?: string | null;
  last_inspected_at?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  floor_id?: number | null;
  floor_name?: string | null;
  room_id?: number | null;
  room_name?: string | null;
  created_at?: string;
  updated_at?: string;
  trays?: {
    session_tray_id: number;
    tray_id: number;
    tray_code: string;
    floor_id?: number | null;
    floor_name?: string | null;
    floor_number?: number | null;
    position_id?: number | null;
    row_number?: number | null;
    column_number?: number | null;
    status: string;
  }[];
}

export type FarmSessionItem = CultivationSessionAdmin;

export interface ProgressHistoryItem {
  progress_id?: number;
  session_id: number;
  current_stage: GrowthStage | string;
  progress_percent: number;
  condition: string;
  description?: string | null;
  start_date?: string | null;
  expected_harvest_date?: string | null;
  created_at?: string;
}

export interface SessionProgressResponse {
  session_id: number;
  status: FarmSessionStatus;
  harvest_status?: 'NOT_READY' | 'HARVEST_READY' | null;
  harvest_ready: boolean;
  expected_harvest_date?: string | null;
  growth_status?: GrowthStage | string | null;
  current_stage?: GrowthStage | string | null;
  progress_percent?: number | null;
  condition?: string | null;
  latest_progress?: ProgressHistoryItem | null;
  progress_history: ProgressHistoryItem[];
}

export interface UpdateGrowthRequest {
  growthStatus: GrowthStage;
  progressPercent: number;
  condition: string;
  notes?: string;
  expectedHarvestDate?: string;
}

export interface UpdateHarvestReadinessRequest {
  harvestReady: boolean;
  notes?: string;
}

export type HarvestStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface HarvestItem {
  harvest_id: number;
  id?: number;
  session_id: number;
  order_id?: number;
  user_id?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  mushroom_type_id?: number;
  mushroom_name?: string;
  status: HarvestStatus;
  harvest_date?: string | null;
  harvest_method?: 'PICKUP' | 'DELIVERY' | null;
  scheduled_at?: string | null;
  customer_note?: string | null;
  harvest_request_status?: string | null;
  total_weight_kg?: number | null;
  usable_weight_kg?: number | null;
  rejected_weight_kg?: number | null;
  quality_grade?: string | null;
  notes?: string | null;
  harvested_by?: number | null;
  harvested_at?: string | null;
  confirmed_by?: number | null;
  confirmed_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateHarvestRequest {
  sessionId: number;
}

export interface RecordYieldRequest {
  totalWeightKg: number;
  usableWeightKg: number;
  rejectedWeightKg: number;
  qualityGrade?: string;
  notes?: string;
}

export interface SpawnInspection {
  inspection_id?: number;
  id?: number;
  session_id: number;
  total_checked: number;
  normal_quantity: number;
  warning_quantity: number;
  abnormal_quantity: number;
  condition: 'NORMAL' | 'WARNING' | 'ABNORMAL';
  replacement_quantity?: number | null;
  notes?: string | null;
  next_check_at?: string | null;
  inspected_at?: string;
  created_at?: string;
  created_by?: number | string | null;
  inspector_name?: string | null;
  images?: {
    image_id?: number;
    image_url: string;
    caption?: string | null;
  }[];
}

export interface RecordSpawnInspectionRequest {
  totalChecked: number;
  normalQuantity: number;
  warningQuantity: number;
  abnormalQuantity: number;
  condition: 'NORMAL' | 'WARNING' | 'ABNORMAL';
  replacementQuantity?: number;
  notes?: string;
  nextCheckAt?: string;
}

export interface UpdateSessionStageRequest {
  stage: 'SPAWN_RESTING' | 'MYCELIAL_DEVELOPMENT' | 'READY_FOR_CULTIVATION';
}

export interface AvailableTrayForSession {
  tray_id: number;
  tray_code: string;
  floor_id: number;
  room_id: number;
  position_id?: number | null;
  row_number?: number | null;
  column_number?: number | null;
  position_status?: string | null;
  status: string;
}

export interface AssignTraysToSessionRequest {
  floorId: number;
  trayIds: number[];
}

export interface GenerateTraysRequest {
  total_rows?: number;
  total_columns?: number;
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
    config_snapshot?: AutoMistingConfig | null;
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
