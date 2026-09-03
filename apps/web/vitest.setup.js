import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

/** @type {(query: string) => MediaQueryList} */
const createMatchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  addListener: () => {},
  dispatchEvent: () => false,
  removeEventListener: () => {},
  removeListener: () => {},
});

if (!window.matchMedia) {
  // This test-only browser API stub lets theme components read system preferences.
  // It is never imported by the running website and contains no travel data.
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: createMatchMedia,
    writable: true,
  });
}

if (!globalThis.ResizeObserver) {
  class TestResizeObserver {
    disconnect() {}

    observe() {}

    unobserve() {}
  }

  // JSDOM does not implement ResizeObserver, but responsive components depend on it.
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: TestResizeObserver,
    writable: true,
  });
}
