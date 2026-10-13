import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import DestinationDetailScreen from '../src/app/destination/[slug].jsx';
import TripDetailScreen from '../src/app/trip/[id].jsx';

describe('mobile dynamic route truthfulness', () => {
  it('renders a complete truthful destination fallback', async () => {
    const result = await render(<DestinationDetailScreen />);

    expect(
      result.getByRole('header', { name: 'Destination details are not connected yet' }),
    ).toBeTruthy();
    expect(result.getByText('Destination')).toBeTruthy();
    expect(result.getByText(/live availability and prices are not available/i)).toBeTruthy();
    expect(result.queryByText(/€|\$|available rooms|live fare/i)).toBeNull();
    expect(result.getByRole('header', { name: 'Destination safety and awareness' })).toBeTruthy();
    expect(
      result.getByText(/current destination safety updates are temporarily unavailable/i),
    ).toBeTruthy();
    expect(result.getByText(/check official travel advisories before departure/i)).toBeTruthy();
    expect(
      result.getByText(/no current news, advisory, or last-checked time has been verified/i),
    ).toBeTruthy();
  });

  it('renders a complete truthful trip fallback', async () => {
    const result = await render(<TripDetailScreen />);

    expect(result.getByRole('header', { name: 'Trip details are not connected yet' })).toBeTruthy();
    expect(result.getByText('Trip')).toBeTruthy();
    expect(result.getByText(/does not claim that a trip has been loaded yet/i)).toBeTruthy();
    expect(result.queryByText(/confirmed booking|live fare|available rooms/i)).toBeNull();
  });
});
