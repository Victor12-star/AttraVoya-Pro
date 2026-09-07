/**
 * Process-local lifecycle state used only to tell orchestration whether this
 * API instance should receive new traffic. It contains no request, user,
 * session, provider, or planner data.
 */
export function createReadinessState() {
  let acceptingTraffic = true;

  return {
    isAcceptingTraffic() {
      return acceptingTraffic;
    },

    markDraining() {
      acceptingTraffic = false;
    },
  };
}
