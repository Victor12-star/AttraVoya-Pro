export class ApiClientError extends Error {
  constructor(message, options = {}) {
    super(message, { cause: options.cause });
    this.name = 'ApiClientError';
    this.status = options.status ?? 0;
    this.code = options.code ?? 'CLIENT_REQUEST_FAILED';
    this.requestId = options.requestId ?? null;
    this.details = options.details;
  }
}
