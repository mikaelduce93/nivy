# NIVY - User Flows & Navigation

Phase 2 - Agent A5 deliverables. Documents the parcours-sans-friction
fixes applied across onboarding, payment, empty states, auth and the
teen dashboard.

## 1. Onboarding (`/onboarding`)

7 steps total: `welcome → showcase → profile-type → parent-setup |
teen-setup → features → completion`.

### What changed
- **Étape X / N label** is now visible from the very first step (top
  bar, `aria-live="polite"`). Previously the user had no concrete
  sense of progression until step 3.
- **ProgressIndicator** still drives the visual bar; the new label
  sits above it for explicit numeric progression.
- **Skip button** rewritten from a vague *"Passer"* to *"Passer cette
  étape"* with a `<SkipForward />` icon and a clear `aria-label`
  ("Passer l'onboarding et aller à la connexion").
- **Juice on completion**: `useJuice('level_up')` fires confetti +
  sound + haptic when the user finishes step 7. Between intermediate
  steps `useJuice('xp_gain', { noConfetti: true })` plays a subtle
  audio cue. Both respect `prefers-reduced-motion` and the
  `nivy.audio` mute setting.

### Files
- `app/onboarding/page.tsx` (label, skip, juice hookup)
- `components/onboarding/onboarding-transition.tsx` (untouched, kept)

## 2. Payment session (`/reservation/paiement`)

Bookings have a 10-minute hold. Before, a hard expiry simply bounced
the user back to `/mes-reservations` losing all context.

### Storage contract — `localStorage["nivy.cart"]`

```ts
{
  bookingId: string
  reference?: string
  eventTitle?: string
  totalAmount?: number
  savedAt: number      // Date.now()
  status: 'awaiting_payment'
}
```
TTL: 24h on read; cleared on payment confirmation.

### Lifecycle
1. **Mount of `/reservation/paiement`** — `<PaymentCartPersistence>`
   stamps the cart into `localStorage["nivy.cart"]`.
2. **8m30 mark (90s before expiry)** — `<SessionTimer>` fires a
   one-shot Sonner `toast.warning("Ta session expire bientôt")`
   referencing the booking ref and reassuring the user the cart is
   saved.
3. **Expiry (10m mark)** — `<PaymentExpiryRedirect>` re-tags the
   cart, then hard-redirects to `/mes-reservations`.
4. **Return to `/reservation`** — `<PaymentCartResumeBanner>` reads
   the persisted cart and surfaces an orange banner with a "Reprendre
   le paiement" CTA pointing to
   `/reservation/paiement?booking=<bookingId>`.
5. **Successful payment (`/reservation/confirmation`)** —
   `<PaymentCartClearOnMount>` removes the cart entry.

### Files
- `components/session-timer.tsx` (warning toast at `warningAtSeconds=90`)
- `components/payment-cart-persistence.tsx` (read/write/clear helpers)
- `components/payment-expiry-redirect.tsx` (RSC-friendly wrapper)
- `components/payment-cart-resume-banner.tsx`
- `components/payment-cart-clear-on-mount.tsx`
- `app/reservation/paiement/page.tsx`
- `app/reservation/page.tsx`
- `app/reservation/confirmation/page.tsx`

## 3. Empty states on teen pages

`components/ui/states/empty-state.tsx` has four new presets:

| Preset    | Icon (lucide) | Default copy |
|-----------|---------------|--------------|
| `friends` | `Users`       | "Pas encore d'amis — invite tes potes…" |
| `coins`   | `Coins`       | "Termine des quêtes pour earn tes premiers coins…" |
| `feed`    | `Activity`    | "Suis tes potes pour voir leur activité ici" |
| `quests`  | `Target`      | "Reviens demain pour de nouvelles quêtes…" |

### Wiring

| Page | Preset | Trigger |
|------|--------|---------|
| `/teen/friends` | `friends` (zero) / `search` (filtered) | `FRIENDS.length===0` vs `filteredFriends.length===0` |
| `/teen/wallet` (CoinsTab) | `coins` | `transactions.length===0 && walletData.coins===0` |
| `/teen/social` (FriendsTab) | `feed` (zero) / `search` (filtered) | `friends.length===0` |
| `/teen/messages` | `messages` | `conversations.length===0` |
| `/teen/quests` | `quests` (per-tab copy) | `filteredQuests.length===0` |

## 4. Auth auto-redirect

Both `/auth/login` and `/auth/sign-up` now run a mount-time
`supabase.auth.getUser()` check. If a user is already authenticated
they get a `router.replace("/auth/redirect")` (the role-aware
dispatcher) — they never see the login form on a back/forward nav
after sign-in.

### Files
- `app/auth/login/page.tsx`
- `app/auth/sign-up/page.tsx`

## 5. Teen dashboard Suspense

`components/teen/dashboard/teen-dashboard-content.tsx` already wrapped
the `MapPreview` in `<Suspense fallback={<MapSkeleton/>}>`. Added
boundaries for:

| Section | Fallback |
|---------|----------|
| `QuickAccessGrid` | `QuickAccessSkeleton` |
| `OnlineFriends`   | `CardSkeleton` |
| `CrewHub`         | `CardSkeleton` (full height) |
| `ProfileQuest`    | `CardSkeleton` |

`LazySocialFeed` already streams via `dynamic()`. The page-level
`Promise.all` for achievement / rank / dashboard data still SSRs in
one roundtrip — splitting that would require deeper refactor and was
scoped out.

## 6. Orphan routes

| Route | Decision | Reason |
|-------|----------|--------|
| `/teen/test` | **Deleted** | Debug stub ("SYSTEM OK"), no callers |
| `/teen/games` | **Linked in sidebar** | Fleshed-out static UI, was unreachable |
| `/teen/circles` | Kept | Already linked from sidebar + `crew-hub`/`mobile-nav`/`quick-access-grid`/`social-hub-widget` |
| `/teen/passions` | Kept | Already linked from sidebar; redirects to `/teen/quests?tab=creative` |
| `/teen/share` | Kept | Already linked from sidebar |

### File
- `components/dashboard/teen/sidebar.tsx` (added Games entry, icon `Gamepad2`)
