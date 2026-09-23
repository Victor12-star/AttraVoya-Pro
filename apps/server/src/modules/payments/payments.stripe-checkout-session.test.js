import { describe, expect, it, vi } from 'vitest';

import {
  createStripeCheckoutGateway,
  createStripeCheckoutSessionService,
} from './payments.stripe-checkout-session.js';

const EXPIRES_AT = new Date('2026-09-23T20:40:00.000Z');

describe('Stripe Checkout Session gateway', () => {
  it('creates a subscription session using only server-owned checkout values', async () => {
    const requestJson = vi.fn(async () => ({
      id: 'cs_test_123',
      mode: 'subscription',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    }));
    const gateway = createStripeCheckoutGateway({
      secretKey: 'sk_test_server_only_example_key',
      httpClient: { requestJson },
    });

    const result = await gateway.createSubscriptionSession({
      attemptId: 'attempt-123',
      idempotencyKey: 'attravoya-checkout-attempt-123',
      priceId: 'price_monthly_server_owned',
      quantity: 1,
      successUrl:
        'https://app.example.com/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://app.example.com/premium?checkout=cancelled',
      expiresAt: EXPIRES_AT,
    });

    expect(result).toEqual({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    });

    expect(requestJson).toHaveBeenCalledTimes(1);
    const [url, options] = requestJson.mock.calls[0];
    expect(url).toBe('https://api.stripe.com/v1/checkout/sessions');
    expect(options).toMatchObject({
      method: 'POST',
      retry: false,
      headers: {
        Authorization: 'Bearer sk_test_server_only_example_key',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': 'attravoya-checkout-attempt-123',
      },
    });

    const body = new URLSearchParams(options.body);
    expect(body.get('mode')).toBe('subscription');
    expect(body.get('line_items[0][price]')).toBe('price_monthly_server_owned');
    expect(body.get('line_items[0][quantity]')).toBe('1');
    expect(body.get('client_reference_id')).toBe('attempt-123');
    expect(body.get('metadata[attravoya_checkout_attempt_id]')).toBe('attempt-123');
    expect(body.get('subscription_data[metadata][attravoya_checkout_attempt_id]')).toBe(
      'attempt-123',
    );
    expect(body.get('expires_at')).toBe(String(Math.floor(EXPIRES_AT.getTime() / 1000)));
    expect(options.body).not.toContain('user-');
    expect(options.body).not.toContain('email');
  });

  it('fails closed on malformed or unsafe Stripe checkout responses', async () => {
    const gateway = createStripeCheckoutGateway({
      secretKey: 'sk_test_server_only_example_key',
      httpClient: {
        requestJson: vi.fn(async () => ({
          id: 'cs_test_123',
          mode: 'subscription',
          url: 'https://evil.example/redirect',
        })),
      },
    });

    await expect(
      gateway.createSubscriptionSession({
        attemptId: 'attempt-123',
        idempotencyKey: 'attravoya-checkout-attempt-123',
        priceId: 'price_monthly_server_owned',
        quantity: 1,
        successUrl: 'https://app.example.com/premium?checkout=success',
        cancelUrl: 'https://app.example.com/premium?checkout=cancelled',
        expiresAt: EXPIRES_AT,
      }),
    ).rejects.toMatchObject({
      statusCode: 502,
      code: 'PROVIDER_RESPONSE_ERROR',
    });
  });

  it('rejects non-server checkout invariants before calling Stripe', async () => {
    const requestJson = vi.fn();
    const gateway = createStripeCheckoutGateway({
      secretKey: 'sk_test_server_only_example_key',
      httpClient: { requestJson },
    });

    await expect(
      gateway.createSubscriptionSession({
        attemptId: 'attempt-123',
        idempotencyKey: 'attravoya-checkout-attempt-123',
        priceId: 'not-a-stripe-price',
        quantity: 1,
        successUrl: 'https://app.example.com/premium?checkout=success',
        cancelUrl: 'https://app.example.com/premium?checkout=cancelled',
        expiresAt: EXPIRES_AT,
      }),
    ).rejects.toThrow('Stripe priceId is invalid.');

    await expect(
      gateway.createSubscriptionSession({
        attemptId: 'attempt-123',
        idempotencyKey: 'attravoya-checkout-attempt-123',
        priceId: 'price_monthly_server_owned',
        quantity: 2,
        successUrl: 'https://app.example.com/premium?checkout=success',
        cancelUrl: 'https://app.example.com/premium?checkout=cancelled',
        expiresAt: EXPIRES_AT,
      }),
    ).rejects.toThrow('Stripe checkout quantity must be exactly one.');

    expect(requestJson).not.toHaveBeenCalled();
  });
});

describe('internal Stripe Checkout Session service', () => {
  it('composes policy, durable ownership, Stripe creation, and session binding', async () => {
    const checkoutPolicy = {
      resolve: vi.fn(() => ({
        planKey: 'PRO_MONTHLY',
        priceId: 'price_monthly_server_owned',
        quantity: 1,
        successUrl:
          'https://app.example.com/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: 'https://app.example.com/premium?checkout=cancelled',
      })),
    };
    const checkoutAttemptService = {
      createOrReuse: vi.fn(async () => ({
        attempt: {
          id: 'attempt-123',
          userId: 'user-1',
          expiresAt: EXPIRES_AT,
          plan: { key: 'PRO_MONTHLY' },
        },
        created: true,
        duplicate: false,
        idempotencyKey: 'attravoya-checkout-attempt-123',
      })),
      bindStripeSession: vi.fn(async () => ({
        attempt: {
          id: 'attempt-123',
          userId: 'user-1',
          externalCheckoutSessionId: 'cs_test_123',
        },
        duplicate: false,
      })),
    };
    const stripeGateway = {
      createSubscriptionSession: vi.fn(async () => ({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      })),
    };
    const service = createStripeCheckoutSessionService({
      checkoutAttemptService,
      checkoutPolicy,
      stripeGateway,
    });

    const result = await service.create({
      userId: 'user-1',
      planKey: 'PRO_MONTHLY',
    });

    expect(checkoutPolicy.resolve).toHaveBeenCalledWith('PRO_MONTHLY');
    expect(checkoutAttemptService.createOrReuse).toHaveBeenCalledWith({
      userId: 'user-1',
      planKey: 'PRO_MONTHLY',
    });
    expect(stripeGateway.createSubscriptionSession).toHaveBeenCalledWith({
      attemptId: 'attempt-123',
      idempotencyKey: 'attravoya-checkout-attempt-123',
      priceId: 'price_monthly_server_owned',
      quantity: 1,
      successUrl:
        'https://app.example.com/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://app.example.com/premium?checkout=cancelled',
      expiresAt: EXPIRES_AT,
    });
    expect(checkoutAttemptService.bindStripeSession).toHaveBeenCalledWith({
      userId: 'user-1',
      attemptId: 'attempt-123',
      externalCheckoutSessionId: 'cs_test_123',
    });
    expect(result).toEqual({
      attemptId: 'attempt-123',
      checkoutSessionId: 'cs_test_123',
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123',
      duplicate: false,
    });
  });

  it('preserves duplicate ownership semantics across a retry', async () => {
    const checkoutAttemptService = {
      createOrReuse: vi.fn(async () => ({
        attempt: {
          id: 'attempt-123',
          userId: 'user-1',
          expiresAt: EXPIRES_AT,
          plan: { key: 'PRO_MONTHLY' },
        },
        created: false,
        duplicate: true,
        idempotencyKey: 'attravoya-checkout-attempt-123',
      })),
      bindStripeSession: vi.fn(async () => ({
        attempt: {
          id: 'attempt-123',
          userId: 'user-1',
          externalCheckoutSessionId: 'cs_test_123',
        },
        duplicate: true,
      })),
    };
    const service = createStripeCheckoutSessionService({
      checkoutAttemptService,
      checkoutPolicy: {
        resolve: vi.fn(() => ({
          priceId: 'price_monthly_server_owned',
          quantity: 1,
          successUrl: 'https://app.example.com/premium?checkout=success',
          cancelUrl: 'https://app.example.com/premium?checkout=cancelled',
        })),
      },
      stripeGateway: {
        createSubscriptionSession: vi.fn(async () => ({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/c/pay/cs_test_123',
        })),
      },
    });

    const result = await service.create({
      userId: 'user-1',
      planKey: 'PRO_MONTHLY',
    });

    expect(result.duplicate).toBe(true);
  });

  it('does not report checkout success when session ownership cannot be persisted', async () => {
    const bindingError = new Error('database unavailable');
    const service = createStripeCheckoutSessionService({
      checkoutAttemptService: {
        createOrReuse: vi.fn(async () => ({
          attempt: {
            id: 'attempt-123',
            userId: 'user-1',
            expiresAt: EXPIRES_AT,
            plan: { key: 'PRO_MONTHLY' },
          },
          duplicate: false,
          idempotencyKey: 'attravoya-checkout-attempt-123',
        })),
        bindStripeSession: vi.fn(async () => {
          throw bindingError;
        }),
      },
      checkoutPolicy: {
        resolve: vi.fn(() => ({
          priceId: 'price_monthly_server_owned',
          quantity: 1,
          successUrl: 'https://app.example.com/premium?checkout=success',
          cancelUrl: 'https://app.example.com/premium?checkout=cancelled',
        })),
      },
      stripeGateway: {
        createSubscriptionSession: vi.fn(async () => ({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/c/pay/cs_test_123',
        })),
      },
    });

    await expect(
      service.create({
        userId: 'user-1',
        planKey: 'PRO_MONTHLY',
      }),
    ).rejects.toBe(bindingError);
  });
});
