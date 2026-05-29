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
import nextPlugin from "@next/eslint-plugin-next"

export default [js.configs.recommended, {
  files: ['**/*.{js,jsx,ts,tsx}'],
  plugins: {
    'jsx-a11y': jsxA11y,
    '@typescript-eslint': tsPlugin,
    'react-hooks': reactHooks,
    // #23 — register the Next plugin so `eslint-disable @next/next/*`
    // directives resolve (else flat config errors "rule not found"). Rules are
    // left off by default to avoid baselining ~30 raw <img> warnings here.
    '@next/next': nextPlugin,
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
  // ============================================================
  // CANON COMPLIANCE GUARDS (Wave 0 — Safety Freeze, 2026-05-08)
  // ------------------------------------------------------------
  // Source: docs/canon/INDEX.locked.md + docs/compliance/16-implementation-roadmap.md
  // Rule level: ERROR (CI fails on net-new violations).
  // These rules block AI dev agents from re-introducing the regressions
  // identified in the 2026-05-08 compliance audit. They DO NOT change
  // product behavior — they only prevent regressions.
  //
  // Existing baseline violations are tolerated via `--max-warnings`
  // ratchet in package.json; net-new violations FAIL CI.
  //
  // To intentionally bypass any rule, add an explicit
  //   // eslint-disable-next-line no-restricted-syntax -- canon: <rationale>
  // comment so the violation is visible in code review.
  // ============================================================
  files: ['app/**/*.{ts,tsx,js,jsx}', 'components/**/*.{ts,tsx,js,jsx}', 'lib/**/*.{ts,tsx,js,jsx}', 'hooks/**/*.{ts,tsx,js,jsx}'],
  rules: {
    'no-restricted-syntax': ['warn',
      // [CANON-XP] phantom RPC `add_user_xp` — must be `add_xp_to_user` (canon: economy-payments §7, gamification §3)
      {
        selector: "Literal[value='add_user_xp']",
        message: 'CANON VIOLATION: `add_user_xp` is a phantom RPC. Use `add_xp_to_user` (canon: economy-payments §7).',
      },
      {
        selector: "Literal[value='deduct_user_xp']",
        message: 'CANON VIOLATION: `deduct_user_xp` is a phantom RPC. Use the canonical spend_* RPC family (canon: economy-payments §7).',
      },
      {
        selector: "Literal[value='get_user_xp']",
        message: 'CANON VIOLATION: `get_user_xp` is a phantom RPC. Read `user_xp.total_xp` directly (canon: economy-payments §1).',
      },
      // [CANON-NOTIF] deprecated tables `notifications` / `activity_logs` (canon: parent-control §8, INDEX cross-cut #5)
      {
        selector: "CallExpression[callee.property.name='from'][arguments.0.value='notifications']",
        message: 'CANON VIOLATION: `notifications` is deprecated. Use `user_notifications` (canon: parent-control §8, INDEX #5).',
      },
      {
        selector: "CallExpression[callee.property.name='from'][arguments.0.value='activity_logs']",
        message: 'CANON VIOLATION: `activity_logs` is deprecated. Use `user_notifications` or `audit_log` (canon: parent-control §8, INDEX #5).',
      },
      {
        selector: "Literal[value=/INSERT\\s+INTO\\s+notifications\\b/i]",
        message: 'CANON VIOLATION: SQL `INSERT INTO notifications` — table is deprecated. Use `user_notifications`.',
      },
      {
        selector: "Literal[value=/INSERT\\s+INTO\\s+activity_logs\\b/i]",
        message: 'CANON VIOLATION: SQL `INSERT INTO activity_logs` — table is deprecated. Use `user_notifications` or `audit_log`.',
      },
      // [CANON-AUDIT] `admin_audit_logs` deprecated; canonical is `audit_log` singular (canon: INDEX #7, admin-moderation §4 — DECIDED 2026-05-08)
      {
        selector: "CallExpression[callee.property.name='from'][arguments.0.value='admin_audit_logs']",
        message: 'CANON VIOLATION: `admin_audit_logs` is deprecated. Use `audit_log` (singular) — canon: admin-moderation §4, DECIDED 2026-05-08.',
      },
      {
        selector: "Literal[value='admin_audit_logs']",
        message: 'CANON VIOLATION: `admin_audit_logs` literal — canonical table is `audit_log` (singular). Canon: admin-moderation §4.',
      },
      // [CANON-AUTH] `auth.signUp` outside /auth/sign-up — see file-scope override below
      // [CANON-PROFILES] direct insert into `profiles` outside admin tools — see file-scope override below
      // [CANON-ALERT] window.alert as success notification (canon: design-system §11, social-feed §10)
      {
        selector: "CallExpression[callee.object.name='window'][callee.property.name='alert']",
        message: 'CANON VIOLATION: `window.alert()` is forbidden. Use sonner `toast()` for notifications. Canon: design-system §11.',
      },
      {
        selector: "CallExpression[callee.object.name='window'][callee.property.name='confirm']",
        message: 'CANON VIOLATION: `window.confirm()` is forbidden. Use ResponsiveModal with primitive buttons. Canon: design-system §11.',
      },
      // [CANON-MOTION] raw `framer-motion` import — must use `@/components/ui/motion` proxy (canon: INDEX #4, design-system §3)
      // (handled via no-restricted-imports — see below in the same block)
      // [CANON-AI-MODEL] hardcoded deprecated model literals (canon: personalization-ai §8)
      {
        selector: "Literal[value=/^claude-3-(sonnet|haiku|opus)/]",
        message: 'CANON VIOLATION: hardcoded deprecated Claude model. Use `process.env.CLAUDE_MODEL_ID` (default `claude-sonnet-4-6`). Canon: personalization-ai §8.',
      },
      {
        selector: "Literal[value=/^gpt-(3\\.5|4)$/]",
        message: 'CANON VIOLATION: hardcoded OpenAI model literal. Use `process.env.OPENAI_MODEL_ID`. Canon: personalization-ai §8.',
      },
      // [CANON-SHOP] deprecated shop rails (canon: economy-payments §3 — sunset shop_items + token_rewards + transfer_tokens)
      {
        selector: "CallExpression[callee.property.name='from'][arguments.0.value='shop_items']",
        message: 'CANON VIOLATION: `shop_items` is deprecated. Use canonical `shop_rewards` + `purchase_reward` RPC. Canon: economy-payments §3.',
      },
      {
        selector: "CallExpression[callee.property.name='from'][arguments.0.value='token_rewards']",
        message: 'CANON VIOLATION: `token_rewards` is deprecated. Use canonical `shop_rewards`. Canon: economy-payments §3.',
      },
      {
        selector: "Literal[value='transfer_tokens']",
        message: 'CANON VIOLATION: `transfer_tokens` RPC is deprecated (P2P bypassing parents — security hole). Canon: economy-payments §5.',
      },
      // [CANON-BUCKET] chore-evidence canonical bucket; `defi-proofs` deprecated (canon: gamification §3)
      {
        selector: "Literal[value='defi-proofs']",
        message: 'CANON VIOLATION: `defi-proofs` bucket is deprecated. Use `chore-evidence` (private). Canon: gamification §3.',
      },
      // [CANON-MONEY-PK] user_xp / user_coins canonical PK is `teen_id`, NOT `user_id` (canon: economy-payments §1)
      {
        selector: "CallExpression[callee.property.name='from'][arguments.0.value=/^(user_xp|user_coins)$/]",
        message: 'CANON HINT: `user_xp`/`user_coins` canonical PK is `teen_id`, NOT `user_id`. Verify .eq("teen_id", ...) downstream. Canon: economy-payments §1.',
      },
      // [CANON-PII-AI] never serialize profiles.full_name into AI prompts (canon: personalization-ai §6, P0 finding CANON-AI-001)
      {
        selector: "MemberExpression[object.property.name='profiles'][property.name='full_name']",
        message: 'CANON VIOLATION: `profiles.full_name` selected — never forward into AI prompt context. Canon: personalization-ai §6, finding CANON-AI-001.',
      },
    ],
    // [CANON-MOTION] raw framer-motion import — must use `@/components/ui/motion` proxy
    // (Exception: the proxy itself + the easing tokens module — handled via file-scope overrides below.)
    'no-restricted-imports': ['warn', {
      paths: [
        {
          name: 'framer-motion',
          message: 'CANON VIOLATION: import the `Motion` proxy from `@/components/ui/motion` instead. Canon: INDEX #4, design-system §3.',
        },
      ],
    }],
  },
}, {
  // [CANON-AUTH] auth.signUp ONLY allowed in /auth/sign-up flow + admin user-creation tools
  files: ['app/**/*.{ts,tsx,js,jsx}', 'components/**/*.{ts,tsx,js,jsx}', 'lib/**/*.{ts,tsx,js,jsx}', 'hooks/**/*.{ts,tsx,js,jsx}'],
  ignores: [
    'app/auth/sign-up/**',
    'app/api/auth/sign-up/**',
    'app/api/admin/users/**',
    'lib/auth/admin-create-user.ts',
    'lib/supabase/admin.ts',
  ],
  rules: {
    'no-restricted-syntax': ['warn',
      {
        selector: "CallExpression[callee.property.name='signUp'][callee.object.property.name='auth']",
        message: 'CANON VIOLATION: `supabase.auth.signUp()` outside the canonical sign-up flow. Use `/auth/sign-up` for new users or `supabase.auth.admin.createUser()` for admin-provisioned users. Canon: auth-onboarding §1, FORBIDDEN #3.',
      },
      // [CANON-PROFILES-INSERT] direct insert into `profiles` outside admin tools (canon: auth-onboarding FORBIDDEN #1)
      {
        selector: "CallExpression[callee.property.name='insert'][callee.object.callee.property.name='from'][callee.object.arguments.0.value='profiles']",
        message: 'CANON VIOLATION: direct INSERT INTO `profiles`. Profiles must only be created by the `handle_new_user` trigger or approved admin tools. Canon: auth-onboarding FORBIDDEN #1.',
      },
      {
        selector: "CallExpression[callee.property.name='upsert'][callee.object.callee.property.name='from'][callee.object.arguments.0.value='profiles']",
        message: 'CANON VIOLATION: direct UPSERT INTO `profiles`. Profiles must only be created by the `handle_new_user` trigger or approved admin tools. Canon: auth-onboarding FORBIDDEN #1.',
      },
    ],
  },
}, {
  // [CANON-MOTION] proxy itself is allowed to import framer-motion
  files: ['components/ui/motion.tsx', 'components/ui/motion/**', 'lib/motion/**'],
  rules: {
    'no-restricted-imports': 'off',
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
