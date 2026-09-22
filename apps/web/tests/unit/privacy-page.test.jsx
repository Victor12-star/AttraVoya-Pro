import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import PrivacyPage, { metadata, publicPrivacyEmail } from '../../src/app/(main)/privacy/page.jsx';

describe('public privacy policy', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL;
    delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  });

  it('accepts only bounded email addresses for public mail links', () => {
    expect(publicPrivacyEmail(' privacy@example.test ')).toBe('privacy@example.test');
    expect(publicPrivacyEmail('javascript:alert(1)')).toBeNull();
    expect(publicPrivacyEmail('not-an-email')).toBeNull();
  });

  it('publishes the material data practices and deletion path without authentication', () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole('heading', { name: 'AttraVoya Pro privacy policy' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Raw passwords and refresh credentials are not stored/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Background location permission is blocked/)).toBeInTheDocument();
    expect(screen.getByText(/does not sell personal data/)).toBeInTheDocument();
    expect(
      screen.getByText(/does not currently enable advertising or optional analytics/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open account deletion' })).toHaveAttribute(
      'href',
      '/delete-account',
    );
    expect(metadata.title).toContain('Privacy policy');
  });

  it('publishes the configured monitored privacy contact', () => {
    process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL = 'privacy@example.test';
    render(<PrivacyPage />);

    expect(screen.getByRole('link', { name: 'privacy@example.test' })).toHaveAttribute(
      'href',
      'mailto:privacy@example.test',
    );
  });

  it('does not invent a contact address before production configuration', () => {
    render(<PrivacyPage />);

    expect(screen.getByText(/Before public release/)).toBeInTheDocument();
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
  });
});
