// Revisor automático: busca errores reales (nombres que no existen, piezas borradas que se siguen usando, etc.).
// No revisa estilo. Se corre con `npm run revisar` y también dentro de `npm run build`.
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'android/**', 'ios/**', 'ios-web/**', 'public/**', 'supabase/**'] },
  js.configs.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {
      // Los `catch {}` vacíos son a propósito (si falla algo secundario, la app sigue).
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Código que nunca se usa: avisa, pero no frena.
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }],
    },
  },
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      // __COMMIT__, __RAMA__ y __VERSION__ los pone vite.config.js al armar la app.
      globals: { ...globals.browser, __COMMIT__: 'readonly', __RAMA__: 'readonly', __VERSION__: 'readonly' },
    },
    settings: { react: { version: '18.3' } },
    rules: {
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-vars': 'error',
      'react/jsx-key': 'warn',
      // Un "useState"/"useEffect" dentro de un if rompe la pantalla: eso sí es error.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    files: ['api/**/*.js', 'scripts/**/*.{js,mjs}', '*.config.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } },
  },
];
