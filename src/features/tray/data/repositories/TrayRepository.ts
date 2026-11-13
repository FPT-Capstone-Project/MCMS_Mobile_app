import { axiosClient } from '../../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../../core/api/endpoints';
import {
  CustomerFloorRack,
  CustomerGrowthHistoryItem,
  CustomerSensorReading,
  CustomerTrayDetails,
  CustomerTrayCard,
  CustomerDeviceLogItem,
  Tray,
  TrayId,
} from '../../domain/entities/Tray';
import { ITrayRepository } from '../../domain/repositories/ITrayRepository';
import { MOCK_TRAYS } from '../datasources/trayMockData';
import { cultivationRepository } from '../../../cultivation/data/repositories/CultivationRepository';
import { orderRepository } from '../../../order/data/repositories/OrderRepository';
import { iotRepository } from '../../../iot/data/repositories/IotRepository';
import { AppError } from '../../../../core/errors/appError';
import { handleApiError } from '../../../../core/errors/errorHandler';

/**
 * Tray repository for the live customer floor layout and legacy local tray selections.
 */
export class TrayRepository implements ITrayRepository {
  private trays: Tray[] = [...MOCK_TRAYS];

  async getTrays(): Promise<Tray[]> {
    // Return a shallow clone of trays
    return [...this.trays];
  }

  async getTrayById(id: TrayId | string): Promise<Tray | null> {
    const found = this.trays.find((t) => t.id === id);
    return found ? { ...found } : null;
  }

  async getMyRentedTrays(): Promise<Tray[]> {
    return this.trays.filter((t) => t.status === 'MY_RENTED_TRAY');
  }

  async getCustomerCultivationDetails(
    sessionId: number,
    orderId?: number | null
  ): Promise<CustomerTrayDetails> {
    try {
      let progress: any[] = [];
      let sessionStatus: Awaited<
        ReturnType<typeof orderRepository.getCustomerCultivationStatus>
      >['sessions'][number] | undefined;
      if (orderId && orderId > 0) {
        const cultivationStatus = await orderRepository.getCustomerCultivationStatus(orderId);
        sessionStatus = cultivationStatus.sessions.find(
          (session) => Number(session.session_id) === sessionId
        );
        if (!sessionStatus) {
          throw new AppError(
            'Không tìm thấy trạng thái phiên nuôi trồng của khay này.',
            'API_ERROR',
            404
          );
        }

        try {
          const pRes = await axiosClient.get<{ data: any[] }>(
            API_ENDPOINTS.CUSTOMER.CULTIVATION_PROGRESS(orderId)
          );
          if (Array.isArray(pRes.data?.data)) {
            progress = pRes.data.data;
          }
        } catch {
          // Fall through to admin progress
        }
      }

      if (progress.length === 0) {
        try {
          const adminProgRes = await axiosClient.get<{ data: any } | any>(
            API_ENDPOINTS.CULTIVATION_SESSIONS.ADMIN_PROGRESS(sessionId)
          );
          const progData = adminProgRes.data?.data ?? adminProgRes.data;
          if (Array.isArray(progData?.progress_history)) {
            progress = progData.progress_history;
          }
        } catch {
          // Ignore
        }
      }

      const [iotResponse, sensorResponse] = await Promise.allSettled([
        axiosClient.get<{ data: CustomerSessionIotHistory }>(
          API_ENDPOINTS.CUSTOMER.IOT_HISTORY(sessionId),
          { params: { page: 1, pageSize: 100 } }
        ),
        axiosClient.get<{ data: CustomerSensorHistory }>(
          API_ENDPOINTS.CUSTOMER.IOT_SENSOR_HISTORY(sessionId),
          { params: { page: 1, pageSize: 100 } }
        ),
      ]);

      const iotHistory = iotResponse.status === 'fulfilled' ? iotResponse.value.data?.data : null;
      const sensorHistory = sensorResponse.status === 'fulfilled' ? sensorResponse.value.data?.data : null;

      return {
        session_id: sessionId,
        cultivation_status: sessionStatus?.status,
        harvest_status: sessionStatus?.harvest_status,
        current_stage: sessionStatus?.current_stage,
        progress_percent: sessionStatus?.progress_percent,
        growth_history: progress
          .filter((item) => Number(item.session_id) === sessionId || !item.session_id)
          .map((item): CustomerGrowthHistoryItem => {
            const progressPercent =
              item.progress_percent == null ? null : Number(item.progress_percent);
            return {
              progress_id: item.progress_id ?? item.id ?? 0,
              session_id: sessionId,
              current_stage: item.current_stage || item.growth_status || 'UNKNOWN',
              progress_percent:
                progressPercent !== null && Number.isFinite(progressPercent)
                  ? progressPercent
                  : null,
              condition: item.condition ?? null,
              description: item.description ?? item.notes ?? null,
              updated_at:
                item.updated_at ||
                item.created_at ||
                item.recorded_at ||
                new Date().toISOString(),
            };
          }),
        device_logs: Array.isArray(iotHistory?.deviceEvents) ? iotHistory.deviceEvents : [],
        sensor_readings: Array.isArray(sensorHistory?.readings)
          ? sensorHistory.readings.map((reading) => ({
              ...reading,
              temperature: toNullableNumber(reading.temperature),
              humidity: toNullableNumber(reading.humidity),
            }))
          : [],
      };
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  async getCustomerSensorHistory(sessionId: number): Promise<CustomerSensorReading[]> {
    try {
      const response = await axiosClient.get<{ data: CustomerSensorHistory }>(
        API_ENDPOINTS.CUSTOMER.IOT_SENSOR_HISTORY(sessionId),
        { params: { page: 1, pageSize: 100 } }
      );
      if (!Array.isArray(response.data?.data?.readings)) {
        throw new AppError('Dữ liệu cảm biến từ máy chủ không hợp lệ.', 'API_ERROR', 500);
      }
      return response.data.data.readings.map((reading) => ({
        ...reading,
        temperature: toNullableNumber(reading.temperature),
        humidity: toNullableNumber(reading.humidity),
      }));
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  async getCustomerFloorRacks(): Promise<CustomerFloorRack[]> {
    const [floors, trays, orders] = await Promise.all([
      iotRepository.getFloors(),
      cultivationRepository.getTrays(),
      orderRepository.getCustomerOrders(),
    ]);

    const activeOrders = orders.filter(
      (order) =>
        order.payment_status === 'PAID' &&
        order.order_status !== 'COMPLETED' &&
        order.order_status !== 'CANCELLED'
    );
    const customerSessions = await Promise.all(
      activeOrders.map((order) => orderRepository.getCustomerCultivationStatus(order.order_id))
    );

    const ownedTraySessions = new Map<number, { sessionId: number; orderId: number }>();
    for (const result of customerSessions) {
      for (const session of result.sessions) {
        if (!['CULTIVATING', 'HARVEST_READY', 'HARVESTING'].includes(session.status)) continue;
        for (const assignedTray of session.assigned_trays) {
          const assignmentStatus = String(
            (assignedTray as any).assignment_status ||
            (assignedTray.status === 'ACTIVE' || assignedTray.status === 'RELEASED' ? assignedTray.status : '')
          ).trim().toUpperCase();
          // STRICT RULE: Only ACTIVE assignment status means session is occupying this tray
          if (assignmentStatus === 'ACTIVE') {
            ownedTraySessions.set(assignedTray.tray_id, {
              sessionId: session.session_id,
              orderId: result.orderId,
            });
          }
        }
      }
    }

    // Also fetch active admin cultivation sessions and historical past sessions
    const activeAdminTraySessions = new Map<
      number,
      { sessionId: number; sessionTrayId?: number; mushroomName?: string }
    >();
    const pastTraySessions = new Map<
      number,
      { sessionId: number; sessionTrayId?: number; mushroomName?: string }[]
    >();
    let hasAdminSessionData = false;

    try {
      const allSessions = await iotRepository.getAdminCultivationSessions();
      if (Array.isArray(allSessions)) {
        hasAdminSessionData = true;
        for (const sess of allSessions) {
          const sessStatus = String(sess.status || '').trim().toUpperCase();
          const isSessionActive = ['CULTIVATING', 'HARVEST_READY', 'HARVESTING'].includes(sessStatus);

          if (Array.isArray(sess.trays)) {
            for (const t of sess.trays) {
              const trayId = Number(t.tray_id);
              if (!trayId) continue;

              const assignmentStatus = String(
                t.assignment_status || (t.status === 'ACTIVE' || t.status === 'RELEASED' ? t.status : '')
              ).trim().toUpperCase();

              // User requirement: Only assignment_status === 'ACTIVE' on an active session occupies the tray
              if (isSessionActive && assignmentStatus === 'ACTIVE') {
                activeAdminTraySessions.set(trayId, {
                  sessionId: sess.session_id,
                  sessionTrayId: t.session_tray_id ? Number(t.session_tray_id) : undefined,
                  mushroomName: sess.mushroom_name || undefined,
                });
              } else {
                // Record into past sessions history (e.g. RELEASED links or completed sessions)
                const existingPast = pastTraySessions.get(trayId) || [];
                if (!existingPast.some((p) => p.sessionId === sess.session_id)) {
                  existingPast.push({
                    sessionId: sess.session_id,
                    sessionTrayId: t.session_tray_id ? Number(t.session_tray_id) : undefined,
                    mushroomName: sess.mushroom_name || undefined,
                  });
                  pastTraySessions.set(trayId, existingPast);
                }
              }
            }
          }
        }
      }
    } catch {
      // Ignored for non-staff / customers who don't have access to admin endpoints
    }

    const activeFloors = floors.filter((floor) => floor.status === 'ACTIVE' && floor.floor_id);

    // Fetch available trays directly from backend API for each floor
    const availableTrayIdsSet = new Set<number>();
    try {
      const availableResults = await Promise.all(
        activeFloors.map((f) =>
          f.floor_id ? iotRepository.getAvailableTraysForFloor(f.floor_id).catch(() => []) : []
        )
      );
      availableResults.flat().forEach((t) => {
        if (t && t.tray_id) {
          availableTrayIdsSet.add(Number(t.tray_id));
        }
      });
    } catch {
      // Ignore
    }

    return activeFloors
      .map((floor): CustomerFloorRack => {
        const floorId = floor.floor_id;
        if (!floorId) throw new AppError('Mã tầng nuôi trồng không hợp lệ.', 'API_ERROR', 500);
        const floorTrays = trays
          .filter((tray) => tray.floor_id === floorId)
          .sort((left, right) => {
            const rowDifference = (left.row_number ?? 0) - (right.row_number ?? 0);
            return rowDifference || (left.column_number ?? 0) - (right.column_number ?? 0);
          });

        const rackTrays = floorTrays.map((tray): CustomerTrayCard => {
          const rawPhysicalStatus = String(
            tray.status || (tray as any).tray_status || ''
          )
            .trim()
            .toUpperCase();

          // A tray is AVAILABLE if:
          // 1. Backend explicitly returns it in available-trays API
          // 2. Physical tray status is AVAILABLE, RELEASE, or RELEASED
          const isExplicitlyAvailable = availableTrayIdsSet.has(tray.tray_id);
          const isPhysicalAvailable =
            rawPhysicalStatus === 'AVAILABLE' ||
            rawPhysicalStatus === 'RELEASE' ||
            rawPhysicalStatus === 'RELEASED';

          let activeSessionId: number | undefined;
          let activeSessionTrayId: number | undefined;
          let activeMushroomName: string | undefined;

          // STRICT RULE: If tray is returned in available-trays API or physically AVAILABLE,
          // it CANNOT be occupied by any session (past or released links are ignored).
          if (isExplicitlyAvailable || isPhysicalAvailable) {
            activeSessionId = undefined;
            activeSessionTrayId = undefined;
            activeMushroomName = undefined;
          } else if (hasAdminSessionData) {
            // For staff: only an assignment with assignment_status === 'ACTIVE' can occupy
            const adminSessionTray = activeAdminTraySessions.get(tray.tray_id);
            if (adminSessionTray) {
              activeSessionId = adminSessionTray.sessionId;
              activeSessionTrayId = adminSessionTray.sessionTrayId;
              activeMushroomName = adminSessionTray.mushroomName;
            }
          } else {
            // For customer
            const ownedSession = ownedTraySessions.get(tray.tray_id);
            if (ownedSession) {
              activeSessionId = ownedSession.sessionId;
            }
          }

          const isCurrentlyActive = activeSessionId != null;
          const ownedSession = ownedTraySessions.get(tray.tray_id);
          const hasOwnActiveCultivation =
            isCurrentlyActive && ownedSession?.sessionId === activeSessionId;

          const positionCode =
            tray.row_number != null && tray.column_number != null
              ? `R${tray.row_number}-C${tray.column_number}`
              : tray.tray_code;

          return {
            id: tray.tray_id,
            code: positionCode,
            usage: isCurrentlyActive
              ? hasOwnActiveCultivation
                ? 'MY_CULTIVATION'
                : 'OTHER_CULTIVATION'
              : 'AVAILABLE',
            mushroomName: isCurrentlyActive ? activeMushroomName : undefined,
            sessionId: isCurrentlyActive ? activeSessionId : undefined,
            sessionTrayId: isCurrentlyActive ? activeSessionTrayId : undefined,
            orderId: isCurrentlyActive ? ownedSession?.orderId : undefined,
            floorId,
            floorNumber: floor.floor_number,
            pastSessions: pastTraySessions.get(tray.tray_id) || [],
          };
        });

        return {
          id: floorId,
          floorNumber: floor.floor_number,
          floorName: floor.floor_name,
          trays: rackTrays,
        };
      })
      .sort((left, right) => left.floorNumber - right.floorNumber);
  }

  /**
   * Helper to update tray status locally after booking
   */
  async updateTrayStatus(id: TrayId, status: Tray['status']): Promise<Tray> {
    const index = this.trays.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.trays[index] = {
        ...this.trays[index],
        status,
      };
      return this.trays[index];
    }
    throw new Error(`Tray ${id} not found`);
  }
}

export const trayRepository = new TrayRepository();

function toNullableNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}


interface CustomerSessionIotHistory {
  deviceEvents: CustomerDeviceLogItem[];
}

interface CustomerSensorHistory {
  readings: CustomerSensorReading[];
}
