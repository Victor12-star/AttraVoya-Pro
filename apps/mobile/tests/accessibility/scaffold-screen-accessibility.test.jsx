import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import ScaffoldScreen from '../../src/components/common/scaffold-screen.jsx';

describe('mobile scaffold accessibility', () => {
  it('exposes foundation status and page heading to assistive technology', async () => {
    const view = await render(
      <ScaffoldScreen
        description="Verified travel information will appear here when available."
        eyebrow="Explore"
        title="Explore with confidence"
      />,
    );

    expect(view.getByRole('summary')).toBeTruthy();
    expect(view.getByRole('header', { name: 'Explore with confidence' })).toBeTruthy();
  }, 20_000);
});
