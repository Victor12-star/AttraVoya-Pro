import { createResendEmailProvider } from './resend-email-provider.js';

export const EMAIL_PROVIDER_REGISTRY = Object.freeze({
  resend: createResendEmailProvider,
});
