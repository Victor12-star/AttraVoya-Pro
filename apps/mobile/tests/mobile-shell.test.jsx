import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import ScaffoldScreen from '../src/components/common/scaffold-screen.jsx';
import { tabRoutes } from '../src/components/navigation/tab-routes.js';

describe('modern mobile shell', () => {
  it('keeps tab names, labels, and accessibility labels unique', () => {
    expect(new Set(tabRoutes.map(({ name }) => name)).size).toBe(tabRoutes.length);
    expect(new Set(tabRoutes.map(({ label }) => label)).size).toBe(tabRoutes.length);
    expect(new Set(tabRoutes.map(({ accessibilityLabel }) => accessibilityLabel)).size).toBe(
      tabRoutes.length,
    );
  });

  it('renders a truthful accessible route state without invented provider data', async () => {
    const { getByText, queryByText } = await render(
      <ScaffoldScreen
        description="Live destination results will appear here after provider integration."
        eyebrow="Discover"
        title="Explore with confidence"
      />,
    );

    expect(getByText('Explore with confidence')).toBeTruthy();
    expect(getByText('Feature foundation')).toBeTruthy();
    expect(queryByText(/€|\$|available rooms|live fare/i)).toBeNull();
  });
});
