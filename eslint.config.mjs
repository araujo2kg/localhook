import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
    globalIgnores(['dist/**', 'node_modules/**', 'coverage/**', '.vscode/**']),
    {
        files: ['**/*.{ts,tsx}'],
        extends: [
            js.configs.recommended,
            tseslint.configs.strictTypeChecked,
            tseslint.configs.stylisticTypeChecked,
        ],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
            '@typescript-eslint/consistent-type-exports': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'all' },
            ],
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
        },
    },
    {
        files: ['**/*.mjs'],
        extends: [js.configs.recommended],
        languageOptions: { globals: globals.node },
    },
    {
        files: ['client/**/*.{ts,tsx}'],
        plugins: { 'react-hooks': reactHooks },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'error',
        },
    },
    prettier,
    {
        files: ['**/*.{ts,tsx,mjs}'],
        plugins: { '@stylistic': stylistic, 'simple-import-sort': simpleImportSort },
        rules: {
            curly: ['error', 'all'],
            eqeqeq: ['error', 'always'],
            'no-nested-ternary': 'error',
            'no-else-return': ['error', { allowElseIf: false }],
            'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
            'no-console': 'error',
            'max-depth': ['error', 4],
            'max-params': ['error', 4],
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',
            // Prettier owns token layout. These rules own statement and comment boundaries.
            '@stylistic/padding-line-between-statements': [
                'error',
                { blankLine: 'always', prev: ['const', 'let'], next: '*' },
                { blankLine: 'any', prev: ['const', 'let'], next: ['const', 'let'] },
                {
                    blankLine: 'always',
                    prev: '*',
                    next: ['return', 'function', 'interface', 'type'],
                },
                { blankLine: 'always', prev: ['block-like', 'multiline-expression'], next: '*' },
            ],
            '@stylistic/spaced-comment': ['error', 'always'],
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'Program > ExportDefaultDeclaration',
                    message:
                        'Use named exports; default exports are reserved for tool configuration.',
                },
            ],
            'no-warning-comments': ['error', { terms: ['fixme', 'hack'], location: 'start' }],
        },
    },
    {
        files: ['server/index.ts', 'scripts/**/*.mjs'],
        rules: { 'no-console': 'off' },
    },
    {
        files: ['*.config.mjs'],
        rules: { 'no-restricted-syntax': 'off' },
    },
);
