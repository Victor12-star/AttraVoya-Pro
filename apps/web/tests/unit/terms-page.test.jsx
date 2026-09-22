import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import TermsPage, { metadata, publicSupportEmail } from '../../src/app/(main)/terms/page.jsx';

describe('public terms of service', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
    delete process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL;
  });

  it('accepts only bounded email addresses for the public support link', () => {
    expect(publicSupportEmail(' support@example.test ')).toBe('support@example.test');
    expect(publicSupportEmail('javascript:alert(1)')).toBeNull();
    expect(publicSupportEmail('not-an-email')).toBeNull();
  });

  it('publishes the material service and travel-information boundaries', () => {
    render(<TermsPage />);

    expect(
      screen.getByRole('heading', { name: 'AttraVoya Pro terms of service' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/planning aid, not a travel agency/)).toBeInTheDocument();
    expect(
      screen.getByText(/Live provider information and planning estimates/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Paid subscriptions are not currently available/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'account-deletion page' })).toHaveAttribute(
      'href',
      '/delete-account',
    );
    expect(screen.getByRole('link', { name: 'privacy policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(metadata.title).toContain('Terms of service');
  });

  it('publishes the configured monitored support contact', () => {
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL = 'support@example.test';
    render(<TermsPage />);

    expect(screen.getByRole('link', { name: 'support@example.test' })).toHaveAttribute(
      'href',
      'mailto:support@example.test',
    );
  });

  it('does not invent a contact address before production configuration', () => {
    render(<TermsPage />);

    expect(screen.getByText(/Before public release/)).toBeInTheDocument();
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
  });
});
