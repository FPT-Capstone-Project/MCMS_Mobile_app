import { EnvironmentHistoryData } from '../entities/EnvironmentHistory';

export interface GetEnvironmentHistoryParams {
  bucketMinutes?: 15 | 30 | 60;
  from?: string; // ISO 8601 timestamp with timezone
  to?: string; // ISO 8601 timestamp with timezone
}

export interface IAnalyticsRepository {
  getEnvironmentHistory(params?: GetEnvironmentHistoryParams): Promise<EnvironmentHistoryData>;
}

