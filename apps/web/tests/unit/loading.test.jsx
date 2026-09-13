import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Loading from '../../src/app/loading.jsx';

describe('route loading state', () => {
  it('renders an immediate, accessible and layout-stable placeholder', () => {
    const { container } = render(<Loading />);

    const loading = screen.getByRole('main', { name: 'AttraVoya Pro' });
    expect(loading).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('.page-loading__grid > span')).toHaveLength(3);
  });
});
