const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', '.expo/**', 'milestone-one-starter/**', '.tmp-web-check/**', '.tmp-db-test-*/**', 'coverage/**'] },
]);
