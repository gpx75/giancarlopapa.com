// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';
import eslintConfigPrettier from 'eslint-config-prettier';

export default withNuxt(
  {
    rules: {
      // Vue 3 supports fragment (multi-root) templates — disable the legacy Vue 2 rule.
      'vue/no-multiple-template-root': 'off'
    }
  },
  eslintConfigPrettier
);
