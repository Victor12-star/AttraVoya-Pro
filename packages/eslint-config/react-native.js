import { fixupPluginRules } from '@eslint/compat';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
// eslint-plugin-react-native 5.0.0 publishes no declarations; runtime
// compatibility is covered by the ESLint 10 regression suite.
import reactNativePlugin from 'eslint-plugin-react-native';

const react = fixupPluginRules(reactPlugin);
const reactNative = fixupPluginRules(reactNativePlugin);

const reactNativeConfig = [
  {
    files: ['apps/mobile/src/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        __DEV__: 'readonly',
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-native': reactNative,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      // Mobile colors must come from semantic design tokens so light, dark, and
      // high-contrast themes remain consistent and maintainable.
      'react-native/no-color-literals': 'error',
      'react-native/no-inline-styles': 'error',
      'react-native/no-raw-text': 'error',
      'react-native/no-single-element-style-arrays': 'error',
      'react-native/no-unused-styles': 'error',
      // JSDoc contracts describe component inputs without adding duplicate runtime
      // PropTypes declarations to every React Native component.
      'react/prop-types': 'off',
    },
  },
  {
    files: [
      'apps/mobile/jest.setup.js',
      'apps/mobile/src/**/*.{test,spec}.{js,jsx}',
      'apps/mobile/tests/**/*.{js,jsx}',
    ],
    languageOptions: {
      globals: globals.jest,
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['apps/mobile/app.config.js', 'apps/mobile/jest.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
];

export default reactNativeConfig;
