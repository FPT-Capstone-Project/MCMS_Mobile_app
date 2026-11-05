import { EnvironmentHistoryData } from '../entities/EnvironmentHistory';

export interface GetEnvironmentHistoryParams {
  from?: string; // ISO 8601 timestamp with timezone
  to?: string; // ISO 8601 timestamp with timezone
}

export interface IAnalyticsRepository {
  getEnvironmentHistory(params?: GetEnvironmentHistoryParams): Promise<EnvironmentHistoryData>;
}

