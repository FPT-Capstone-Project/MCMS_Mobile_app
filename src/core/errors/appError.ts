/**
 * Domain & Application Error Hierarchy
 * Provides typed, actionable error objects across all Clean Architecture layers.
 */

export type ErrorDetails = Record<string, string[] | string | undefined>;

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: ErrorDetails;

  constructor(message: string, code: string = 'APP_ERROR', statusCode?: number, details?: ErrorDetails) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network connectivity issue. Please check your internet connection.') {
    super(message, 'NETWORK_ERROR', 0);
    this.name = 'NetworkError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Session expired or unauthenticated.', statusCode: number = 401) {
    super(message, 'AUTH_ERROR', statusCode);
    this.name = 'AuthError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed.', details?: ErrorDetails) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Requested resource was not found.') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ServerError extends AppError {
  constructor(message: string = 'An unexpected server error occurred.', statusCode: number = 500) {
    super(message, 'SERVER_ERROR', statusCode);
    this.name = 'ServerError';
  }
}
