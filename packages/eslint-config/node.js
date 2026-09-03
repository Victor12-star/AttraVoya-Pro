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
    files: ['scripts/**/*.{js,mjs,cjs}'],
    rules: {
      // These are trusted repository-local CLI tools. They intentionally report
      // progress to stdout and operate on validated project paths supplied by the
      // scripts themselves, not arbitrary user-controlled filesystem input.
      'no-restricted-syntax': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
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
