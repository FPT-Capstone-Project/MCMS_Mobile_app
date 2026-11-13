/**
 * Debug Logger for IoT & Farm API calls with token redaction
 */

export interface ApiDebugInfo {
  tag: string;
  method: string;
  url: string;
  headers?: Record<string, any>;
  payload?: any;
  fileMetadata?: {
    name?: string;
    type?: string;
    size?: number | null;
    uri?: string;
  };
  status?: number;
  responseBody?: any;
  error?: any;
  stack?: string;
}

export function logApiDebug(info: ApiDebugInfo) {
  const timestamp = new Date().toISOString();
  const redactedHeaders = { ...(info.headers || {}) };
  if (redactedHeaders.Authorization) {
    redactedHeaders.Authorization = 'Bearer [REDACTED]';
  }
  if (redactedHeaders.authorization) {
    redactedHeaders.authorization = 'Bearer [REDACTED]';
  }

  const logData: Record<string, any> = {
    timestamp,
    tag: info.tag,
    method: info.method,
    url: info.url,
  };

  if (Object.keys(redactedHeaders).length > 0) {
    logData.headers = redactedHeaders;
  }
  if (info.payload !== undefined) {
    logData.payload = info.payload;
  }
  if (info.fileMetadata !== undefined) {
    logData.fileMetadata = info.fileMetadata;
  }
  if (info.status !== undefined) {
    logData.status = info.status;
  }
  if (info.responseBody !== undefined) {
    logData.responseBody = info.responseBody;
  }
  if (info.error !== undefined) {
    logData.error = info.error;
  }
  if (info.stack !== undefined) {
    logData.stack = info.stack;
  }

  // Console output
  console.log(`\n[MCMS DEBUG][${info.tag}] ${info.method} ${info.url}`);
  console.log(JSON.stringify(logData, null, 2));
}

