import { ServiceUnavailableError } from '../../errors/app-error.js';

export function createHealthService(repository) {
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
