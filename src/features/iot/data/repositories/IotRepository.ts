import { axiosClient } from '../../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../../core/api/endpoints';
import { AppError } from '../../../../core/errors/appError';
import { handleApiError } from '../../../../core/errors/errorHandler';
import {
  AdminRental,
  AutoControlConfigResponse,
  AutoControlLogsResponse,
  AutoControlStatus,
  AutoControlSuggestions,
  AutoMistingConfig,
  FloorEnvironment,
  FloorMapping,
  IotCommand,
  IotHistory,
  IotMaster,
  IotSensor,
  IotSsr,
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
   * Strictly filters and validates allowed fields.
   */
  async saveAutoControlConfig(floorId: number, config: AutoMistingConfig): Promise<void> {
    try {
      const payload: Record<string, any> = {
        config_source: 'FLOOR',
        profile_name: config.profile_name?.trim() || 'Shared floor profile',
        profile_approved: true,
        humidity_min: Number(config.humidity_min),
        humidity_max: Number(config.humidity_max),
        humidity_start_threshold: Number(config.humidity_start_threshold),
        humidity_stop_threshold: Number(config.humidity_stop_threshold),
        cooling_enabled: Boolean(config.cooling_enabled),
        misting_pulse_ms: Number(config.misting_pulse_ms),
        cooldown_ms: Number(config.cooldown_ms),
        evaluation_interval_ms: Number(config.evaluation_interval_ms),
        sensor_max_age_ms: Number(config.sensor_max_age_ms ?? 20000),
        required_valid_sensors: Number(config.required_valid_sensors ?? 3),
        max_sensor_spread_percent: Number(config.max_sensor_spread_percent),
        max_activations_per_hour: Number(config.max_activations_per_hour),
        max_cumulative_on_ms_per_hour: Number(config.max_cumulative_on_ms_per_hour),
      };

      if (payload.cooling_enabled) {
        if (config.temperature_min != null) payload.temperature_min = Number(config.temperature_min);
        if (config.temperature_max != null) payload.temperature_max = Number(config.temperature_max);
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
}

export const iotRepository = new IotRepository();
