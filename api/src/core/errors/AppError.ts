export interface AppErrorDetails {
  field: string;
  message: string;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: AppErrorDetails[];

  constructor(
    statusCode: number,
    message: string,
    code: string,
    details?: AppErrorDetails[],
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
