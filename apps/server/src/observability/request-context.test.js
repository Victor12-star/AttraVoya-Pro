import { describe, expect, it } from 'vitest';

import { getCurrentRequestId, runWithRequestContext } from './request-context.js';

describe('request context', () => {
  it('keeps a validated request id across asynchronous work', async () => {
    const requestId = '11111111-1111-4111-8111-111111111111';

    await runWithRequestContext(requestId, async () => {
      await Promise.resolve();
      expect(getCurrentRequestId()).toBe(requestId);
    });

    expect(getCurrentRequestId()).toBeNull();
  });

  it('does not expose malformed request identifiers', async () => {
    await runWithRequestContext('user@example.test', async () => {
      expect(getCurrentRequestId()).toBeNull();
    });
  });
});
