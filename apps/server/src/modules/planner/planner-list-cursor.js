import { ValidationError } from '../../errors/app-error.js';

const CURSOR_VERSION = 1;
const MAX_CURSOR_ID_LENGTH = 128;

function invalidCursor() {
  return new ValidationError('The planner request cursor is invalid.');
}

/**
 * Encode only the stable keyset boundary needed for the next owner-scoped
 * planner page. The cursor contains no budget, traveller, destination, or other
 * private planner content.
 */
export function encodePlannerRequestCursor(record) {
  if (!(record?.createdAt instanceof Date) || Number.isNaN(record.createdAt.getTime())) {
    throw new TypeError('Planner cursor requires a valid createdAt date.');
  }
  if (
    typeof record.id !== 'string' ||
    record.id.length < 1 ||
    record.id.length > MAX_CURSOR_ID_LENGTH
  ) {
    throw new TypeError('Planner cursor requires a bounded request id.');
  }

  return Buffer.from(
    JSON.stringify({
      v: CURSOR_VERSION,
      createdAt: record.createdAt.toISOString(),
      id: record.id,
    }),
  ).toString('base64url');
}

export function decodePlannerRequestCursor(cursor) {
  try {
    const decoded = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8'));
    const createdAt = new Date(decoded?.createdAt);
    if (
      decoded?.v !== CURSOR_VERSION ||
      typeof decoded.id !== 'string' ||
      decoded.id.length < 1 ||
      decoded.id.length > MAX_CURSOR_ID_LENGTH ||
      Number.isNaN(createdAt.getTime()) ||
      createdAt.toISOString() !== decoded.createdAt
    ) {
      throw invalidCursor();
    }

    return { createdAt, id: decoded.id };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw invalidCursor();
  }
}
