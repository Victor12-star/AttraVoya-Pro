import { createTicketmasterEventsProvider } from './ticketmaster-events-provider.js';

export const EVENTS_PROVIDER_REGISTRY = Object.freeze({
  ticketmaster: createTicketmasterEventsProvider,
});
