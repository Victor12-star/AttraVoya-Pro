import { createRequire } from 'node:module';

import { fixupPluginRules } from '@eslint/compat';
import nextPlugin from '@next/eslint-plugin-next';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

const requireFromHere = createRequire(import.meta.url);

/** @type {import("eslint").ESLint.Plugin} */
const jsxA11yPlugin = requireFromHere('eslint-plugin-jsx-a11y');

const jsxA11yRecommended = jsxA11yPlugin.configs?.recommended;

if (!jsxA11yRecommended || Array.isArray(jsxA11yRecommended)) {
  throw new TypeError('eslint-plugin-jsx-a11y is missing its recommended configuration.');
}

if (!jsxA11yRecommended.rules) {
  throw new TypeError('eslint-plugin-jsx-a11y recommended configuration has no rules.');
}

const jsxA11y = fixupPluginRules(jsxA11yPlugin);
const react = fixupPluginRules(reactPlugin);

const nextConfig = [
  {
    files: ['apps/web/**/*.{js,jsx}', 'apps/admin/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@next/next': nextPlugin,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      next: {
        rootDir: ['apps/web/', 'apps/admin/'],
      },
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11yRecommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      // Both configured Next applications use the App Router exclusively.
      // This Pages Router-only rule has no pages directory to inspect.
      '@next/next/no-html-link-for-pages': 'off',
      // Component inputs use JSDoc contracts and validation at trust boundaries;
      // duplicating those definitions with React PropTypes would create drift.
      'react/prop-types': 'off',
    },
  },
  {
    files: [
      'apps/web/src/components/feedback/cookie-preferences.jsx',
      'apps/web/src/components/navigation/site-header.jsx',
      'apps/web/src/features/home/recent-searches.jsx',
    ],
    rules: {
      // These three client-only controls intentionally hydrate persisted browser
      // preferences after mount. The effect is a synchronization boundary with
      // local browser storage, not derived React state.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default nextConfig;
