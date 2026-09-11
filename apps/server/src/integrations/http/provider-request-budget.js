import { ProviderRateLimitError } from '../../errors/app-error.js';

const policies = new Map();
const states = new Map();

function normalizeProvider(provider) {
  const value = String(provider ?? '')
    .trim()
    .toLowerCase();
  if (!value) throw new TypeError('Provider request budget requires a provider name.');
  return value;
}

function assertPositiveSafeInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`Provider request budget ${name} must be a positive safe integer.`);
  }
}

function finiteNow(nowImpl) {
  const value = Number(nowImpl());
  if (!Number.isFinite(value)) {
    throw new TypeError('Provider request budget clock must return a finite number.');
  }
  return value;
}

/**
 * Replace all in-process provider request-budget policies.
 *
 * Each policy is intentionally supplied by deployment configuration rather
 * than hardcoded vendor limits because provider plans and quotas can change.
 */
export function configureProviderRequestBudgets(nextPolicies = {}) {
  policies.clear();
  states.clear();

  for (const [provider, policy] of Object.entries(nextPolicies)) {
    const normalizedProvider = normalizeProvider(provider);
    const maxRequests = Number(policy?.maxRequests);
    const windowMs = Number(policy?.windowMs);
    assertPositiveSafeInteger(maxRequests, 'maxRequests');
    assertPositiveSafeInteger(windowMs, 'windowMs');
    policies.set(normalizedProvider, { maxRequests, windowMs });
  }
}

/**
 * Consume allowance immediately before one real upstream HTTP attempt.
 * Providers without a configured policy keep the transport's existing
 * behavior, including its clock-call sequence in deterministic tests.
 */
export function consumeProviderRequestBudget({ provider, nowImpl = Date.now }) {
  const normalizedProvider = normalizeProvider(provider);
  const policy = policies.get(normalizedProvider);
  if (!policy) return;
  if (typeof nowImpl !== 'function') {
    throw new TypeError('Provider request budget requires a clock function.');
  }

  const now = finiteNow(nowImpl);
  let state = states.get(normalizedProvider);
  const windowEnded = state ? state.windowStartedAt + policy.windowMs : 0;

  if (!state || now < state.windowStartedAt || now >= windowEnded) {
    state = { windowStartedAt: now, used: 0 };
    states.set(normalizedProvider, state);
  }

  if (state.used >= policy.maxRequests) {
    const retryAfterMs = Math.max(1, state.windowStartedAt + policy.windowMs - now);
    throw new ProviderRateLimitError(`${provider} request budget is temporarily exhausted.`, {
      details: {
        provider: normalizedProvider,
        reason: 'budget_exhausted',
        retryAfter: String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
      },
    });
  }

  state.used += 1;
}

export function resetProviderRequestBudgetsForTests() {
  policies.clear();
  states.clear();
}
