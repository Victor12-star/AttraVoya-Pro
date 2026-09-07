import { createPlannerController } from './planner.controller.js';
import { createPlannerRepository } from './planner.repository.js';
import { plannerSchemas } from './planner.schema.js';
import { createPlannerService } from './planner.service.js';

const PLANNER_CREATE_RATE_LIMIT = Object.freeze({ max: 10, timeWindow: '1 minute' });
const PLANNER_EVIDENCE_RATE_LIMIT = Object.freeze({ max: 10, timeWindow: '1 minute' });

export async function plannerRoutes(app, options = {}) {
  const repository = options.repository ?? createPlannerRepository();
  const service = createPlannerService(repository, {
    accommodationPricingCollector: options.accommodationPricingCollector,
    flightPricingCollector: options.flightPricingCollector,
    foodPricingCollector: options.foodPricingCollector,
    localTransportPricingCollector: options.localTransportPricingCollector,
    activitiesPricingCollector: options.activitiesPricingCollector,
    childrenActivitiesPricingCollector: options.childrenActivitiesPricingCollector,
    airportTransferPricingCollector: options.airportTransferPricingCollector,
    travelInsurancePricingCollector: options.travelInsurancePricingCollector,
  });
  const controller = createPlannerController(service);
  const protectedApp = /** @type {any} */ (app);
  const authenticated = { onRequest: [protectedApp.authenticate] };

  // Planner drafts contain private travel intent and budget information. Persisted
  // requests therefore require current authenticated account state, even though
  // public destination browsing remains available without an account.
  app.post(
    '/',
    {
      ...authenticated,
      schema: plannerSchemas.createRequest,
      config: { rateLimit: PLANNER_CREATE_RATE_LIMIT },
    },
    controller.createRequest,
  );
  app.get('/', { ...authenticated, schema: plannerSchemas.listRequests }, controller.listRequests);
  app.get(
    '/:requestId/allocation',
    { ...authenticated, schema: plannerSchemas.getRequest },
    controller.getAllocation,
  );
  app.get(
    '/:requestId/destination-candidates',
    { ...authenticated, schema: plannerSchemas.getRequest },
    controller.getDestinationCandidates,
  );
  app.get(
    '/:requestId/destination-candidates/:destinationId/affordability-evidence',
    {
      ...authenticated,
      schema: plannerSchemas.getCandidateEvidence,
      // This route can fan out across the fixed planner pricing collectors.
      // Keep the request rate tighter than ordinary reads so one client cannot
      // multiply into unbounded provider work even before provider bulkheads act.
      config: { rateLimit: PLANNER_EVIDENCE_RATE_LIMIT },
    },
    controller.getAffordabilityEvidence,
  );
  app.get(
    '/:requestId',
    { ...authenticated, schema: plannerSchemas.getRequest },
    controller.getRequest,
  );
}
