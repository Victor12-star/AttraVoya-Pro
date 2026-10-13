import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import ExploreScreen from '../src/app/(tabs)/explore.jsx';
import HomeScreen from '../src/app/(tabs)/index.jsx';

describe('mobile home and explore readiness', () => {
  it('keeps budget-first discovery and honest pricing guidance visible', async () => {
    const result = await render(<HomeScreen />);

    expect(
      result.getByRole('header', { name: 'Explore the world on your budget.' }),
    ).toBeTruthy();
    expect(result.getByRole('button', { name: 'Explore destinations' })).toBeTruthy();
    expect(result.getByRole('button', { name: 'Open my trips' })).toBeTruthy();
    expect(
      result.getByText(/live prices and booking availability appear only when verified/i),
    ).toBeTruthy();
    expect(result.queryByText(/confirmed booking|available rooms|live fare/i)).toBeNull();
  });

  it('distinguishes inspiring destinations from live availability', async () => {
    const result = await render(<ExploreScreen />);

    expect(result.getByRole('header', { name: 'Find a place worth exploring.' })).toBeTruthy();
    expect(result.getByRole('button', { name: 'Explore nearby places' })).toBeTruthy();
    expect(result.getByText(/destination photography is illustrative/i)).toBeTruthy();
    expect(result.queryByText(/confirmed booking|available rooms|live fare/i)).toBeNull();
  });
});
