# Mobile / PWA Strategy — Vision vs. Reality

> Audit date: 2026-05-07 · Sources: `next.config.mjs`, `app/manifest.ts`, `app/layout.tsx`, `components/pwa/*`, `components/install-pwa-prompt.tsx`, `components/layouts/mobile-dock.tsx`, `lib/hooks/notifications/use-push.ts`, `app/api/notifications/push/*`, `public/icons/`. Cross-references the notifications audit (`docs/vision/notifications.md`).

## 1. Intent (Product Vision)

Nivy is mobile-first by definition: the user base is teens 13-17 in Morocco, who live almost exclusively on their phones, and a meaningful slice of them are on Android devices in the 4-8 GB range with intermittent 4G. The launch plan is **PWA only**: a single Next.js app, installable to the home screen on Android (Chrome/Edge) and iOS (Safari "Add to Home Screen" + iOS 16.4+ web push), with native iOS / Android binaries explicitly **deferred post-MVP**. Mobile push must work via VAPID `web-push`, with **SMS as the fallback rail** for parental approvals on devices where push is unreliable (older iOS, no PWA install, denied permissions). The app must feel native: full-bleed safe-area handling on notched devices, a persistent bottom dock, 44 px minimum touch targets, haptic-style spring animations, and offline resilience for critical flows (viewing already-loaded quests, drafting a quiz answer, recovering from a flaky tunnel). **Deep links from notifications** must land directly on the relevant screen — `/teen/quest/123` from a streak reminder must open the quest detail, not the home dashboard. The avatar coach (live mascot interactions, lip-sync, voice playback) must work on mobile browsers, including the WebAudio quirks of iOS Safari. Camera access for QR ticket scan and physical-défi photo proof must work in-PWA. A native iOS/Android app is on the roadmap once the audience justifies the cost; the PWA-first stance is a deliberate bet that distribution friction (App Store gating for 13-17 audience, in-app-purchase tax, Apple review cycles in French/Arabic) is currently more painful than PWA limitations.

## 2. Reality (What Exists in Code)

The PWA scaffolding is **partially built and currently broken in delivery, but reasonably well-formed in metadata**. `next.config.mjs` does **not** use `next-pwa` or `serwist` — there is no third-party PWA plugin; the app relies on Next 16's native metadata API plus a hand-written service worker registration. `app/manifest.ts` is the canonical Web App Manifest (Next emits it at `/manifest.webmanifest`): `name`, `short_name`, `description`, `start_url: "/"`, `display: "standalone"`, `background_color: "#09090b"`, `theme_color: "#06b6d4"`, `orientation: "portrait-primary"`, eight icon sizes (72 / 96 / 128 / 144 / 152 / 192 / 384 / 512), an Apple 180 × 180, `purpose: "maskable"` on the 512 and Apple icons, three `shortcuts` (Événements → `/agenda`, Mes Réservations → `/mes-reservations`, Clubs → `/clubs`), and `categories: ["entertainment", "lifestyle", "social"]`. **However, several icon files referenced by the manifest do not exist on disk** (`public/icons/` contains only `apple-touch-icon.png`, `icon-152x152.png`, `icon-16x16.png`, `icon-192x192.png`, `icon-32x32.png`, `icon-512x512.png`, `panda-favicon.svg`, `safari-pinned-tab.svg` — the 72/96/128/144/384 PNGs and `apple-icon.png` are missing, as are the `badge-72x72.png` referenced by the push send route and the entire `public/splash/` directory referenced by `components/pwa/pwa-head.tsx`).

`app/layout.tsx` declares `viewport: { width: "device-width", initialScale: 1, maximumScale: 5, viewportFit: "cover", themeColor: [light/dark variants] }` (good — `viewport-fit: cover` enables `env(safe-area-inset-*)`), `appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Teens Party" }`, and a `manifest: "/manifest.json"` reference (note: Next will serve the `app/manifest.ts` as `/manifest.webmanifest`, so the `/manifest.json` URL technically 404s — `components/pwa/pwa-head.tsx` *also* injects a `<link rel="manifest" href="/manifest.json">` tag, which is dead). The component `components/pwa/service-worker-registration.tsx` is mounted in the root layout and calls `navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })` on `window.load`, with periodic `registration.update()` every hour, a `controllerchange` reload trick, a 30-second-delayed `Notification.requestPermission()`, and a `periodicSync` registration attempt — **but `public/sw.js` does not exist in the repo** (confirmed by the notifications audit and re-verified). So the registration always throws; `usePushNotifications` calls `navigator.serviceWorker.ready` and hangs; no real push delivery happens; the SW update prompt UI never fires.

The install prompt is **duplicated** in two places: `components/pwa/pwa-install-prompt.tsx` (`PWAInstallBanner`, mounted in root layout, the canonical implementation — handles `beforeinstallprompt`, iOS detection via `/iPad|iPhone|iPod/.test(navigator.userAgent)`, `display-mode: standalone` and `navigator.standalone` checks, a 7-day localStorage dismiss cooldown, an iOS Safari instructions modal, and a `gtag("event", "pwa_install_success")` analytics ping) and a second simpler `components/install-pwa-prompt.tsx` (`InstallPWAPrompt`) that is not currently mounted but is wired with `pwa-prompt-dismissed` localStorage. The canonical one is good; the duplicate should be removed.

Mobile responsiveness is **strong on the dock, weaker elsewhere**: `components/layouts/mobile-dock.tsx` is a polished bottom navigation with five tabs per persona (teen / parent / partner / admin / ambassador / public), `pb-[calc(0.75rem+env(safe-area-inset-bottom))]`, `min-h-touch` on every tap target, badge counts, framer-motion spring transitions, and `aria-label`/`aria-current` accessibility. `components/layouts/parent-mobile-dock.tsx` exists for the parent zone (rendered separately). `min-h-touch` is referenced but only defined in `app/globals.css`; the actual minimum height value should be audited (44 px = iOS HIG, 48 dp = Android Material). Safe-area-inset usage shows up in 7 files (mobile-dock, bottom-sheet, long-press-menu, pwa-install-prompt, swipeable-card, pwa-head, globals.css) — coverage is decent for interactive primitives but is not enforced anywhere page-level. `pb-24 md:pb-0` on the `<main>` element creates the dock clearance.

Web push is the **broken half** detailed at length in `docs/vision/notifications.md`: server route `app/api/notifications/push/send/route.ts` is complete (loads VAPID keys, fetches `push_subscriptions`, calls `web-push.sendNotification`, deletes 410/404 endpoints), client hook `lib/hooks/notifications/use-push.ts` calls `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <vapid> })` and POSTs to `/api/notifications/push/subscribe` — but with no `sw.js` to receive the push event, no notification ever displays and `push_subscriptions` is empty in the live DB. There is **no `notificationclick` handler** anywhere in the repo, which means even if a SW were added, deep linking from a push notification to `/teen/quest/123` would not work without explicit code (`event.notification.data.url` → `clients.openWindow(url)`).

Offline strategy: **none implemented**. There is no service-worker cache, no Workbox / Serwist runtime caching rules, no IndexedDB writes for offline quiz drafts, and no Background Sync registration (`periodicSync.register("update-content", ...)` is the only sync attempt, and it's a periodic sync, not the offline-mutation Background Sync API). `components/ui/states/OfflineBanner` displays a banner when `navigator.onLine === false` but does not enable any offline functionality. The `Cache-Control` headers in `next.config.mjs` cover static assets (1 year for images / fonts) — but that's HTTP caching, not service-worker offline. The 30-day `minimumCacheTTL` on Next images is also HTTP-only.

## 3. Gap Analysis

- **`public/sw.js` missing** — registration always throws. Without this single file, push notifications, offline caching, install-time precache, and `notificationclick` deep-linking are all dead. **Highest-priority single fix.**
- **Manifest icon files missing on disk** — manifest references 72/96/128/144/384 PNGs and `apple-icon.png` that don't exist; install will likely succeed but Lighthouse PWA score will fail and some Android launchers will fall back to a generic icon.
- **No splash screens** — `components/pwa/pwa-head.tsx` references eight `/splash/apple-splash-*.png` files and `public/splash/` directory does not exist; iOS adds-to-home-screen will show a white screen on launch.
- **Two manifest URLs** — `app/manifest.ts` (Next-served at `/manifest.webmanifest`) and a hardcoded `<link rel="manifest" href="/manifest.json">` in two places (`app/layout.tsx` metadata + `pwa-head.tsx`). Pick one.
- **Duplicate install prompt components** — `components/pwa/pwa-install-prompt.tsx` and `components/install-pwa-prompt.tsx` overlap; remove the standalone one.
- **No `notificationclick` deep-link handler** — when a push lands on `/teen/quest/123`, there is no SW code to focus / open a tab to that URL. Notifications would just dismiss.
- **No offline cache strategy** — no static-shell precache, no API cache (e.g., last-viewed quests, wallet balance, profile), no IndexedDB Background Sync queue for offline quiz attempts.
- **Camera / QR scan** not yet wired (no `getUserMedia` references in PWA-related code) — needed for ticket QR + physical défi photo proof.
- **Apple Pay / Google Pay** — no Payment Request API integration (Morocco rails CMI / Naps are documented in `docs/vision/payment-rails-morocco.md`; native wallet integration is undecided).
- **Touch target enforcement** — `min-h-touch` exists in CSS but is not applied uniformly across legacy components (e.g., older `<button>` instances in admin/partner zones).
- **No PWA E2E test** — Playwright suite does not assert install banner, manifest validity, or service-worker activation.
- **Avatar coach mobile** — WebAudio + lip-sync code path is referenced in `docs/vision/avatar-coach.md`; no audit yet of iOS Safari WebAudio context unlock (must be triggered by user gesture).
- **`periodicSync` registered without permission UX** — `registration.periodicSync.register("update-content", { minInterval: 24h })` runs silently; in Chrome this requires `periodic-background-sync` permission via origin trial or PWA install heuristic.
- **Native fallback path undefined** — if a teen installs the PWA today and Nivy ships a React Native app in 6 months, there is no documented migration: same Supabase auth tokens? same push subscription handoff (drop web-push, register FCM/APNS)?

## 4. Risks

- **iOS web push gating**: Apple only supports web push on iOS 16.4+ AND only after the user adds the PWA to home screen. Any teen on iOS 15 or who installs via Safari without "Add to Home Screen" gets zero push. Combined with strict 50 MB Safari storage budget, iOS is the riskiest tier.
- **Android Chrome `beforeinstallprompt` heuristics** are unpredictable: Chrome decides eligibility based on engagement signals; if the manifest has missing icons, the prompt may never fire, killing the install funnel.
- **PWA install ≠ engagement**: even when installed, retention is lower than native apps because there's no App Store discovery loop, no badge count outside the SW, and no native push channels (categories, action handlers limited).
- **Notification permission burnout** — current code calls `Notification.requestPermission()` 30 s after page load with no UX preamble; a denied permission is sticky in Chrome and very hard to recover. Should be gated behind an explicit "Enable reminders" CTA in onboarding.
- **Payment Request API on Morocco**: Apple Pay / Google Pay availability is patchy in Morocco and CMI/Naps don't surface as Payment Request methods; PWA top-up may have to fall back to redirect-to-CMI flow.
- **Camera permission** — works in PWA on Android but iOS PWAs (`display: standalone`) historically had quirks with `getUserMedia`; needs validation before relying on it for QR scanning.
- **Background Sync** is Chrome-only; iOS Safari has no equivalent. Offline quiz attempts queued via Background Sync will never replay on iOS.
- **App update churn** — `updateViaCache: "none"` + hourly `registration.update()` is aggressive; if a deploy goes out every day, users get an update prompt daily, which trains them to dismiss it.

## 5. Open Questions

- Do we ship a native iOS / Android app at launch or defer post-MVP? (current bet: defer)
- If we defer, what's the trigger for native? (DAU threshold, App Store discovery need, push reliability complaint volume?)
- Apple Pay / Google Pay integration for top-up — supported in Morocco for our merchant of record, or stick to CMI redirect?
- Camera access for QR ticket scan + physical défi photo proof — does iOS Safari standalone PWA reliably grant `getUserMedia` for our target devices, or do we need a Safari-tab fallback?
- Background Sync for offline quiz attempts — Chrome-only; ship as best-effort enhancement, or invest in IndexedDB + manual replay-on-online for cross-browser parity?
- Service-worker strategy: hand-write minimal `sw.js` (push + notificationclick + simple cache-first for `/_next/static`) or adopt Serwist / `@ducanh2912/next-pwa` for batteries-included Workbox routing?
- Splash-screen generation: regenerate the 8 referenced Apple PNGs, or drop them and rely on the (worse) auto-generated white screen?
- Native migration plan: when the React Native app ships, do we keep web push for desktop and add FCM/APNS for native, or unify everything on a single device-token table?
- Lighthouse PWA score target for launch (90+? Installability + offline both required?)
- App-store review strategy if we eventually ship native: 13-17 audience triggers extra child-safety review on both stores — does this re-validate the PWA-first bet?
- WhatsApp deep-linking from notifications (e.g., parent gets a WhatsApp message with `https://nivy.ma/teen/quest/123` link) — counts as a deep link path even before native?

## 6. Source Files & Tables Referenced

Code paths checked:
- `C:\Users\Shadow\Desktop\NIVY\next.config.mjs`
- `C:\Users\Shadow\Desktop\NIVY\app\manifest.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\layout.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\pwa\service-worker-registration.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\pwa\pwa-install-prompt.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\pwa\pwa-head.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\pwa\index.ts`
- `C:\Users\Shadow\Desktop\NIVY\components\install-pwa-prompt.tsx` (duplicate, unmounted)
- `C:\Users\Shadow\Desktop\NIVY\components\layouts\mobile-dock.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\layouts\parent-mobile-dock.tsx`
- `C:\Users\Shadow\Desktop\NIVY\lib\hooks\notifications\use-push.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\hooks\notifications\utils.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\notifications\push\send\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\notifications\push\subscribe\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\notifications\push\unsubscribe\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\globals.css` (safe-area-inset, min-h-touch class)
- `C:\Users\Shadow\Desktop\NIVY\public\icons\` (partial set)
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\notifications.md` (cross-ref)
- `C:\Users\Shadow\Desktop\NIVY\docs\design\TOUCH_TARGETS.md`

Missing / referenced-but-absent assets:
- `public/sw.js` (referenced by `service-worker-registration.tsx`, does not exist)
- `public/manifest.json` (referenced via `<link rel="manifest">`, Next emits at `/manifest.webmanifest` instead)
- `public/icons/icon-72x72.png`, `icon-96x96.png`, `icon-128x128.png`, `icon-144x144.png`, `icon-384x384.png`, `apple-icon.png`, `badge-72x72.png` (manifest / push references)
- `public/splash/apple-splash-{2048-2732,1668-2388,1536-2048,1125-2436,1242-2688,828-1792,1170-2532,1284-2778}.png` (referenced by `pwa-head.tsx`)
- `public/browserconfig.xml` (msapplication-config reference)

DB tables (live, project `imchornjvmgmaovhypco`):
- `public.push_subscriptions` (0 rows — empty because SW never registers)
