// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: [
      'dist/*',
      '.tmp-*',
      'mobile/dist/*',
      'mobile/.tmp-*',
      'mobile/app/*',
      'components/external-link.tsx',
      'components/haptic-tab.tsx',
      'components/themed-text.tsx',
      'components/themed-view.tsx',
      'components/ui/*',
      '**/components/external-link.tsx',
      '**/components/haptic-tab.tsx',
      '**/components/themed-text.tsx',
      '**/components/themed-view.tsx',
      '**/components/ui/*',
      'mobile/components/external-link.tsx',
      'mobile/components/haptic-tab.tsx',
      'mobile/components/themed-text.tsx',
      'mobile/components/themed-view.tsx',
      'mobile/components/ui/*',
    ],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/use-memo': 'off',
      // Expo/Babel aliases are resolved by Metro rather than ESLint.
      'import/no-unresolved': 'off',
    },
  },
]);
