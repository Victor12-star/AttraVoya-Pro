import { AppError } from './app-error.js';
import { ERROR_CODES } from './error-codes.js';
import { safeErrorForLog } from '../logging/redaction.js';

function classifyError(error) {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.expose ? error.message : 'An unexpected error occurred.',
      details: error.expose ? error.details : undefined,
    };
  }

  // Fastify and its plugins attach validation/status metadata to some expected
  // errors. Map those into our public contract instead of accidentally turning
  // a client error or rate limit into a 500 response.
  if (Array.isArray(error.validation)) {
    return {
      statusCode: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'The request contains invalid data.',
    };
  }

  if (error.statusCode === 429) {
    return {
      statusCode: 429,
      code: ERROR_CODES.RATE_LIMITED,
      message: 'Too many requests. Please try again shortly.',
    };
  }

  if (error.statusCode === 401) {
    return {
      statusCode: 401,
      code: ERROR_CODES.AUTHENTICATION_REQUIRED,
      message: 'Authentication is required.',
    };
  }

  if (error.statusCode === 403) {
    return {
      statusCode: 403,
      code: ERROR_CODES.FORBIDDEN,
      message: 'You do not have permission to perform this action.',
    };
  }

  return {
    statusCode: 500,
    code: ERROR_CODES.INTERNAL_ERROR,
    message: 'An unexpected error occurred.',
  };
}

export function registerErrorHandler(app) {
  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'The requested API resource was not found.',
        requestId: request.id,
      },
    });
  });

  app.setErrorHandler((error, request, reply) => {
    const publicError = classifyError(error);

    request.log.error(
      {
        error: safeErrorForLog(error),
        requestId: request.id,
        code: publicError.code,
      },
      'Request failed',
    );

    return reply.status(publicError.statusCode).send({
      error: {
        code: publicError.code,
        message: publicError.message,
        requestId: request.id,
        ...(publicError.details ? { details: publicError.details } : {}),
      },
    });
  });
}
