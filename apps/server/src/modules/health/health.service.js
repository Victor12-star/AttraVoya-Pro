import { ServiceUnavailableError } from '../../errors/app-error.js';

export function createHealthService(repository, options = {}) {
  const readinessState = options.readinessState;

  return {
    getLiveness() {
      return {
        status: 'ok',
        service: 'attravoya-api',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      };
    },

    async getReadiness() {
      if (readinessState?.isAcceptingTraffic() === false) {
        throw new ServiceUnavailableError('AttraVoya Pro is not ready to accept traffic yet.');
      }

      try {
        await repository.checkDatabase();
        return {
          status: 'ready',
          database: 'available',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        throw new ServiceUnavailableError('AttraVoya Pro is not ready to accept traffic yet.', {
          cause: error,
        });
      }
    },
  };
}
