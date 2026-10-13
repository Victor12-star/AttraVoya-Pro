import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import NearbyScreen from '../src/app/(tabs)/nearby.jsx';
import TripsScreen from '../src/app/(tabs)/trips.jsx';

describe('mobile travel tab readiness', () => {
  it('keeps the Trips tab clear about unconnected saved journeys', async () => {
    const result = await render(<TripsScreen />);

    expect(result.getByRole('header', { name: 'Every adventure begins with a plan.' })).toBeTruthy();
    expect(result.getByRole('header', { name: 'Saved trips are coming to mobile' })).toBeTruthy();
    expect(result.getByText(/authenticated trip list is not connected/i)).toBeTruthy();
    expect(result.queryByText(/confirmed booking|live fare|available rooms/i)).toBeNull();
  });

  it('keeps Nearby location use and provider readiness explicit', async () => {
    const result = await render(<NearbyScreen />);

    expect(result.getByRole('header', { name: 'Find more to love nearby.' })).toBeTruthy();
    expect(
      result.getByRole('header', { name: 'Nearby discovery is being connected' }),
    ).toBeTruthy();
    expect(result.getByText(/does not access your location yet/i)).toBeTruthy();
    expect(result.queryByText(/confirmed booking|live fare|available rooms/i)).toBeNull();
  });
});
