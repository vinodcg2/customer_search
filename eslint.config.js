import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// ESLint 9 flat config. See docs/decision-log.md (D-010, D-011) for rationale.
export default [
  { ignores: ['dist', 'coverage'] },

  js.configs.recommended,

  // Type-aware rules (no-unsafe-*, no-floating-promises, ...). Applied to every
  // file here, then switched off below for files outside the app tsconfig.
  ...tseslint.configs.recommendedTypeChecked,

  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDirectory: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // Hooks rules are listed explicitly rather than via the plugin's preset:
      // preset names and contents differ between plugin major versions.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // Project-specific type-safety rules (on top of typescript-eslint's set).
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],
    },
  },

  // Files that are not part of tsconfig.json (this file, vite.config.ts).
  {
    files: ['**/*.js', 'vite.config.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
];
