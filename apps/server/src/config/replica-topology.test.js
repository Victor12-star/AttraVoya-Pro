import { describe, expect, it } from 'vitest';

import { assertSupportedReplicaTopology } from './replica-topology.js';

describe('API replica topology contract', () => {
  it('defaults an undeclared topology to one replica', () => {
    expect(
      assertSupportedReplicaTopology({ nodeEnv: 'production', replicaCount: undefined }),
    ).toBe(1);
  });

  it('accepts exactly one declared production API replica', () => {
    expect(assertSupportedReplicaTopology({ nodeEnv: 'production', replicaCount: '1' })).toBe(1);
  });

  it('fails closed when production declares more than one active API replica', () => {
    expect(() =>
      assertSupportedReplicaTopology({ nodeEnv: 'production', replicaCount: '2' }),
    ).toThrow(/production currently supports exactly 1 active API replica/);
  });

  it('allows multi-process non-production exercises without claiming production safety', () => {
    expect(assertSupportedReplicaTopology({ nodeEnv: 'test', replicaCount: '4' })).toBe(4);
  });

  it.each(['0', '-1', '1.5', 'many', '101'])(
    'rejects invalid declared replica count %s',
    (replicaCount) => {
      expect(() =>
        assertSupportedReplicaTopology({ nodeEnv: 'test', replicaCount }),
      ).toThrow(/use a whole number between 1 and 100/);
    },
  );
});
