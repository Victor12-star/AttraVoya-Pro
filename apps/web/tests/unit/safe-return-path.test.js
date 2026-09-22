import { describe, expect, it } from 'vitest';

import { safeAuthReturnPath } from '../../src/features/auth/safe-return-path.js';

describe('safe authentication return paths', () => {
  it('allows the account deletion flow and rejects open redirects', () => {
    expect(safeAuthReturnPath('/delete-account')).toBe('/delete-account');
    expect(safeAuthReturnPath('https://attacker.example')).toBe('/trips');
    expect(safeAuthReturnPath('//attacker.example')).toBe('/trips');
    expect(safeAuthReturnPath('/delete-account?next=https://attacker.example')).toBe('/trips');
  });
});
