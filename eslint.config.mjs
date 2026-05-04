// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

/**
 * TEENS PARTY MOROCCO - ESLint Configuration
 * ==========================================
 *
 * Configuration stricte pour l'accessibilité (WCAG 2.1 AA)
 */

import js from '@eslint/js'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tsParser from "@typescript-eslint/parser"
import tsPlugin from "@typescript-eslint/eslint-plugin"
import reactHooks from "eslint-plugin-react-hooks"

export default [js.configs.recommended, {
  files: ['**/*.{js,jsx,ts,tsx}'],
  plugins: {
    'jsx-a11y': jsxA11y,
    '@typescript-eslint': tsPlugin,
    'react-hooks': reactHooks,
  },
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
    globals: {
      // Browser globals
      window: 'readonly',
      document: 'readonly',
      navigator: 'readonly',
      console: 'readonly',
      setTimeout: 'readonly',
      clearTimeout: 'readonly',
      setInterval: 'readonly',
      clearInterval: 'readonly',
      fetch: 'readonly',
      URL: 'readonly',
      URLSearchParams: 'readonly',
      FormData: 'readonly',
      localStorage: 'readonly',
      sessionStorage: 'readonly',
      // Node globals
      process: 'readonly',
      module: 'readonly',
      require: 'readonly',
      __dirname: 'readonly',
      __filename: 'readonly',
      Buffer: 'readonly',
      // React
      React: 'readonly',
      JSX: 'readonly',
    },
  },
  rules: {
    // ============================================================
    // JSX-A11Y RULES - STRICT MODE (WCAG 2.1 AA)
    // ============================================================

    // CRITICAL - Must have
    'jsx-a11y/alt-text': ['error', {
      elements: ['img', 'object', 'area', 'input[type="image"]'],
      img: ['Image', 'OptimizedImage'],
    }],
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/anchor-is-valid': ['warn', {
      components: ['Link'],
      specialLink: ['href'],
      aspects: ['noHref', 'invalidHref', 'preferButton'],
    }],
    'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-role': ['error', { ignoreNonDOM: true }],
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/heading-has-content': 'error',
    'jsx-a11y/html-has-lang': 'error',
    'jsx-a11y/iframe-has-title': 'error',
    'jsx-a11y/img-redundant-alt': 'error',
    'jsx-a11y/interactive-supports-focus': ['error', {
      tabbable: [
        'button',
        'checkbox',
        'link',
        'searchbox',
        'spinbutton',
        'switch',
        'textbox',
      ],
    }],
    'jsx-a11y/label-has-associated-control': ['warn', {
      labelComponents: ['Label'],
      labelAttributes: ['label', 'htmlFor'],
      controlComponents: ['Input', 'Select', 'Textarea'],
      depth: 3,
    }],
    'jsx-a11y/lang': 'error',
    'jsx-a11y/media-has-caption': 'error',
    'jsx-a11y/mouse-events-have-key-events': 'error',
    'jsx-a11y/no-access-key': 'error',
    'jsx-a11y/no-autofocus': ['warn', { ignoreNonDOM: true }],
    'jsx-a11y/no-distracting-elements': 'error',
    'jsx-a11y/no-interactive-element-to-noninteractive-role': ['error', {
      tr: ['none', 'presentation'],
    }],
    'jsx-a11y/no-noninteractive-element-interactions': ['error', {
      handlers: [
        'onClick',
        'onMouseDown',
        'onMouseUp',
        'onKeyPress',
        'onKeyDown',
        'onKeyUp',
      ],
    }],
    'jsx-a11y/no-noninteractive-element-to-interactive-role': ['error', {
      ul: ['listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree', 'treegrid'],
      ol: ['listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree', 'treegrid'],
      li: ['menuitem', 'option', 'row', 'tab', 'treeitem'],
      table: ['grid'],
      td: ['gridcell'],
    }],
    'jsx-a11y/no-noninteractive-tabindex': ['warn', {
      tags: [],
      roles: ['tabpanel'],
    }],
    'jsx-a11y/no-redundant-roles': 'error',
    'jsx-a11y/no-static-element-interactions': ['warn', {
      handlers: [
        'onClick',
        'onMouseDown',
        'onMouseUp',
        'onKeyPress',
        'onKeyDown',
        'onKeyUp',
      ],
    }],
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',
    'jsx-a11y/scope': 'error',
    'jsx-a11y/tabindex-no-positive': 'error',

    // ============================================================
    // GENERAL RULES
    // ============================================================
    'no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    'no-console': ['warn', {
      allow: ['warn', 'error']
    }],

    // React Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
}, {
  // TypeScript parsing + TS-friendly rules
  files: ['**/*.{ts,tsx}'],
  languageOptions: {
    parser: tsParser,
  },
  rules: {
    // TypeScript: prefer TS-aware unused-vars checks (keeps types out of the equation)
    'no-unused-vars': 'off',
    // TypeScript already checks globals/types; core no-undef is not TS-aware.
    'no-undef': 'off',
    'no-redeclare': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    }],
  },
}, {
  // Ignore patterns
  ignores: [
    '.agents/**',
    '.claude/**',
    '.cursor/**',
    'agent-skills/**',
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    'storybook-static/**',
    'stories/**',
    'public/sw.js',
    'coverage/**',
    '*.config.js',
    '*.config.mjs',
  ],
}, ...storybook.configs["flat/recommended"]];
