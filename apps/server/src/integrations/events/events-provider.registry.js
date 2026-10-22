import { createUnavailableProvider } from '../http/unavailable-provider.js';
import { createTicketmasterEventsProvider } from './ticketmaster-events-provider.js';

export const EVENTS_PROVIDER_REGISTRY = Object.freeze({
  none: () => createUnavailableProvider('events', ['searchEvents']),
  ticketmaster: createTicketmasterEventsProvider,
});
