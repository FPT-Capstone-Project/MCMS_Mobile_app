import { axiosClient } from '../../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../../core/api/endpoints';
import { EnvironmentHistoryData } from '../../domain/entities/EnvironmentHistory';
import {
  GetEnvironmentHistoryParams,
  IAnalyticsRepository,
} from '../../domain/repositories/IAnalyticsRepository';

export class AnalyticsRepository implements IAnalyticsRepository {
  /**
   * Fetches aggregated environment history for all active floors in the last 24h.
   * Access restricted to Admin & Farm Operator.
   * Endpoint: GET /api/analytics/dashboard/environment-history
   */
  async getEnvironmentHistory(
    params?: GetEnvironmentHistoryParams
  ): Promise<EnvironmentHistoryData> {
    const response = await axiosClient.get<{ data: EnvironmentHistoryData } | EnvironmentHistoryData>(
      API_ENDPOINTS.ANALYTICS.ENVIRONMENT_HISTORY,
      { params }
    );
    // Backend returns { data: { from, to, bucketMs, refreshAfterMs, floors: [...] } }
    // Check if response is wrapped in { data: ... } or already unwrapped
    const body: any = response.data;
    if (body && typeof body === 'object' && 'data' in body && body.data?.floors) {
      return body.data as EnvironmentHistoryData;
    }
    return body as EnvironmentHistoryData;
  }
}

export const analyticsRepository = new AnalyticsRepository();

