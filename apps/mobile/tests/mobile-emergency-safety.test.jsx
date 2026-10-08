import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import EmergencyScreen from '../src/app/emergency/index.jsx';

describe('mobile emergency safety state', () => {
  it('clearly states that emergency services are not connected', async () => {
    const result = await render(<EmergencyScreen />);

    expect(
      result.getByRole('header', { name: 'Emergency assistance is not connected yet' }),
    ).toBeTruthy();
    expect(result.getByText('Do not rely on AttraVoya for an emergency call.')).toBeTruthy();
    expect(
      result.getByText(
        'This screen does not contact emergency services, send an SOS message, or share your location.',
      ),
    ).toBeTruthy();
    expect(
      result.getByText(/use your phone's emergency calling feature or call the local emergency number/i),
    ).toBeTruthy();
  });

  it('does not expose a fake emergency action', async () => {
    const result = await render(<EmergencyScreen />);

    expect(result.queryByRole('button')).toBeNull();
    expect(result.queryByRole('link')).toBeNull();
    expect(result.queryByText(/^SOS$/i)).toBeNull();
    expect(result.queryByText(/send emergency/i)).toBeNull();
  });
});
