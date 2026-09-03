import { ProviderAuthenticationError } from '../../errors/app-error.js';

/**
 * Read a provider secret only when the provider is actually used.
 *
 * AttraVoya Pro must be able to boot before the student creates every free API
 * account. A missing key therefore disables only that provider endpoint rather
 * than crashing unrelated features such as authentication or country data.
 */
export function requireProviderCredential(value, provider, environmentName) {
  const credential = String(value ?? '').trim();
  if (credential) return credential;

  throw new ProviderAuthenticationError(
    `${provider} is not configured yet. Add ${environmentName} to your local environment.`,
    {
      details: {
        provider,
        configurationRequired: true,
        environmentName,
      },
    },
  );
}
