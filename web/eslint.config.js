import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import astro from 'eslint-plugin-astro';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['dist/', '.astro/']),
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,astro,vue}'],
    extends: [tseslint.configs.recommended],
  },
  astro.configs['flat/recommended'],
  vue.configs['flat/recommended-error'],
  {
    files: ['**/*.{astro,vue}'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },
  prettier,
);
