import { afterEach } from '@jest/globals';
import '@testing-library/react-native/extend-expect';
import { cleanup } from '@testing-library/react-native';

afterEach(() => {
  cleanup();
});

// Native provider and device APIs are intentionally not mocked globally.
// Individual tests must declare only the test doubles they need, preventing a
// passing unit test from hiding an integration mistake in another feature.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
