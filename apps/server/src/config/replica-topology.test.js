import { describe, expect, it } from 'vitest';

import {
  assertSupportedReplicaTopology,
  resolveSupportedReplicaTopology,
} from './replica-topology.js';

function declareReplicaCount(nodeEnv, replicaCount) {
  return assertSupportedReplicaTopology({ nodeEnv, replicaCount });
}

describe('API replica topology contract', () => {
  it('defaults an undeclared topology to one replica', () => {
    expect(declareReplicaCount('production', undefined)).toBe(1);
  });

  it('accepts exactly one declared production API replica', () => {
    expect(declareReplicaCount('production', '1')).toBe(1);
  });

  it('fails closed when production replicas lack external metric aggregation', () => {
    expect(() => declareReplicaCount('production', '2')).toThrow(
      "Invalid AttraVoya Pro server environment:\nMETRICS_AGGREGATION_MODE: production with multiple API replicas requires 'external'.",
    );
  });

  it('accepts production replicas with external aggregation and a validated instance identity', () => {
    expect(
      resolveSupportedReplicaTopology({
        nodeEnv: 'production',
        replicaCount: '2',
        metricsAggregationMode: 'external',
        metricsInstanceId: 'api-eu-1',
      }),
    ).toEqual({
      replicaCount: 2,
      metrics: { aggregationMode: 'external', instanceId: 'api-eu-1' },
    });
  });

  it('requires an instance identity for external aggregation', () => {
    expect(() =>
      resolveSupportedReplicaTopology({
        nodeEnv: 'production',
        replicaCount: '2',
        metricsAggregationMode: 'external',
      }),
    ).toThrow(/METRICS_INSTANCE_ID: required/);
  });

  it.each(['space id', '/api-1', 'x'.repeat(65)])(
    'rejects unsafe metrics instance identity %s',
    (metricsInstanceId) => {
      expect(() =>
        resolveSupportedReplicaTopology({
          nodeEnv: 'test',
          replicaCount: '2',
          metricsAggregationMode: 'external',
          metricsInstanceId,
        }),
      ).toThrow(/METRICS_INSTANCE_ID/);
    },
  );

  it('allows multi-process non-production exercises without claiming production safety', () => {
    expect(declareReplicaCount('test', '4')).toBe(4);
  });

  it.each(['0', '-1', '1.5', 'many', '101'])(
    'rejects invalid declared replica count %s',
    (replicaCount) => {
      expect(() => declareReplicaCount('test', replicaCount)).toThrow(
        /use a whole number between 1 and 100/,
      );
    },
  );
});
