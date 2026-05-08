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
  // ============================================================
  // DESIGN-SYSTEM GUARDRAIL (TICKET-001)
  // ------------------------------------------------------------
  // Lint-ban raw Tailwind palette literals in JSX className attrs
  // across all role surfaces (`app/**`). Forces consumers to reach
  // for the semantic tokens defined in `app/globals.css`
  // (brand-soft, accent-soft, success-soft, info-soft, primary,
  // accent, success, warning, info, foreground, muted-foreground,
  // border, ring, sidebar-*, neon-*, on-bright, gen-z-*).
  //
  // Rule level: WARN (with --max-warnings baseline so net-new
  // violations FAIL CI, while existing offenders ride along until
  // the Wave 2 token sweep — TICKET-002).
  //
  // Banned families:
  //   cyan, emerald, sky, rose, amber, fuchsia, blue, gray,
  //   indigo, teal — at any numeric shade (`-50` … `-950`).
  //   plus `zinc-50/100/200/300` (low end of zinc only — `zinc-400+`
  //   stays allowed because those shades are used for proper
  //   foreground contrast on dark surfaces and have no semantic
  //   replacement yet).
  //
  // Any Tailwind utility that takes a colour scale is matched —
  // bg, text, border, ring, divide, fill, stroke, shadow, outline,
  // from, to, via, placeholder, caret, accent, decoration. Modifier
  // prefixes (`hover:`, `dark:`, `md:`, `group-*:`, etc.) are
  // tolerated by anchoring the regex on a word boundary, not start.
  // ============================================================
  files: ['app/**/*.{ts,tsx,js,jsx}'],
  rules: {
    'no-restricted-syntax': ['warn',
      {
        // Static className="..."  /  className={'...'}
        selector: "JSXAttribute[name.name='className'] Literal[value=/(?:^|[\\s:])(?:bg|text|border|ring|divide|fill|stroke|shadow|outline|from|to|via|placeholder|caret|accent|decoration)-(?:cyan|emerald|sky|rose|amber|fuchsia|blue|gray|indigo|teal)-(?:50|100|200|300|400|500|600|700|800|900|950)\\b/]",
        message: 'Raw Tailwind colour literal in className. Use a semantic token instead (brand-soft, accent-soft, success-soft, info-soft, primary, accent, success, warning, info, foreground, muted-foreground, border, ring, gen-z-* …). See `app/globals.css` and TICKET-001.',
      },
      {
        // Low-end zinc only: zinc-50/100/200/300 banned, zinc-400+ allowed.
        selector: "JSXAttribute[name.name='className'] Literal[value=/(?:^|[\\s:])(?:bg|text|border|ring|divide|fill|stroke|shadow|outline|from|to|via|placeholder|caret|accent|decoration)-zinc-(?:50|100|200|300)\\b/]",
        message: 'Raw zinc-50/100/200/300 in className. Prefer semantic tokens (muted, muted-foreground, border, foreground). zinc-400+ is allowed for contrast. See TICKET-001.',
      },
      {
        // Template-literal className (cn(`bg-blue-500 ${...}`))
        selector: "JSXAttribute[name.name='className'] TemplateElement[value.raw=/(?:^|[\\s:])(?:bg|text|border|ring|divide|fill|stroke|shadow|outline|from|to|via|placeholder|caret|accent|decoration)-(?:cyan|emerald|sky|rose|amber|fuchsia|blue|gray|indigo|teal)-(?:50|100|200|300|400|500|600|700|800|900|950)\\b/]",
        message: 'Raw Tailwind colour literal in className template. Use a semantic token. See TICKET-001.',
      },
      {
        selector: "JSXAttribute[name.name='className'] TemplateElement[value.raw=/(?:^|[\\s:])(?:bg|text|border|ring|divide|fill|stroke|shadow|outline|from|to|via|placeholder|caret|accent|decoration)-zinc-(?:50|100|200|300)\\b/]",
        message: 'Raw low-shade zinc in className template. Use semantic tokens. zinc-400+ is allowed. See TICKET-001.',
      },
      {
        // cn(...) / clsx(...) / cva(...) string literal arguments
        selector: "CallExpression[callee.name=/^(cn|clsx|cva|twMerge|classNames)$/] Literal[value=/(?:^|[\\s:])(?:bg|text|border|ring|divide|fill|stroke|shadow|outline|from|to|via|placeholder|caret|accent|decoration)-(?:cyan|emerald|sky|rose|amber|fuchsia|blue|gray|indigo|teal)-(?:50|100|200|300|400|500|600|700|800|900|950)\\b/]",
        message: 'Raw Tailwind colour literal inside cn/clsx/cva. Use a semantic token. See TICKET-001.',
      },
      {
        selector: "CallExpression[callee.name=/^(cn|clsx|cva|twMerge|classNames)$/] Literal[value=/(?:^|[\\s:])(?:bg|text|border|ring|divide|fill|stroke|shadow|outline|from|to|via|placeholder|caret|accent|decoration)-zinc-(?:50|100|200|300)\\b/]",
        message: 'Raw low-shade zinc inside cn/clsx/cva. Use semantic tokens. zinc-400+ is allowed. See TICKET-001.',
      },
    ],
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
    'public/sw.js',
    'coverage/**',
    '*.config.js',
    '*.config.mjs',
    'scripts/**',
  ],
}];
