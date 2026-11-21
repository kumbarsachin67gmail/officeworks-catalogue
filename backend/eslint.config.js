// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Architecture rules from CLAUDE.md, enforced in code. Each boundary lists the
 * only files allowed to cross it; everything else in src/ gets an error.
 */
const boundaries = [
  {
    rule: 'no-restricted-imports',
    entry: {
      group: ['**/fake-store.repository*'],
      message: 'Depend on ProductRepository (PRODUCT_REPOSITORY). Only products.module.ts chooses the implementation.',
    },
    allowedIn: ['src/products/products.module.ts'],
  },
  {
    rule: 'no-restricted-imports',
    entry: {
      group: ['**/smtp-email-sender*'],
      message: 'Depend on EmailSender (EMAIL_SENDER). Only enquiries.module.ts chooses the implementation.',
    },
    allowedIn: ['src/enquiries/enquiries.module.ts'],
  },
  {
    rule: 'no-restricted-imports',
    entry: { group: ['nodemailer'], message: 'Only smtp-email-sender.ts talks to SMTP. Use EmailSender.' },
    allowedIn: ['src/enquiries/smtp-email-sender.ts'],
  },
  {
    rule: 'no-restricted-syntax',
    entry: {
      selector: "MemberExpression[property.name='rate']",
      message: 'Ranking by rating lives only in TopRatedPolicy (top-rated.policy.ts).',
    },
    // fake-store.repository.ts only maps Fake Store's raw rating field; it does not rank.
    allowedIn: ['src/products/top-rated.policy.ts', 'src/products/fake-store.repository.ts'],
  },
  {
    rule: 'no-restricted-syntax',
    entry: {
      selector: 'Literal[value=/fakestoreapi/i], TemplateElement[value.raw=/fakestoreapi/i]',
      message: 'The Fake Store URL comes from config (FAKE_STORE_BASE_URL), not code.',
    },
    allowedIn: ['src/config/app-config.ts'],
  },
];

/** Rule options for one file: every boundary that file is not allowed to cross. */
function boundaryRules(file) {
  const applies = boundaries.filter((boundary) => !boundary.allowedIn.includes(file));
  const imports = applies.filter((b) => b.rule === 'no-restricted-imports').map((b) => b.entry);
  const syntax = applies.filter((b) => b.rule === 'no-restricted-syntax').map((b) => b.entry);
  return {
    'no-restricted-imports': imports.length ? ['error', { patterns: imports }] : 'off',
    'no-restricted-syntax': syntax.length ? ['error', ...syntax] : 'off',
  };
}

const exceptionFiles = [...new Set(boundaries.flatMap((boundary) => boundary.allowedIn))];

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Nest modules and DTOs are classes with decorators and no body.
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
  { files: ['src/**/*.ts'], rules: boundaryRules('') },
  ...exceptionFiles.map((file) => ({ files: [file], rules: boundaryRules(file) })),
  {
    files: ['test/**/*.ts'],
    rules: {
      // Supertest response bodies are untyped JSON; tests assert on their shape.
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    files: ['eslint.config.js', 'vitest.config.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
);
