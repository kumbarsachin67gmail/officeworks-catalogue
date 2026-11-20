// @ts-check
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Architecture rules from CLAUDE.md, enforced in code.
const NETWORK_MESSAGE = 'Only src/api/client.ts talks to the network. Add a function there and call it.';

const noDirectNetwork = {
  'no-restricted-globals': [
    'error',
    { name: 'fetch', message: NETWORK_MESSAGE },
    { name: 'XMLHttpRequest', message: NETWORK_MESSAGE },
    { name: 'WebSocket', message: NETWORK_MESSAGE },
  ],
  'no-restricted-properties': [
    'error',
    { object: 'window', property: 'fetch', message: NETWORK_MESSAGE },
    { object: 'globalThis', property: 'fetch', message: NETWORK_MESSAGE },
  ],
};

const noProductSourceInClient = {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'Literal[value=/fakestoreapi/i], TemplateElement[value.raw=/fakestoreapi/i]',
      message: 'The client never calls Fake Store (or any product source). Product data comes from the backend /api.',
    },
  ],
};

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  { files: ['src/**/*.{ts,tsx}'], rules: { ...noDirectNetwork, ...noProductSourceInClient } },
  { files: ['src/api/client.ts'], rules: { 'no-restricted-globals': 'off', 'no-restricted-properties': 'off' } },
  {
    files: ['test/**/*.{ts,tsx}'],
    rules: {
      // Mocked API functions are referenced unbound in expectations, and fakes are async without awaiting.
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    files: ['eslint.config.js', 'vite.config.ts'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: { ...tseslint.configs.disableTypeChecked.languageOptions, globals: globals.node },
  },
);
