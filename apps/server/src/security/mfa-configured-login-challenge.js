import { createConfiguredMfaFactorVerifier } from './mfa-configured-factor-verification.js';
import { createMfaLoginChallengeCore } from './mfa-login-challenge-core.js';
import { mfaLoginChallengeRepository } from './mfa-login-challenge-repository.js';

/**
 * Compose the isolated pre-session MFA challenge service with persisted,
 * one-time login challenges and replay-protected TOTP factor verification.
 *
 * The caller MUST validate password, account status and current privileged
 * authorization before issue, and recheck account authorization after
 * successful completion before issuing any access or refresh token.
 * This factory does not register routes, read environment variables,
 * create sessions, or activate MFA on any authentication path.
 *
 * @param {{ encodedEncryptionKey?: string,
 *   challengeRepository?: any, factorRepository?: any }} [options]
 */
export function createConfiguredMfaLoginChallenge({
  encodedEncryptionKey,
  challengeRepository = mfaLoginChallengeRepository,
  factorRepository,
} = {}) {
  // Verify the dedicated key and factor dependencies before making any
  // challenge service available; missing configuration fails closed.
  const factorVerifier = createConfiguredMfaFactorVerifier({
    encodedEncryptionKey,
    ...(factorRepository ? { repository: factorRepository } : {}),
  });
  return createMfaLoginChallengeCore({
    repository: challengeRepository,
    verifyFactor: (input) => factorVerifier.verify(input),
  });
}
