import { describe, expect, it } from 'vitest';

import { decodePlannerRequestCursor, encodePlannerRequestCursor } from './planner-list-cursor.js';

describe('planner request list cursor', () => {
  it('round-trips only the stable pagination boundary', () => {
    const record = {
      id: 'plan-request-9',
      createdAt: new Date('2026-09-07T10:20:30.000Z'),
      budgetAmount: '25000.00',
      childrenAges: [6, 9],
      originLabel: 'Stockholm',
    };

    const cursor = encodePlannerRequestCursor(record);
    const decodedText = Buffer.from(cursor, 'base64url').toString('utf8');

    expect(decodePlannerRequestCursor(cursor)).toEqual({
      id: 'plan-request-9',
      createdAt: new Date('2026-09-07T10:20:30.000Z'),
    });
    expect(decodedText).not.toContain('25000');
    expect(decodedText).not.toContain('Stockholm');
    expect(decodedText).not.toContain('children');
  });

  it.each(['not-json', Buffer.from('{}').toString('base64url')])(
    'fails closed for invalid cursor %s',
    (cursor) => {
      expect(() => decodePlannerRequestCursor(cursor)).toThrow(
        'The planner request cursor is invalid.',
      );
    },
  );
});
