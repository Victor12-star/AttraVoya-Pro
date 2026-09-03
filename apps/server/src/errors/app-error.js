import { ERROR_CODES } from './error-codes.js';

/**
 * Base class for expected application failures.
 *
 * `expose` controls whether the original message is safe to return publicly.
 * Unexpected provider/database errors should normally keep expose=false and be
 * logged with the request ID instead of leaking implementation details.
 */
export class AppError extends Error {
  constructor(message, options = {}) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? ERROR_CODES.INTERNAL_ERROR;
    this.details = options.details;
    this.expose = options.expose ?? this.statusCode < 500;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'The request contains invalid data.', options = {}) {
    super(message, {
      ...options,
      statusCode: 400,
      code: options.code ?? ERROR_CODES.VALIDATION_ERROR,
      expose: true,
    });
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication is required.', options = {}) {
    super(message, {
      ...options,
      statusCode: 401,
      code: options.code ?? ERROR_CODES.AUTHENTICATION_REQUIRED,
      expose: true,
    });
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action.', options = {}) {
    super(message, {
      ...options,
      statusCode: 403,
      code: ERROR_CODES.FORBIDDEN,
      expose: true,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.', options = {}) {
    super(message, {
      ...options,
      statusCode: 404,
      code: ERROR_CODES.NOT_FOUND,
      expose: true,
    });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'The request conflicts with the current resource state.', options = {}) {
    super(message, {
      ...options,
      statusCode: 409,
      code: ERROR_CODES.CONFLICT,
      expose: true,
    });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'The service is temporarily unavailable.', options = {}) {
    super(message, {
      ...options,
      statusCode: 503,
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      expose: true,
    });
  }
}


export class ExternalServiceError extends AppError {
  constructor(message = 'An external service could not complete the request.', options = {}) {
    super(message, {
      ...options,
      statusCode: options.statusCode ?? 502,
      code: options.code ?? ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      expose: options.expose ?? true,
    });
  }
}

export class ProviderAuthenticationError extends ExternalServiceError {
  constructor(message = 'A travel data provider is not configured correctly.', options = {}) {
    super(message, {
      ...options,
      statusCode: 503,
      code: ERROR_CODES.PROVIDER_AUTHENTICATION_ERROR,
      expose: true,
    });
  }
}

export class ProviderRateLimitError extends ExternalServiceError {
  constructor(message = 'A travel data provider is temporarily rate limited.', options = {}) {
    super(message, {
      ...options,
      statusCode: 503,
      code: ERROR_CODES.PROVIDER_RATE_LIMITED,
      expose: true,
    });
  }
}

export class ProviderUnavailableError extends ExternalServiceError {
  constructor(message = 'A travel data provider is temporarily unavailable.', options = {}) {
    super(message, {
      ...options,
      statusCode: 503,
      code: ERROR_CODES.PROVIDER_UNAVAILABLE,
      expose: true,
    });
  }
}

export class ProviderResponseError extends ExternalServiceError {
  constructor(message = 'A travel data provider returned an invalid response.', options = {}) {
    super(message, {
      ...options,
      statusCode: 502,
      code: ERROR_CODES.PROVIDER_RESPONSE_ERROR,
      expose: true,
    });
  }
}
