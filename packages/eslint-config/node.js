import globals from 'globals';
import security from 'eslint-plugin-security';

const nodeFiles = [
  'apps/admin/next.config.mjs',
  'apps/server/**/*.{js,mjs,cjs}',
  'apps/web/next.config.mjs',
  'packages/database/**/*.{js,mjs,cjs}',
  'scripts/**/*.{js,mjs,cjs}',
  '*.{js,mjs,cjs}',
];

const nodeConfig = [
  {
    files: nodeFiles,
    languageOptions: {
      globals: globals.node,
    },
    plugins: {
      security,
    },
    rules: {
      ...security.configs.recommended.rules,
      // Provider registries and normalized API objects require validated dynamic keys.
      // This heuristic flags those safe lookups, so schema validation and focused tests
      // enforce the boundary instead of disabling all security analysis.
      'security/detect-object-injection': 'off',
    },
  },
  {
    files: ['apps/server/src/**/*.{js,mjs,cjs}'],
    rules: {
      // API logs must pass through Pino to preserve request IDs and secret redaction.
      'no-console': 'error',
    },
  },
  {
    files: ['scripts/check-javascript.js'],
    rules: {
      // The checker validates target existence, canonicalizes config paths, and only
      // passes those paths to the local TypeScript executable.
      'security/detect-non-literal-fs-filename': 'off',
      // This command-line tool intentionally reports check progress to stdout.
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['**/*.test.{js,jsx}', '**/*.spec.{js,jsx}', '**/tests/**/*.{js,jsx}'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
];

export default nodeConfig;
