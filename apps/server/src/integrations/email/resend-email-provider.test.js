import { describe, expect, it, vi } from 'vitest';

import { ProviderAuthenticationError, ProviderResponseError } from '../../errors/app-error.js';
import { createResendEmailProvider } from './resend-email-provider.js';

describe('Resend email adapter', () => {
  it('sends verification email through the server without exposing credentials to clients', async () => {
    const http = { requestJson: vi.fn().mockResolvedValue({ id: 'email-123' }) };
    const provider = createResendEmailProvider({
      http,
      apiKey: 'test-resend-key',
      from: 'AttraVoya Pro <hello@example.test>',
      webUrl: 'https://attravoya.example',
    });

    const result = await provider.sendVerificationEmail({
      to: 'traveller@example.test',
      token: 'verification-token',
    });

    expect(result).toEqual({ provider: 'resend', messageId: 'email-123' });
    expect(http.requestJson).toHaveBeenCalledTimes(1);

    const [url, options] = http.requestJson.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options.method).toBe('POST');
    expect(options.retry).toBe(false);
    expect(options.headers.Authorization).toBe('Bearer test-resend-key');
    expect(options.body.to).toEqual(['traveller@example.test']);
    expect(options.body.html).toContain('https://attravoya.example/verify-email?token=verification-token');
  });

  it('builds password-reset mail with the reset route and expiry guidance', async () => {
    const http = { requestJson: vi.fn().mockResolvedValue({ id: 'email-reset' }) };
    const provider = createResendEmailProvider({
      http,
      apiKey: 'test-resend-key',
      from: 'AttraVoya Pro <hello@example.test>',
      webUrl: 'https://attravoya.example',
    });

    await provider.sendPasswordResetEmail({
      to: 'traveller@example.test',
      token: 'reset-token',
    });

    const options = http.requestJson.mock.calls[0][1];
    expect(options.body.html).toContain('https://attravoya.example/reset-password?token=reset-token');
    expect(options.body.text).toContain('expires in 1 hour');
  });

  it('fails safely when the API key is missing', async () => {
    const http = { requestJson: vi.fn() };
    const provider = createResendEmailProvider({
      http,
      apiKey: '',
      from: 'AttraVoya Pro <hello@example.test>',
      webUrl: 'https://attravoya.example',
    });

    await expect(
      provider.sendVerificationEmail({ to: 'traveller@example.test', token: 'token' }),
    ).rejects.toBeInstanceOf(ProviderAuthenticationError);
    expect(http.requestJson).not.toHaveBeenCalled();
  });

  it('rejects malformed provider responses', async () => {
    const provider = createResendEmailProvider({
      http: { requestJson: vi.fn().mockResolvedValue({}) },
      apiKey: 'test-resend-key',
      from: 'AttraVoya Pro <hello@example.test>',
      webUrl: 'https://attravoya.example',
    });

    await expect(
      provider.sendVerificationEmail({ to: 'traveller@example.test', token: 'token' }),
    ).rejects.toBeInstanceOf(ProviderResponseError);
  });
});
