import { axiosClient } from '../../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../../core/api/endpoints';
import { AppError } from '../../../../core/errors/appError';
import { handleApiError } from '../../../../core/errors/errorHandler';
import {
  AdminRental,
  AssignTraysToSessionRequest,
  AutoControlConfigResponse,
  AutoControlLogsResponse,
  AutoControlStatus,
  AutoControlSuggestions,
  AutoMistingConfig,
  AvailableTrayForSession,
  CultivationSessionAdmin,
  FloorEnvironment,
  FloorMapping,
  HarvestItem,
  IotCommand,
  IotHistory,
  IotMaster,
  IotSensor,
  IotSsr,
  RecordSpawnInspectionRequest,
  RecordYieldRequest,
  SessionProgressResponse,
  SpawnInspection,
  UpdateGrowthRequest,
  UpdateHarvestReadinessRequest,
} from '../../domain/entities/Iot';

/**
 * Repository for IoT Telemetry, Manual SSR, and Floor Automatic Misting
 */
export class IotRepository {
  /**
   * Fetch list of registered IoT Masters
   */
  async getMasters(): Promise<IotMaster[]> {
    try {
      const response = await axiosClient.get<{ data: IotMaster[] } | IotMaster[]>(
        API_ENDPOINTS.IOT.MASTERS
      );
      if ('data' in response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Fetch latest sensors for a master
   */
  async getMasterSensors(masterId: string): Promise<IotSensor[]> {
    try {
      const response = await axiosClient.get<{ data: { masterId: string; sensors: IotSensor[] } } | { sensors: IotSensor[] }>(
        API_ENDPOINTS.IOT.MASTER_SENSORS(masterId)
      );
      if ('data' in response.data && response.data.data.sensors) {
        return response.data.data.sensors;
      }
      if ('sensors' in response.data) {
        return response.data.sensors;
      }
      return [];
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Fetch single sensor detail
   */
  async getNodeSensor(masterId: string, nodeId: number, sensorId: number): Promise<IotSensor> {
    try {
      const response = await axiosClient.get<{ data: IotSensor } | IotSensor>(
        API_ENDPOINTS.IOT.NODE_SENSOR(masterId, nodeId, sensorId)
      );
      if ('data' in response.data) {
        return response.data.data;
      }
      return response.data as IotSensor;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Fetch sensor reading history (ordered by receivedAt descending from backend)
   */
  async getSensorHistory(
    masterId: string,
    nodeId: number,
    sensorId: number,
    options?: { from?: string; to?: string; limit?: number; offset?: number }
  ): Promise<IotHistory> {
    try {
      const response = await axiosClient.get<{ data: IotHistory } | IotHistory>(
        API_ENDPOINTS.IOT.SENSOR_HISTORY(masterId, nodeId, sensorId),
        { params: options }
      );
      if ('data' in response.data) {
        return response.data.data;
      }
      return response.data as IotHistory;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Fetch all 8 SSR channels for a master
   */
  async getMasterSsr(masterId: string): Promise<IotSsr> {
    try {
      const response = await axiosClient.get<{ data: IotSsr } | IotSsr>(
        API_ENDPOINTS.IOT.SSR(masterId)
      );
      if ('data' in response.data) {
        return response.data.data;
      }
      return response.data as IotSsr;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Send manual ON/OFF SSR command to channel (1-8).
   * Note: Returns 202 PUBLISHED indicating publication to broker; physical execution is unverified.
   */
  async sendSsrCommand(masterId: string, channel: number, action: 'ON' | 'OFF'): Promise<IotCommand> {
    try {
      const response = await axiosClient.post<{ data: IotCommand } | IotCommand>(
        API_ENDPOINTS.IOT.SSR_COMMAND(masterId, channel),
        { action }
      );
      if ('data' in response.data) {
        return response.data.data;
      }
      return response.data as IotCommand;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Query publication status for an SSR command
   */
  async getCommandStatus(commandId: string): Promise<IotCommand> {
    try {
      const response = await axiosClient.get<{ data: IotCommand } | IotCommand>(
        API_ENDPOINTS.IOT.COMMAND_STATUS(commandId)
      );
      if ('data' in response.data) {
        return response.data.data;
      }
      return response.data as IotCommand;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Update or unassign master light SSR channel
   * PUT /api/iot/masters/:masterId/light
   * Body: { channel: number | null }
   */
  async updateMasterLight(masterId: string, channel: number | null): Promise<IotMaster> {
    try {
      const response = await axiosClient.put<{ data: IotMaster } | IotMaster>(
        API_ENDPOINTS.IOT.MASTER_LIGHT(masterId),
        { channel }
      );
      if ('data' in response.data && response.data.data) {
        return response.data.data;
      }
      return response.data as IotMaster;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * List all cultivation floor mappings, optionally filtered by roomId
   */
  async getFloors(roomId?: number): Promise<FloorMapping[]> {
    try {
      const response = await axiosClient.get<{ data: FloorMapping[] } | FloorMapping[]>(
        API_ENDPOINTS.AUTOMATIC.FLOORS,
        { params: roomId ? { roomId } : undefined }
      );
      let list: FloorMapping[] = [];
      if ('data' in response.data && Array.isArray(response.data.data)) {
        list = response.data.data;
      } else if (Array.isArray(response.data)) {
        list = response.data;
      }
      const normalized = list.map((f) => ({
        ...f,
        id: f.floor_id ?? f.id,
        floor_id: f.floor_id ?? f.id,
      }));
      if (roomId != null) {
        return normalized.filter((f) => f.room_id === roomId);
      }
      return normalized;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Create a new floor mapping
   */
  async createFloor(mapping: FloorMapping): Promise<FloorMapping> {
    try {
      const payload: Record<string, any> = {
        room_id: Number(mapping.room_id),
        floor_number: Number(mapping.floor_number),
        floor_name: mapping.floor_name.trim(),
        master_id: Number(mapping.master_id),
        node_address: Number(mapping.node_address),
        misting_ssr_channel: Number(mapping.misting_ssr_channel),
        status: mapping.status || 'ACTIVE',
      };
      if (mapping.total_rows !== undefined) payload.total_rows = mapping.total_rows;
      if (mapping.total_columns !== undefined) payload.total_columns = mapping.total_columns;

      const response = await axiosClient.post<{ data: FloorMapping } | FloorMapping>(
        API_ENDPOINTS.AUTOMATIC.FLOORS,
        payload
      );
      const res = 'data' in response.data ? response.data.data : (response.data as FloorMapping);
      return {
        ...res,
        id: res.floor_id ?? res.id,
        floor_id: res.floor_id ?? res.id,
      };
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Update an existing floor mapping
   * Omitting total_rows or total_columns preserves existing values
   */
  async updateFloor(floorId: number, mapping: FloorMapping): Promise<FloorMapping> {
    try {
      const payload: Record<string, any> = {
        room_id: Number(mapping.room_id),
        floor_number: Number(mapping.floor_number),
        floor_name: mapping.floor_name.trim(),
        master_id: Number(mapping.master_id),
        node_address: Number(mapping.node_address),
        misting_ssr_channel: Number(mapping.misting_ssr_channel),
        status: mapping.status || 'ACTIVE',
      };
      if (mapping.total_rows !== undefined) payload.total_rows = mapping.total_rows;
      if (mapping.total_columns !== undefined) payload.total_columns = mapping.total_columns;

      const response = await axiosClient.put<{ data: FloorMapping } | FloorMapping>(
        API_ENDPOINTS.AUTOMATIC.FLOOR_DETAIL(floorId),
        payload
      );
      const res = 'data' in response.data ? response.data.data : (response.data as FloorMapping);
      return {
        ...res,
        id: res.floor_id ?? res.id,
        floor_id: res.floor_id ?? res.id,
      };
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Assign a same-room tray to a stopped floor, optionally setting a position
   */
  async assignTrayToFloor(floorId: number, trayId: number, positionId?: number | null): Promise<void> {
    try {
      const payload = positionId !== undefined ? { position_id: positionId } : {};
      await axiosClient.put(API_ENDPOINTS.AUTOMATIC.ASSIGN_TRAY(floorId, trayId), payload);
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Read floor environment (sensors, averages, freshness, thresholds)
   */
  async getFloorEnvironment(floorId: number): Promise<FloorEnvironment> {
    try {
      const response = await axiosClient.get<{ data: FloorEnvironment } | FloorEnvironment>(
        API_ENDPOINTS.AUTOMATIC.ENVIRONMENT(floorId)
      );
      if ('data' in response.data) {
        return response.data.data;
      }
      return response.data as FloorEnvironment;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Read saved automatic misting configuration, mode, cultivation trays, and floor suggestion
   */
  async getAutoControlConfig(floorId: number): Promise<AutoControlConfigResponse> {
    try {
      const response = await axiosClient.get<{ data: AutoControlConfigResponse }>(
        API_ENDPOINTS.AUTOMATIC.AUTO_CONTROL(floorId)
      );
      return response.data?.data || { mode: 'MANUAL' };
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Read shared floor suggestions calculated from active cultivation sessions
   */
  async getAutoControlSuggestions(floorId: number): Promise<AutoControlSuggestions> {
    try {
      const response = await axiosClient.get<{ data: AutoControlSuggestions }>(
        API_ENDPOINTS.AUTOMATIC.SUGGESTIONS(floorId)
      );
      return response.data?.data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Save configuration without starting AUTO
   * Strictly maps only allowed fields per backend whitelist (src/services/autoMisting.algorithm.js).
   * Does NOT spread raw GET response or screen state.
   * Does NOT include mode, run, runtime, id, floor_id, timestamps, source_profiles, dryRun or mushroom_type_ids.
   */
  async saveAutoControlConfig(
    floorId: number,
    config: AutoMistingConfig,
    mushroomTypeIds?: number[]
  ): Promise<void> {
    try {
      const isFloor = (config.config_source || 'FLOOR') === 'FLOOR';
      const isCooling = Boolean(config.cooling_enabled);

      // 1. Core required thresholds & timing parameters
      const payload: Record<string, any> = {
        config_source: isFloor ? 'FLOOR' : 'LEGACY',
        profile_name: config.profile_name?.trim() || `Cấu hình tầng ${floorId}`,
        profile_approved: Boolean(config.profile_approved ?? true),
        humidity_min: Number(config.humidity_min),
        humidity_max: Number(config.humidity_max),
        humidity_start_threshold: Number(config.humidity_start_threshold),
        humidity_stop_threshold: Number(config.humidity_stop_threshold),
        cooling_enabled: isCooling,
        misting_pulse_ms: Math.round(Number(config.misting_pulse_ms)),
        cooldown_ms: Math.round(Number(config.cooldown_ms)),
        evaluation_interval_ms: Math.round(Number(config.evaluation_interval_ms)),
        sensor_max_age_ms: Math.round(Number(config.sensor_max_age_ms ?? 20000)),
        required_valid_sensors: Math.round(Number(config.required_valid_sensors ?? 3)),
        max_sensor_spread_percent: Number(config.max_sensor_spread_percent ?? 10),
        max_activations_per_hour: Math.round(Number(config.max_activations_per_hour ?? 20)),
        max_cumulative_on_ms_per_hour: Math.round(Number(config.max_cumulative_on_ms_per_hour ?? 200000)),
      };

      // 2. Cooling parameters (strictly included only when cooling_enabled is true)
      if (isCooling) {
        if (config.temperature_min != null) {
          payload.temperature_min = Number(config.temperature_min);
        }
        if (config.temperature_max != null) {
          payload.temperature_max = Number(config.temperature_max);
        }
        if (config.temperature_start_threshold != null) {
          payload.temperature_start_threshold = Number(config.temperature_start_threshold);
        }
        if (config.temperature_stop_threshold != null) {
          payload.temperature_stop_threshold = Number(config.temperature_stop_threshold);
        }
        if (config.cooling_humidity_limit != null) {
          payload.cooling_humidity_limit = Number(config.cooling_humidity_limit);
        }
        if (config.max_temperature_spread_c != null) {
          payload.max_temperature_spread_c = Number(config.max_temperature_spread_c);
        }
      }

      // 3. Mushroom type configuration:
      // For FLOOR: Backend now supports mushroom_type_ids (array of unique positive integers).
      // Never send mushroom_type_id with value for FLOOR.
      // For LEGACY: Backend requires single mushroom_type_id.
      if (isFloor) {
        const rawIds = mushroomTypeIds || config.mushroom_type_ids;
        if (rawIds && rawIds.length > 0) {
          const uniqueIds = Array.from(
            new Set(rawIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))
          );
          if (uniqueIds.length > 0) {
            payload.mushroom_type_ids = uniqueIds;
          }
        }
      } else {
        if (config.mushroom_type_id != null || (mushroomTypeIds && mushroomTypeIds.length > 0)) {
          payload.mushroom_type_id = Number(config.mushroom_type_id ?? mushroomTypeIds?.[0]);
        }
      }

      await axiosClient.put(API_ENDPOINTS.AUTOMATIC.AUTO_CONTROL(floorId), payload);
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Preview current algorithm decision without side effects (evaluate)
   */
  async evaluateAutoControl(floorId: number): Promise<{ dryRun: boolean; decision: { action: string; state: string; reason: string } }> {
    try {
      const response = await axiosClient.post<{ data: { dryRun: boolean; decision: { action: string; state: string; reason: string } } }>(
        API_ENDPOINTS.AUTOMATIC.EVALUATE(floorId)
      );
      return response.data?.data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Explicitly start a run (dryRun = true for simulation, dryRun = false for real misting)
   */
  async startAutoControl(floorId: number, dryRun: boolean): Promise<void> {
    try {
      await axiosClient.post(API_ENDPOINTS.AUTOMATIC.START(floorId), { dryRun: Boolean(dryRun) });
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Stop AUTO and request OFF
   */
  async stopAutoControl(floorId: number): Promise<AutoControlStatus> {
    try {
      const response = await axiosClient.post<{ data: AutoControlStatus } | AutoControlStatus>(
        API_ENDPOINTS.AUTOMATIC.STOP(floorId)
      );
      if ('data' in response.data) {
        return response.data.data;
      }
      return response.data as AutoControlStatus;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Read real-time run status, control state, SSR, deadlines and errors
   */
  async getAutoControlStatus(floorId: number): Promise<AutoControlStatus> {
    try {
      const response = await axiosClient.get<{ data: AutoControlStatus } | AutoControlStatus>(
        API_ENDPOINTS.AUTOMATIC.STATUS(floorId)
      );
      if ('data' in response.data) {
        return response.data.data;
      }
      return response.data as AutoControlStatus;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Read paginated decision logs
   */
  async getAutoControlLogs(floorId: number, limit = 50, offset = 0): Promise<AutoControlLogsResponse> {
    try {
      const response = await axiosClient.get<{ data: AutoControlLogsResponse } | AutoControlLogsResponse>(
        API_ENDPOINTS.AUTOMATIC.LOGS(floorId),
        { params: { limit, offset } }
      );
      if ('data' in response.data) {
        return response.data.data;
      }
      return response.data as AutoControlLogsResponse;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * List rentals for admin assignment (e.g. status CONFIRMED or PREPARING)
   */
  async getAdminRentals(status?: string): Promise<AdminRental[]> {
    try {
      const response = await axiosClient.get<{ data: AdminRental[] }>(
        API_ENDPOINTS.RENTALS.ADMIN_LIST,
        { params: { status, pageSize: 50 } }
      );
      return response.data?.data || [];
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Start cultivation session for a paid rental and assign to tray
   * POST /api/rentals/admin/:rentalId/cultivation-session
   */
  async startCultivationSession(rentalId: number, trayId: number): Promise<{ message?: string; data?: any }> {
    try {
      const response = await axiosClient.post<{ message?: string; data?: any }>(
        API_ENDPOINTS.RENTALS.ADMIN_START_CULTIVATION(rentalId),
        { trayId: Number(trayId) }
      );
      return response.data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Generate physical trays for floor according to total_rows x total_columns
   * POST /api/iot/floors/:floorId/trays/generate
   */
  async generateFloorTrays(
    floorId: number,
    body?: { total_rows?: number; total_columns?: number }
  ): Promise<{ message?: string; count?: number }> {
    try {
      const response = await axiosClient.post<{ message?: string; count?: number }>(
        API_ENDPOINTS.AUTOMATIC.GENERATE_TRAYS(floorId),
        body || {}
      );
      return response.data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Get cultivation session admin detail
   * GET /api/cultivation-sessions/admin/:sessionId
   */
  async getSessionAdminDetail(sessionId: number | string): Promise<CultivationSessionAdmin> {
    try {
      const response = await axiosClient.get<{ data: CultivationSessionAdmin } | CultivationSessionAdmin>(
        API_ENDPOINTS.CULTIVATION_SESSIONS.ADMIN_DETAIL(sessionId)
      );
      if ('data' in response.data) {
        return response.data.data;
      }
      return response.data as CultivationSessionAdmin;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * List available trays on a floor for session assignment
   * GET /api/cultivation-sessions/admin/available-trays?floorId={floorId}
   */
  async getAvailableTraysForFloor(floorId: number): Promise<AvailableTrayForSession[]> {
    try {
      const response = await axiosClient.get<{ data: AvailableTrayForSession[] } | AvailableTrayForSession[]>(
        API_ENDPOINTS.CULTIVATION_SESSIONS.ADMIN_AVAILABLE_TRAYS(floorId)
      );
      if ('data' in response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Assign physical trays on a floor to a cultivation session
   * POST /api/cultivation-sessions/admin/:sessionId/trays
   * Body: { floorId: number, trayIds: number[] }
   */
  async assignTraysToSession(
    sessionId: number | string,
    floorId: number,
    trayIds: number[]
  ): Promise<{ message?: string; data?: any }> {
    try {
      const payload: AssignTraysToSessionRequest = {
        floorId: Number(floorId),
        trayIds: trayIds.map(Number),
      };
      const response = await axiosClient.post<{ message?: string; data?: any }>(
        API_ENDPOINTS.CULTIVATION_SESSIONS.ADMIN_ASSIGN_TRAYS(sessionId),
        payload
      );
      return response.data;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * List all cultivation sessions for admin with optional status filter
   * GET /api/farm/sessions
   */
  async getAdminCultivationSessions(status?: string): Promise<CultivationSessionAdmin[]> {
    try {
      const response = await axiosClient.get<{ data: any[] } | any[]>(
        API_ENDPOINTS.FARM.SESSIONS,
        { params: status ? { status } : undefined }
      );
      const rawList =
        'data' in response.data && Array.isArray(response.data.data)
          ? response.data.data
          : Array.isArray(response.data)
          ? response.data
          : [];

      return rawList.map((item: any) => ({
        session_id: Number(item.session_id ?? item.id),
        id: item.id ? Number(item.id) : undefined,
        order_id: item.order_id != null ? Number(item.order_id) : null,
        rental_id: item.rental_id != null ? Number(item.rental_id) : (item.order_id != null ? Number(item.order_id) : null),
        status: item.status,
        spawn_status: item.spawn_status ?? null,
        mushroom_type_id: Number(item.mushroom_type_id || 1),
        mushroom_name: item.mushroom_name ?? item.mushroom?.name ?? 'Nấm giống',
        required_trays: Number(item.tray_quantity ?? item.required_trays ?? 1),
        tray_quantity: Number(item.tray_quantity ?? item.required_trays ?? 1),
        tray_count: Number(item.tray_count ?? item.tray_quantity ?? item.required_trays ?? 1),
        customer_name: item.customer_name ?? item.customer?.full_name ?? item.customer?.name ?? 'Khách hàng',
        customer_email: item.customer_email ?? item.customer?.email ?? null,
        customer_phone: item.customer_phone ?? item.customer?.phone ?? item.customer?.phone_number ?? null,
        floor_id: item.floor_id != null ? Number(item.floor_id) : null,
        floor_name: item.floor_name ?? null,
        room_id: item.room_id != null ? Number(item.room_id) : null,
        room_name: item.room_name ?? null,
        start_date: item.start_date ?? null,
        end_date: item.end_date ?? null,
        created_at: item.created_at ?? null,
        updated_at: item.updated_at ?? null,
        trays: Array.isArray(item.trays)
          ? item.trays.map((t: any) => ({
              session_tray_id: Number(t.session_tray_id ?? t.id ?? 0),
              tray_id: Number(t.tray_id),
              tray_code: String(t.tray_code || `Khay #${t.tray_id}`),
              floor_id: t.floor_id != null ? Number(t.floor_id) : null,
              status: String(t.status || 'ACTIVE'),
            }))
          : undefined,
      }));
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * List cultivation sessions ready for tray assignment (READY_FOR_CULTIVATION)
   * GET /api/farm/sessions?status=READY_FOR_CULTIVATION
   */
  async getReadyCultivationSessions(): Promise<CultivationSessionAdmin[]> {
    try {
      return await this.getAdminCultivationSessions('READY_FOR_CULTIVATION');
    } catch {
      return [];
    }
  }

  /**
   * View spawn inspection history for a session
   * GET /api/farm/sessions/:id/spawn-inspections
   */
  async getSpawnInspections(sessionId: number | string): Promise<SpawnInspection[]> {
    try {
      const response = await axiosClient.get<{ data: any[] } | any[]>(
        API_ENDPOINTS.FARM.SPAWN_INSPECTIONS(sessionId)
      );
      const rawList =
        'data' in response.data && Array.isArray(response.data.data)
          ? response.data.data
          : Array.isArray(response.data)
          ? response.data
          : [];

      return rawList.map((item: any) => ({
        inspection_id: Number(item.inspection_id ?? item.id),
        id: item.id ? Number(item.id) : undefined,
        session_id: Number(sessionId),
        total_checked: Number(item.total_checked ?? item.totalChecked ?? 0),
        normal_quantity: Number(item.normal_quantity ?? item.normalQuantity ?? 0),
        warning_quantity: Number(item.warning_quantity ?? item.warningQuantity ?? 0),
        abnormal_quantity: Number(item.abnormal_quantity ?? item.abnormalQuantity ?? 0),
        condition: item.condition ?? 'NORMAL',
        replacement_quantity:
          item.replacement_quantity != null
            ? Number(item.replacement_quantity)
            : item.replacementQuantity != null
            ? Number(item.replacementQuantity)
            : null,
        notes: item.notes ?? null,
        next_check_at: item.next_check_at ?? item.nextCheckAt ?? null,
        inspected_at: item.inspected_at ?? item.created_at ?? new Date().toISOString(),
        created_at: item.created_at ?? null,
        created_by: item.created_by ?? null,
        inspector_name: item.inspector_name ?? item.inspector?.full_name ?? null,
        images: Array.isArray(item.images)
          ? item.images.map((img: any) => ({
              image_id: img.image_id ? Number(img.image_id) : undefined,
              image_url: String(img.image_url || img.url || ''),
              caption: img.caption ?? null,
            }))
          : undefined,
      }));
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Record spawn inspection and optional replacement
   * POST /api/farm/sessions/:id/spawn-inspections
   */
  async recordSpawnInspection(
    sessionId: number | string,
    data: RecordSpawnInspectionRequest
  ): Promise<SpawnInspection> {
    try {
      const payload = {
        totalChecked: Number(data.totalChecked),
        normalQuantity: Number(data.normalQuantity),
        warningQuantity: Number(data.warningQuantity),
        abnormalQuantity: Number(data.abnormalQuantity),
        condition: data.condition,
        ...(data.replacementQuantity != null
          ? { replacementQuantity: Number(data.replacementQuantity) }
          : {}),
        ...(data.notes?.trim() ? { notes: data.notes.trim() } : {}),
        ...(data.nextCheckAt ? { nextCheckAt: data.nextCheckAt } : {}),
      };

      const response = await axiosClient.post<{ data: any } | any>(
        API_ENDPOINTS.FARM.SPAWN_INSPECTIONS(sessionId),
        payload
      );
      const resItem = ('data' in response.data ? response.data.data : response.data) || {};
      return {
        inspection_id: Number(resItem.inspection_id ?? resItem.id ?? Date.now()),
        session_id: Number(sessionId),
        total_checked: payload.totalChecked,
        normal_quantity: payload.normalQuantity,
        warning_quantity: payload.warningQuantity,
        abnormal_quantity: payload.abnormalQuantity,
        condition: payload.condition,
        replacement_quantity: payload.replacementQuantity ?? null,
        notes: payload.notes ?? null,
        next_check_at: payload.nextCheckAt ?? null,
        inspected_at: resItem.inspected_at ?? new Date().toISOString(),
      };
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Update session stage (SPAWN_RESTING | MYCELIAL_DEVELOPMENT | READY_FOR_CULTIVATION)
   * PATCH /api/farm/sessions/:id/stage
   */
  async updateSessionStage(
    sessionId: number | string,
    stage: 'SPAWN_RESTING' | 'MYCELIAL_DEVELOPMENT' | 'READY_FOR_CULTIVATION'
  ): Promise<void> {
    try {
      await axiosClient.patch(API_ENDPOINTS.FARM.SESSION_STAGE(sessionId), {
        stage,
      });
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Get farm session detail by ID
   * GET /api/farm/sessions/:id
   */
  async getFarmSessionDetail(sessionId: number | string): Promise<CultivationSessionAdmin> {
    try {
      const response = await axiosClient.get<{ data: CultivationSessionAdmin } | CultivationSessionAdmin>(
        API_ENDPOINTS.FARM.SESSION_DETAIL(sessionId)
      );
      if ('data' in response.data && response.data.data) {
        return response.data.data;
      }
      return response.data as CultivationSessionAdmin;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Get session growth progress history and latest observation
   * GET /api/cultivation-sessions/admin/:sessionId/progress
   */
  async getSessionProgress(sessionId: number | string): Promise<SessionProgressResponse> {
    try {
      const response = await axiosClient.get<{ data: SessionProgressResponse } | SessionProgressResponse>(
        API_ENDPOINTS.CULTIVATION_SESSIONS.ADMIN_PROGRESS(sessionId)
      );
      if ('data' in response.data && response.data.data) {
        return response.data.data;
      }
      return response.data as SessionProgressResponse;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Update growth stage, percent progress, observation condition and notes
   * PATCH /api/cultivation-sessions/admin/:sessionId/growth
   */
  async updateSessionGrowth(
    sessionId: number | string,
    data: UpdateGrowthRequest
  ): Promise<void> {
    try {
      const payload: Record<string, any> = {
        growthStatus: data.growthStatus,
        progressPercent: Number(data.progressPercent),
        condition: data.condition.trim(),
      };
      if (data.notes?.trim()) {
        payload.notes = data.notes.trim();
      }
      if (data.expectedHarvestDate?.trim()) {
        payload.expectedHarvestDate = data.expectedHarvestDate.trim();
      }

      await axiosClient.patch(
        API_ENDPOINTS.CULTIVATION_SESSIONS.ADMIN_GROWTH(sessionId),
        payload
      );
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Assess and update harvest readiness (ready: true/false)
   * PATCH /api/cultivation-sessions/admin/:sessionId/harvest-readiness
   */
  async updateHarvestReadiness(
    sessionId: number | string,
    data: UpdateHarvestReadinessRequest
  ): Promise<void> {
    try {
      const payload: Record<string, any> = {
        harvestReady: Boolean(data.harvestReady),
      };
      if (data.notes?.trim()) {
        payload.notes = data.notes.trim();
      }

      await axiosClient.patch(
        API_ENDPOINTS.CULTIVATION_SESSIONS.ADMIN_HARVEST_READINESS(sessionId),
        payload
      );
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Create a planned harvest for a harvest-ready session
   * POST /api/harvests
   * Body: { sessionId: number }
   */
  async createHarvest(sessionId: number | string): Promise<HarvestItem> {
    try {
      const response = await axiosClient.post<{ data: HarvestItem; message?: string } | HarvestItem>(
        API_ENDPOINTS.HARVESTS.CREATE,
        { sessionId: Number(sessionId) }
      );
      if ('data' in response.data && response.data.data) {
        return response.data.data;
      }
      return response.data as HarvestItem;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * List harvests for admin and operators
   * GET /api/harvests/admin
   */
  async getAdminHarvests(params?: {
    status?: string;
    mushroomTypeId?: number;
    orderId?: number;
  }): Promise<HarvestItem[]> {
    try {
      const response = await axiosClient.get<{ data: HarvestItem[] } | HarvestItem[]>(
        API_ENDPOINTS.HARVESTS.ADMIN_LIST,
        { params }
      );
      if ('data' in response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Get harvest detail by ID
   * GET /api/harvests/:id
   */
  async getHarvestDetail(harvestId: number | string): Promise<HarvestItem> {
    try {
      const response = await axiosClient.get<{ data: HarvestItem } | HarvestItem>(
        API_ENDPOINTS.HARVESTS.DETAIL(harvestId)
      );
      if ('data' in response.data && response.data.data) {
        return response.data.data;
      }
      return response.data as HarvestItem;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Start a planned harvest
   * POST /api/harvests/:id/start
   */
  async startHarvest(harvestId: number | string): Promise<HarvestItem> {
    try {
      const response = await axiosClient.post<{ data: HarvestItem; message?: string } | HarvestItem>(
        API_ENDPOINTS.HARVESTS.START(harvestId)
      );
      if ('data' in response.data && response.data.data) {
        return response.data.data;
      }
      return response.data as HarvestItem;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Record actual harvest yield
   * POST /api/harvests/:id/yield
   */
  async recordHarvestYield(
    harvestId: number | string,
    data: RecordYieldRequest
  ): Promise<HarvestItem> {
    try {
      const payload: Record<string, any> = {
        totalWeightKg: Number(data.totalWeightKg),
        usableWeightKg: Number(data.usableWeightKg),
        rejectedWeightKg: Number(data.rejectedWeightKg),
      };
      if (data.qualityGrade?.trim()) {
        payload.qualityGrade = data.qualityGrade.trim().toUpperCase();
      }
      if (data.notes?.trim()) {
        payload.notes = data.notes.trim();
      }

      const response = await axiosClient.post<{ data: HarvestItem; message?: string } | HarvestItem>(
        API_ENDPOINTS.HARVESTS.YIELD(harvestId),
        payload
      );
      if ('data' in response.data && response.data.data) {
        return response.data.data;
      }
      return response.data as HarvestItem;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  /**
   * Complete an in-progress harvest
   * POST /api/harvests/:id/complete
   */
  async completeHarvest(harvestId: number | string): Promise<HarvestItem> {
    try {
      const response = await axiosClient.post<{ data: HarvestItem; message?: string } | HarvestItem>(
        API_ENDPOINTS.HARVESTS.COMPLETE(harvestId)
      );
      if ('data' in response.data && response.data.data) {
        return response.data.data;
      }
      return response.data as HarvestItem;
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }
}

export const iotRepository = new IotRepository();
