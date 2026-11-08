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
    orderId: number
  ): Promise<CustomerTrayDetails> {
    try {
      const [progressResponse, iotResponse, sensorResponse] = await Promise.all([
        axiosClient.get<{ data: CustomerProgressHistoryItem[] }>(
          API_ENDPOINTS.CUSTOMER.CULTIVATION_PROGRESS(orderId)
        ),
        axiosClient.get<{ data: CustomerSessionIotHistory }>(
          API_ENDPOINTS.CULTIVATION_SESSIONS.ADMIN_IOT_HISTORY(sessionId),
          { params: { page: 1, pageSize: 100 } }
        ),
        axiosClient.get<{ data: CustomerSensorHistory }>(
          API_ENDPOINTS.CULTIVATION_SESSIONS.ADMIN_IOT_SENSOR_HISTORY(sessionId),
          { params: { page: 1, pageSize: 100 } }
        ),
      ]);

      const progress = progressResponse.data?.data;
      const iotHistory = iotResponse.data?.data;
      const sensorHistory = sensorResponse.data?.data;
      if (
        !Array.isArray(progress) ||
        !iotHistory ||
        !Array.isArray(iotHistory.deviceEvents) ||
        !sensorHistory ||
        !Array.isArray(sensorHistory.readings)
      ) {
        throw new AppError('Dữ liệu lịch sử vụ trồng từ máy chủ không hợp lệ.', 'API_ERROR', 500);
      }

      return {
        session_id: sessionId,
        growth_history: progress
          .filter((item) => Number(item.session_id) === sessionId)
          .map((item) => ({
            ...item,
            progress_percent: Number(item.progress_percent),
            condition: null,
          })),
        device_logs: iotHistory.deviceEvents,
        sensor_readings: sensorHistory.readings.map((reading) => ({
          ...reading,
          temperature: toNullableNumber(reading.temperature),
          humidity: toNullableNumber(reading.humidity),
        })),
      };
    } catch (error) {
      throw error instanceof AppError ? error : handleApiError(error);
    }
  }

  async getCustomerSensorHistory(sessionId: number): Promise<CustomerSensorReading[]> {
    try {
      const response = await axiosClient.get<{ data: CustomerSensorHistory }>(
        API_ENDPOINTS.CULTIVATION_SESSIONS.ADMIN_IOT_SENSOR_HISTORY(sessionId),
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
          if (assignedTray.status === 'ACTIVE') {
            ownedTraySessions.set(assignedTray.tray_id, {
              sessionId: session.session_id,
              orderId: result.orderId,
            });
          }
        }
      }
    }

    const activeFloors = floors.filter((floor) => floor.status === 'ACTIVE' && floor.floor_id);
    const floorCultivation = await Promise.all(
      activeFloors.map(async (floor) => {
        const floorId = floor.floor_id;
        if (!floorId) throw new AppError('Mã tầng nuôi trồng không hợp lệ.', 'API_ERROR', 500);
        const config = await iotRepository.getAutoControlConfig(floorId);
        const activeTrays = config.cultivation?.trays;
        if (!Array.isArray(activeTrays)) {
          throw new AppError('Dữ liệu khay đang trồng từ máy chủ không hợp lệ.', 'API_ERROR', 500);
        }
        return { floorId, activeTrays };
      })
    );

    const activeTrayById = new Map(
      floorCultivation.flatMap(({ activeTrays }) =>
        activeTrays
          .filter((tray) => tray.session_id != null)
          .map((tray) => [tray.tray_id, tray] as const)
      )
    );

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
          const activeTray = activeTrayById.get(tray.tray_id);
          const ownedSession = ownedTraySessions.get(tray.tray_id);
          const hasOwnActiveCultivation =
            activeTray?.session_id != null &&
            ownedSession?.sessionId === activeTray.session_id;
          const hasOtherActiveCultivation =
            activeTray?.session_id != null && !hasOwnActiveCultivation;
          const positionCode =
            tray.row_number != null && tray.column_number != null
              ? `R${tray.row_number}-C${tray.column_number}`
              : tray.tray_code;

          return {
            id: tray.tray_id,
            code: positionCode,
            usage: hasOwnActiveCultivation
              ? 'MY_CULTIVATION'
              : hasOtherActiveCultivation
                ? 'OTHER_CULTIVATION'
                : 'AVAILABLE',
            mushroomName: activeTray?.mushroom_name ?? undefined,
            sessionId: hasOwnActiveCultivation ? ownedSession?.sessionId : undefined,
            orderId: hasOwnActiveCultivation ? ownedSession?.orderId : undefined,
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

type CustomerProgressHistoryItem = CustomerGrowthHistoryItem;

interface CustomerSessionIotHistory {
  deviceEvents: CustomerDeviceLogItem[];
}

interface CustomerSensorHistory {
  readings: CustomerSensorReading[];
}
