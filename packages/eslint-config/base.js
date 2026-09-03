import eslint from '@eslint/js';
import importX, { createNodeResolver } from 'eslint-plugin-import-x';

const nodeResolver = createNodeResolver({
  extensions: ['.mjs', '.cjs', '.js', '.jsx', '.json', '.node'],
});

export const commonIgnores = [
  '**/node_modules/**',
  '**/.next/**',
  '**/.expo/**',
  '**/.turbo/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/coverage/**',
  '**/playwright-report/**',
  '**/test-results/**',
  'packages/database/prisma/migrations/**',
  'pnpm-lock.yaml',
];

const baseConfig = [
  {
    ignores: commonIgnores,
  },
  eslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'import-x': importX,
    },
    settings: {
      'import-x/resolver-next': [nodeResolver],
    },
    rules: {
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'import-x/first': 'error',
      'import-x/newline-after-import': ['error', { count: 1 }],
      'import-x/no-duplicates': 'error',
      'import-x/no-mutable-exports': 'error',
      'no-alert': 'error',
      'no-constant-binary-expression': 'error',
      // eslint-plugin-import-x handles duplicate imports with better ES Module awareness.
      'no-duplicate-imports': 'off',
      'no-implicit-coercion': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='console'][callee.property.name='log']",
          message: 'Use the application logger or an intentional console.warn/error call.',
        },
      ],
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
    },
  },
];

export default baseConfig;
