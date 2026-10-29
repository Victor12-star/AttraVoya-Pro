// Test doubles configured through Jest must remain inside automated tests.
// The running Expo application never loads this configuration.
const config = {
  preset: 'jest-expo',
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Allow Jest/Babel to transform the ESM-only patched URI decoder used by Expo Router.
  // Keep Expo and React Native's regular transform allowlist intact for pnpm layouts.
  transformIgnorePatterns: [
    'node_modules/(?!\\.pnpm/decode-uri-component@|decode-uri-component/|((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg))',
  ],
  testMatch: [
    '<rootDir>/src/**/*.test.js',
    '<rootDir>/src/**/*.test.jsx',
    '<rootDir>/src/**/*.spec.js',
    '<rootDir>/src/**/*.spec.jsx',
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.test.jsx',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/android/', '/ios/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/**/*.test.{js,jsx}', '!src/**/*.spec.{js,jsx}'],
  coverageDirectory: '<rootDir>/coverage',
  coverageProvider: 'v8',
  coverageReporters: ['text', 'json-summary', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  maxWorkers: '50%',
};

export default config;
