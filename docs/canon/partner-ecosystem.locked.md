# Partner Ecosystem — LOCKED Canonical Spec

> Status: **LOCKED** — read-only canonicalization. Date 2026-05-08. Source: `docs/vision/**`.
> Sibling audits relied upon: `partner-network.md`, `audit-frontend-reality/B3-partner-audit.md`, `audit-frontend-reality/C3-partner-ecosystem.md`, `audit-frontend-reality/E5-partner-flows.md`, `food-delivery-restaurants.md`, `transport-mobility.md`, `mentorship-career.md`, `content-creator-economy.md`, `ambassador-referral.md`, `teacher-coach-xp.md`, `birthday.md`, `events-lifecycle.md`, `marketplace-c2c.md`, `PRODUCT_WHITEPAPER.md` §9 §22.
>
> Scope: lock the partner taxonomy, the prospect→active lifecycle, the canonical tables, the canonical APIs, the deprecated surfaces, the forbidden patterns, the missing surfaces, and the unresolved founder decisions.
> Out of scope: authentication primitives shared with non-partner roles, teen-side discovery internals (covered by `search-discovery`).

---

## 1. LOCKED — Partner Archetypes

A **partner** is any non-teen / non-parent / non-admin actor that supplies goods, services, attention, certification, or labor to a Nivy teen and that requires KYC, a payout rail, a moderated public listing, or a scanner/dashboard surface. The taxonomy below is the **full enumeration**. Every archetype MUST resolve to one `partner_type` value (column on `partners`). Sub-categorization is done via `partners.sub_category` (open vocabulary, CHECK-constrained per type).

Conventions:
- `partner_type` — primary discriminator. Drives sidebar, dashboard variant, payout rail.
- **Public landing** — the `/devenir-X` URL prospects land on. One per archetype, no shared wizard except for the four legacy commerce types (retail/venue/club/education) which share `/devenir-partenaire`.
- **Dashboard surface** — the post-login workspace root. MUST be type-aware (no flat one-size sidebar — see §6).
- **Scanner** — required iff the archetype redeems a teen QR (offer/ticket/order). All scanners MUST go through the canonical apply flow (§4).
- **Special tables** — beyond the canonical six (§3), tables this archetype owns.

| # | Archetype | `partner_type` | `sub_category` | Public landing | Dashboard surface | Scanner / redemption | Special tables |
|---|-----------|----------------|-----------------|----------------|-------------------|----------------------|----------------|
| 1 | Retail (shops, brands) | `retail` | `clothing` / `cosmetics` / `tech` / `bookstore` / `gift` / … | `/devenir-partenaire` (card 1/4) → `/devenir-partenaire/inscription?type=retail` | `/partner/retail/dashboard` | YES — VIP card scan → `partner_offers` redemption | (none beyond canonical) |
| 2 | Venue / Lounge / Café (non-food-delivery) | `venue` | `lounge` / `cafe` / `event_space` / `entertainment` | `/devenir-partenaire` (card 2/4) → `/devenir-partenaire/inscription?type=venue` | `/partner/venue/dashboard` | YES — VIP card + event ticket | `partner_venues`, `venue_event_packages` (catering goes to `food` archetype) |
| 3 | Club (sport, fitness, dance) | `club` | `football` / `basketball` / `martial_arts` / `dance` / `gym` / `swimming` | `/devenir-partenaire` (card 3/4) → `/devenir-partenaire/inscription?type=club` | `/partner/club/dashboard` | YES — VIP card check-in | `club_offerings`, `club_memberships` |
| 4 | Education (academies, tutoring centres) | `education` | `language` / `tutoring` / `prep_school` / `coding` / `arts_education` | `/devenir-partenaire` (card 4/4) → `/devenir-partenaire/inscription?type=education` | `/partner/education/dashboard` | YES — VIP card check-in + grade validation | `education_courses`, `tutoring_slots` |
| 5 | Restaurant (food delivery / dine-in / pickup) | `food` *(NEW — splits from venue)* | `restaurant` / `cafe` / `bakery` / `catering` / `grocery` / `dark_kitchen` | **`/devenir-restaurant`** (NEW dedicated card 5) | `/partner/food/dashboard` (replaces today's hidden `/partner/restaurant/{menu,orders}`) | YES — order-bound QR (kitchen ticker), not VIP card | `menu_items`, `food_orders`, `food_order_items`, `nutrition_challenges` |
| 6 | Driver (Nivy ride pool) | `driver` *(NEW — own role, see §8)* | `taxi_individual` / `taxi_coop` / `private_pool` | **`/devenir-driver`** (NEW) | `/driver/dashboard` (NOT `/partner/*` — separate workspace; see §8) | NO scanner UI — uses ride state machine (`dispatched → in_progress → completed`); driver app uses `ride_id` deep link, not QR | `nivy_drivers`, `ride_bookings`, `ride_tracks`, `ride_groups`, `ride_group_members` |
| 7 | Mentor (career / hobby advisor, 17+) | `mentor` *(NEW)* | `career` / `sport_mentor` / `hobby` / `older_sibling` | **`/devenir-mentor`** + `/devenir-mentor/candidature` (NEW — endpoint `/api/mentor/apply` already exists, missing front door) | `/mentor/dashboard` (already exists; not under `/partner/*`) | NO QR — session join via signed `meeting_url` window `[T-30, T+duration+30]` | `mentors`, `mentor_sessions`, `career_pathways`, `teen_pathway_progress`, `internships`, `internship_applications` |
| 8 | Coach (sub-role of `club` partner) | `club` + `partner_staff.role='coach'` | inherits club | **`/devenir-coach`** (NEW — joins via existing club, or self-applies to be matched) | `/partner/awards` (XP-grant UI, club-scoped) + restricted view of `/partner/club/dashboard` | NO QR — XP grant via `partner_xp_awards` form (search teen → enter amount + evidence) | `partner_staff` (with `role='coach'`), `partner_xp_awards` |
| 9 | Teacher (sub-role of `education` partner) | `education` + `partner_staff.role='teacher'` | inherits education | **`/devenir-teacher`** (NEW — joins via existing education centre, or self-applies) | `/partner/awards` (same UI, education-scoped) + tutoring-slot manager | NO QR — XP grant + grade validation (`teen_grades.validated_by` MUST point at teacher's `auth.users.id`, not parent) | `partner_staff` (with `role='teacher'`), `tutoring_slots`, `partner_xp_awards` |
| 10 | DJ / Performer | `event_talent` *(NEW)* | `dj` / `live_band` / `solo_artist` / `mc_animateur` | `/djs` (public list — already exists) + `/djs/candidature` → MUST migrate to `/devenir-dj` for naming consistency | `/partner/talent/dashboard` (gigs, availability, booking confirmations) | NO QR — gig-bound state machine, signed contract download | `dj_profiles`, `dj_bookings` (NEW — `dj_applications` is the legacy candidature stash and is deprecated, see §5) |
| 11 | Event organizer / festival promoter | `event_organizer` *(NEW)* | `concert` / `festival` / `sport_tournament` / `conference` | **`/devenir-organisateur`** (NEW) | `/partner/events/dashboard` + `/partner/events/new` + `/partner/events/[id]` (the create + edit sub-routes are missing today — `app/partner/events/page.tsx` is list-only) | YES — event ticket QR scan at door | `events` (existing — needs `partner_id` FK guarded) |
| 12 | Birthday host (catering + venue + activity bundle) | `venue` + `partner_staff.role='owner'` flagged `accepts_birthday=true` OR `food` w/ `sub_category='catering'` | `birthday_pack` | `/devenir-anniv-host` (NEW — extension of venue or food landing) | `/partner/birthday/dashboard` (incoming `anniv_orders` queue, accept/decline) | NO QR — order-bound | `anniv_orders`, `anniv_order_extras` (existing) |
| 13 | Influencer / Content creator (sponsored content, V2) | `creator` *(NEW)* | `instagram` / `tiktok` / `youtube` / `twitch` | `/devenir-influenceur` + `/devenir-influenceur/candidature` (already exist as front-end only) | `/creator/dashboard` (NEW — sponsored-post tracker, payout, brief inbox) | NO QR | `creator_profiles`, `sponsored_posts`, `creator_engagement` (note: `feed_posts` extensions belong to teen creator economy, distinct from sponsored creators) |
| 14 | Ambassador (referral commission) | `ambassador` *(NEW role on `auth.users.app_metadata.role`, NOT on `partners`)* | `teen_ambassador` / `parent_ambassador` / `creator_ambassador` | `/devenir-ambassadeur` + `/devenir-ambassadeur/candidature` + `/devenir-ambassadeur/programme` (already exist as UI shells, backing tables MISSING — see §5/§7) | `/ambassador/dashboard` (already scaffolded, every visit currently redirects because `role='ambassador'` not in enum) | NO QR — referral attribution via `/join?ref=CODE` cookie + signup hook | `ambassadors`, `ambassador_referrals`, `ambassador_withdrawals`, `ambassador_redemptions`, `ambassador_rewards` |
| 15 | Marketplace seller (C2C) | NOT a `partners` row — uses teen's own `auth.users` with `seller_kyc_status='approved'` | n/a | `/marketplace/sell` (existing — needs KYC + AML cap gate added) | `/marketplace/my-listings` + `/marketplace/orders` (existing shells) | NO QR — escrow-bound order flow | `marketplace_listings`, `marketplace_orders`, `seller_kyc` |

### 1.1 Locked invariants on the taxonomy

- **`partner_type` is a CHECK enum**, not free text. Allowed values: `('retail','venue','club','education','food','driver','mentor','event_talent','event_organizer','creator')`. Anything else is rejected at insert time.
- `ambassador` and `marketplace_seller` are **NOT `partners` rows**. They are roles on `auth.users` with their own backing tables. This is locked to prevent the four-card wizard from owning them.
- `coach` and `teacher` are **NOT separate `partner_type` values**. They are `partner_staff.role` enum values inside an existing `club` or `education` partner. Self-onboarding paths (`/devenir-coach`, `/devenir-teacher`) DO exist — they create a candidate `partner_staff` row pending approval by the parent partner OR by Nivy admin if the candidate elects "match me with a club/centre".
- `birthday_host` is a **flag on existing venue/food partners**, not a new `partner_type`.
- Every archetype that has a public landing MUST also have a working credential pipeline (§2). No "Potemkin landing" is allowed (today: ambassador, influencer, DJ all leak this — see §5).

---

## 2. LOCKED — Prospect → Registered Partner Pipeline

**Single funnel, eight stages, no branches.** Every archetype follows it. The current dual-track failure (prospect form on one side, generic `/auth/sign-up` on the other, joined manually by ops) is **deprecated** (see §5).

```
[1 LANDING] → [2 WIZARD] → [3 ADMIN QUEUE] → [4 KYC UPLOAD] → [5 APPROVAL]
   → [6 AUTH USER PROVISIONED] → [7 ROLE GRANTED] → [8 FIRST-RUN DASHBOARD]
```

### Stage detail (LOCKED)

| # | Stage | URL / route | What runs | DB write | Exit condition |
|---|-------|------|-----------|----------|----------------|
| 1 | **Public landing** | `/devenir-{archetype}` | Marketing page; reads `partners` only to show "déjà candidat" banner if `auth.uid()` matches | none | CTA click → wizard |
| 2 | **Wizard** | `/devenir-{archetype}/inscription` (or shared `/devenir-partenaire/inscription?type=…` for the 4 legacy commerce types) | Multi-step zod form. Captures company info, contact, locations, proposed offers, **password (NEW — locked requirement)**, CGU acceptance. Does NOT create offers as `is_active=true` (see §6). | INSERT `partners (status='pending')` + INSERT type-specific child rows + INSERT `partner_offers (is_active=false, status='draft')`. **DOES NOT** call `supabase.auth.signUp` yet. | Submit success → `/devenir-{archetype}/merci?ref={partners.id}` |
| 3 | **Admin queue** | `/admin/partners?status=pending` | Admin reviews company info; can request KYC, approve, reject. | UPDATE `partners.status='in_review'` when admin opens; INSERT `admin_audit_logs` | Admin clicks "Demander KYC" → magic-link email to prospect → stage 4 |
| 4 | **KYC upload** | `/devenir-{archetype}/kyc?token={signed_jwt}` (NEW — does not require auth.users yet; uses signed link with 7-day TTL) | File uploader → private storage bucket `kyc-documents`. Required docs by type: see §3. | INSERT `partner_kyc_documents (status='submitted')` per file | All required docs uploaded → notify admin |
| 5 | **Admin approval** | `/admin/partners/[id]` | Admin reviews each `partner_kyc_documents` row, approves/rejects with notes. On full approval: triggers stage 6. | UPDATE `partner_kyc_documents.status='approved'` per row, then `partners.status='active'`, `partner_offers.status='approved' is_active=true` for the wizard-submitted offers, INSERT `admin_audit_logs` | All required docs `approved` AND admin clicks "Activer le partenaire" → stage 6 atomically |
| 6 | **Auth user provisioned** | server-side, atomic with stage 5 | `supabase.auth.admin.inviteUserByEmail(partners.email, { data: { partner_id, partner_type, role: 'partner' } })`. The temp password from stage 2 is set on the new user. Sends a "your partner account is active" email with magic link. | INSERT `auth.users` + INSERT `profiles (role='partner', partner_id=…)` | Email delivered |
| 7 | **Role granted** | server-side, same transaction as 6 | `auth.users.app_metadata.role='partner'` AND `auth.users.app_metadata.partner_id=partners.id` AND `auth.users.app_metadata.partner_type=partners.partner_type` AND `partner_staff (partner_id, user_id, role='owner', is_active=true)` row created. | INSERT `partner_staff (role='owner')` | Partner clicks email link → logs in |
| 8 | **First-run dashboard** | `/partner/{type}/dashboard` (or `/driver/dashboard`, `/mentor/dashboard`, `/creator/dashboard`, `/ambassador/dashboard` for non-`/partner/*` archetypes) | Shows onboarding checklist: connect bank (RIB), upload first 3 menu items / first offer, configure scanner device, invite staff. | none initial; user actions write per §4 | Checklist 100% → confetti, dashboard transitions to ops mode |

### 2.1 Hard invariants on the funnel

- **No `partners` row exists without a complete wizard submission.** Direct DB inserts are forbidden (see §6).
- **No partner can log in before stage 6.** Stages 1–5 use signed magic links for KYC upload, never a permanent auth user.
- **`partners.status='active'` ⇒ corresponding `auth.users` row + `partner_staff` owner row exists.** This is a referential invariant enforced by the stage-5 transaction. If the auth provisioning fails, the approval rolls back.
- **The wizard collects a password.** Today's wizard does not — locked change. The password is stored encrypted in a transient `partner_pending_credentials (partner_id, password_hash, expires_at)` table, consumed by stage 6, then deleted.
- **`/devenir-{archetype}/merci` is a real persisted reference, not a `crypto.randomUUID()` UI affordance.** Today's `/partenaires/merci` page is deprecated (see §5).

---

## 3. LOCKED — Canonical Tables

Six canonical partner tables. Everything else is type-specific child data (food, transport, mentorship, etc.) and lives in domain tables outside this taxonomy. The `partner_discounts` table that exists in production today is **deprecated** (see §5) — replaced by `partner_offers` with a richer schema.

### 3.1 `partners`

The single source of truth for a partner entity.

```sql
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  partner_type TEXT NOT NULL CHECK (partner_type IN
    ('retail','venue','club','education','food','driver','mentor','event_talent','event_organizer','creator')),
  sub_category TEXT,                     -- CHECK enforced per partner_type via trigger
  company_name TEXT NOT NULL,
  legal_form TEXT,                       -- 'sarl' | 'sa' | 'auto-entrepreneur' | 'individual'
  rc_number TEXT,                        -- Registre de Commerce
  ice_number TEXT,                       -- Identifiant Commun de l'Entreprise (Morocco)
  patente_number TEXT,
  cnss_number TEXT,
  rib TEXT,                              -- Bank RIB for payouts (encrypted at rest)
  phone TEXT,
  website TEXT,
  description TEXT,
  contact_person_name TEXT,
  contact_person_role TEXT,
  contact_person_phone TEXT,
  contact_person_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_review','active','rejected','suspended','offboarded')),
  commission_rate NUMERIC(5,2),          -- per-partner override; defaults from partner_type
  payout_method TEXT CHECK (payout_method IN ('bank_transfer','wafacash','m2t','cash_plus','manual')),
  accepts_birthday BOOLEAN DEFAULT FALSE,-- birthday-host flag (venue/food only)
  can_award_xp BOOLEAN DEFAULT FALSE,    -- flipped on by admin for club/education only
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 `partner_offers` (replaces `partner_discounts`)

Canonical offer ledger. One row per offer (discount, free item, BOGO, challenge entry, event ticket).

```sql
CREATE TABLE public.partner_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  offer_type TEXT NOT NULL CHECK (offer_type IN
    ('discount_percent','discount_amount','bogo','free_item','event_ticket','challenge_entry','menu_item','membership')),
  discount_value NUMERIC(8,2),           -- % if discount_percent, DH if discount_amount
  price_dh NUMERIC(8,2),
  price_coins INTEGER,
  min_vip_level TEXT CHECK (min_vip_level IN ('free','silver','gold','platinum')),
  min_purchase_amount NUMERIC(8,2),
  max_discount_amount NUMERIC(8,2),
  max_total_uses INTEGER,
  current_total_uses INTEGER DEFAULT 0,
  max_uses_per_user INTEGER,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  tags TEXT[],                           -- closed-set, validated against interest_taxonomy
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_approval','approved','rejected','paused','expired','archived')),
  is_active BOOLEAN NOT NULL DEFAULT FALSE, -- locked invariant: cannot be true unless status='approved'
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_from < valid_until),
  CHECK (NOT is_active OR status = 'approved')
);
```

### 3.3 `partner_locations`

One row per physical location. Required for archetypes 1–5, 11–12.

```sql
CREATE TABLE public.partner_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  label TEXT,                            -- 'Maarif HQ', 'Branch 2'
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  lat NUMERIC,
  lng NUMERIC,
  phone TEXT,
  open_hours JSONB,                      -- {mon:[{from:'09:00',to:'21:00'}], ...}
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.4 `partner_kyc_documents`

KYC document ledger. Renamed from the existing `kyc_documents` for namespace clarity (the existing table can be migrated in place — it already carries the same columns).

```sql
CREATE TABLE public.partner_kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN
    ('rc','ice','patente','cnss','statuts','pouvoir','cin','passport','rib','attestation_assurance',
     'permis_conduire','carte_grise','assurance_vehicule','casier_judiciaire','diplome','licence_federale',
     'declaration_micro_entreprise','attestation_halal','autorisation_municipale')),
  file_path TEXT NOT NULL,               -- private bucket 'kyc-documents'
  file_hash TEXT,                        -- sha256 for tamper detection
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','under_review','approved','rejected','expired')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  expires_at DATE,                       -- e.g. casier judiciaire valid 3 months
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Required docs per `partner_type`:**

| `partner_type` | Mandatory | Optional |
|----------------|-----------|----------|
| `retail` / `venue` / `food` / `event_organizer` | rc, ice, patente, cin (representative), rib | statuts, pouvoir, autorisation_municipale, attestation_halal (food) |
| `club` / `education` | rc, ice, cin, rib, casier_judiciaire (every staff with `role IN ('coach','teacher')`) | licence_federale (club), diplome (education), attestation_assurance |
| `driver` | cin, permis_conduire, carte_grise, assurance_vehicule, casier_judiciaire, rib | declaration_micro_entreprise |
| `mentor` | cin, casier_judiciaire, diplome (or proof of expertise), rib (if paid) | passport, references |
| `event_talent` (DJ) | cin, rib | demos, contracts |
| `creator` | cin, rib | media kit |

### 3.5 `partner_payouts`

Monthly payout ledger. Materialized by cron.

```sql
CREATE TABLE public.partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_dh NUMERIC(12,2) NOT NULL,
  commission_dh NUMERIC(12,2) NOT NULL,
  refunds_dh NUMERIC(12,2) DEFAULT 0,
  net_dh NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','processing','paid','failed','disputed')),
  payout_method TEXT,
  external_ref TEXT,                     -- bank txn id / wafacash ref
  paid_at TIMESTAMPTZ,
  invoice_id UUID,                       -- FK to partner_invoices when generated
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (partner_id, period_start, period_end)
);
```

### 3.6 `partner_staff`

Authenticated humans that work for a partner. Owner, generic staff, coach, teacher are the four roles.

```sql
CREATE TABLE public.partner_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('owner','staff','coach','teacher','manager')),
  display_name TEXT,
  permissions JSONB,                     -- {can_award_xp:bool, can_payout:bool, can_manage_staff:bool}
  cin_url TEXT,                          -- private bucket
  casier_judiciaire_url TEXT,            -- private bucket; mandatory for coach/teacher
  is_active BOOLEAN DEFAULT TRUE,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (partner_id, user_id)
);
```

### 3.7 Adjacent canonical tables (referenced, not owned by partner core)

- `partner_transactions` — ledger of every scanner-driven redemption. One row per `apply-discount` success. Sums into `partner_payouts`.
- `partner_invoices` — generated by trigger on `partner_payouts.status='paid'`. PDF rendered on demand.
- `partner_xp_awards` — coach/teacher XP grants (see whitepaper §9 spec already in `teacher-coach-xp.md`).
- `support_tickets` — shared with all roles, scoped by `requester_user_id`.

### 3.8 Deprecated table mapping

| Live today | LOCKED canonical | Migration |
|------------|------------------|-----------|
| `partner_discounts` | `partner_offers` | DROP after data copy; create `partner_discounts` as a backwards-compat VIEW selecting from `partner_offers WHERE offer_type IN ('discount_percent','discount_amount')` until all callers migrated, then drop the view. |
| `kyc_documents` | `partner_kyc_documents` | RENAME (alias the old name as a view for one release). |
| `dj_applications` (referenced in C3 audit, possibly never created) | `partner_staff` (with `partner_type='event_talent'`) + `dj_profiles` | Re-shape candidatures into a real partners row. |

---

## 4. LOCKED — Canonical APIs (Partner Ops)

The following endpoints are the **only** routes that mutate partner state. All other routes are deprecated (see §5).

### 4.1 Offers

- `POST /api/partner/offers/create`
  - **Auth**: `auth.users.app_metadata.role='partner'` AND `partner_staff` row with `is_active=true` AND `partners.status='active'`.
  - **Body**: zod-validated `{ title, description, offer_type, discount_value?, price_dh?, price_coins?, valid_from, valid_until, tags[], min_vip_level?, max_total_uses?, max_uses_per_user? }`.
  - **Effect**: INSERT `partner_offers (status='pending_approval', is_active=false)`. Enqueues moderation. **Locked: NEVER `is_active=true` on create.**
  - **Returns**: `{ offer_id, status:'pending_approval' }`.

- `PATCH /api/partner/offers/[id]/edit`
  - **Auth**: same + `partner_staff.permissions.can_manage_offers OR role='owner'`.
  - **Body**: subset of create body. Editing an `approved` offer reverts it to `pending_approval` if material fields change (`discount_value`, `offer_type`, `min_purchase_amount`).
  - **Effect**: UPDATE `partner_offers`.

- `POST /api/partner/offers/[id]/toggle`
  - **Auth**: same.
  - **Body**: `{ active: boolean }`.
  - **Effect**: UPDATE `partner_offers SET status='paused'` (if false) or back to `approved` (if true and was paused). **Locked: cannot move from `pending_approval` to `approved` via this endpoint** — only admin moderation can do that.

- `POST /api/admin/partners/offers/[id]/decision`
  - **Auth**: admin only.
  - **Body**: `{ decision: 'approved'|'rejected', reason?: string }`.
  - **Effect**: UPDATE `partner_offers SET status=…, is_active=(decision='approved'), approved_by=auth.uid()`. INSERT `admin_audit_logs`. Notify partner.

### 4.2 Scanner / Redemption (apply-discount canonical)

- `POST /api/partner/scanner/apply`
  - **Auth**: `partner_staff` row with `is_active=true` AND `partners.status='active'`.
  - **Body**: `{ qr_payload: string, offer_id: UUID, idempotency_key: UUID }`.
  - **Locked QR format**: `nivy:v1:{user_id}:{card_number}:{exp_unix}:{nonce}:{hmac_sha256}` — signed server-side at issuance, single-use within `[now, exp]` (max 60s lifetime), nonce stored in `qr_nonces` table to block replay.
  - **Effect (atomic, RPC `apply_partner_offer`)**:
    1. Verify HMAC against server secret; reject if invalid.
    2. Verify `exp_unix > now()`; reject if expired.
    3. Verify `nonce` not in `qr_nonces`; INSERT to mark consumed.
    4. Look up `vip_cards.user_id`; verify match.
    5. Look up `partner_offers WHERE id=offer_id AND partner_id=auth.partner_id AND is_active=true`.
    6. Atomic check-and-increment `current_total_uses` against `max_total_uses` via row lock.
    7. Atomic check `discount_usage` count against `max_uses_per_user` (NOT a try/catch — hard fail if table unavailable).
    8. INSERT `discount_usage`, `partner_transactions` (with `idempotency_key` UNIQUE).
    9. RPC `add_xp_to_user` (cashback) + `award_loyalty_points` (per VIP tier).
  - **Returns**: `{ success, transaction_id, xp_awarded, points_awarded, savings_dh }`.
  - **Locked: idempotency_key MUST be UNIQUE on partner_transactions. Double-click cannot double-credit.**

### 4.3 Payouts

- `GET /api/partner/payouts/list` — read-only; current month + last 12 months.
- `POST /api/partner/payouts/request`
  - **Auth**: `partner_staff.role='owner' OR permissions.can_payout=true`.
  - **Body**: `{ period_start, period_end }` (must be a closed past period with `status='pending'` row).
  - **Effect**: UPDATE `partner_payouts SET status='approved', requested_at=now()` if eligible. Cron / ops then move to `processing` → `paid`.
  - **Returns**: `{ payout_id, net_dh, eta }`.
- `POST /api/cron/partner-payout-monthly` — existing cron, locked to materialize `partner_payouts (status='pending')` on the 1st of each month.

### 4.4 Staff

- `POST /api/partner/staff/invite` — owner-only. `{ email, role, permissions }` → emails magic link → on accept INSERT `partner_staff`.
- `POST /api/partner/staff/[id]/deactivate` — owner-only. Soft delete (`is_active=false`).

### 4.5 Awards (coach/teacher only)

- `POST /api/partner/awards/grant`
  - **Auth**: `partner_staff.role IN ('coach','teacher')` AND `partners.can_award_xp=true`.
  - **Body**: `{ teen_id, amount_xp, category: 'school'|'sport'|'crea', reason, evidence_url }`.
  - **Effect**: enforces per-teen-per-week cap (default 500 XP/teen/week/awarder), INSERT `partner_xp_awards`, queues parent notification, on auto-approve window expiry RPC `add_xp_to_user`.

### 4.6 KYC

- `POST /api/partner/kyc/upload` — multipart upload to `kyc-documents` private bucket. Either authenticated partner OR signed token from stage-4 magic link. INSERT `partner_kyc_documents (status='submitted')`.
- `POST /api/admin/partners/kyc/[doc_id]/decision` — admin approve/reject.

### 4.7 Onboarding (the locked single funnel of §2)

- `POST /api/partners/wizard/submit` (replaces `/api/partners/register` — see §5)
  - **Body**: full wizard payload + chosen password.
  - **Effect**: INSERT `partners (status='pending')` + child rows + INSERT `partner_pending_credentials`. Does NOT create `auth.users`.
- `POST /api/admin/partners/[id]/activate`
  - **Auth**: admin.
  - **Effect**: ATOMIC — verifies all required `partner_kyc_documents.status='approved'`, calls `supabase.auth.admin.createUser()` with the pending password, INSERT `profiles (role='partner')`, INSERT `partner_staff (role='owner')`, UPDATE `partners.status='active'`, DELETE `partner_pending_credentials`, send activation email. Rollback on any failure.

---

## 5. DEPRECATED Surfaces

These exist today and MUST be removed or rewritten. Each entry: what's wrong, what replaces it.

| # | Deprecated | Why | Replacement |
|---|------------|-----|-------------|
| D1 | **`POST /api/partners/register`** | Inserts `partners` without creating `auth.users`. Partner cannot log in. Single most critical defect (see B3 §3.2, E5 §2). | `POST /api/partners/wizard/submit` (§4.7) — submit only; activation creates the auth user atomically at admin approval. |
| D2 | **`/partner/settings`** | Hardcoded mock — uncontrolled inputs, "Sauvegarder" is no-op (file header openly admits it). Every partner sees "Ma Boutique" / "Boutique de vêtements et accessoires tendance pour adolescents." (B3 §2 row 9). | New `/partner/settings` wired to `partners` row with RLS-bound RHF + zod, server action persists. Per-type extension panels (food: kitchen hours; club: class schedule; etc.). |
| D3 | **`/partenaires/merci` with `crypto.randomUUID()` UI ref** | The reference shown is generated client-side post-mount, not persisted. It is a placebo. | `/devenir-{archetype}/merci?ref={partners.id}` reading the persisted application id and displaying admin contact + KYC next-step instructions. |
| D4 | **`partner_discounts` table** | Schema mismatch — APIs read `discount_name, discount_type, discount_value, …` columns that don't exist; live table has only 7 fields (`partner-network.md` §3). | `partner_offers` (§3.2). View shim during migration. |
| D5 | **`components/partner/universal-scanner.tsx` (mock)** | Hardcoded "Youssef Benali", `text.startsWith('TICKET:'/'PAY:')` parsing, no API call (`partner-network.md` §2). Embedded in `/partner/dashboard`. | Single canonical scanner: `app/partner/scanner/page.tsx` wired to `POST /api/partner/scanner/apply` (§4.2). Mock to be deleted. |
| D6 | **Duplicate `/partner` and `/partner/dashboard` routes** | Two pages, overlapping KPIs, inconsistent reads (B3 §1.2, §4.1). | Merge into `/partner` (root) only. `/partner/dashboard` redirects to `/partner`. |
| D7 | **Generic `/auth/sign-up` for partner role** | No role selector; every signup is parent (B3 §3.1). Partners cannot self-register an account. | Partner accounts are NEVER created via `/auth/sign-up`. They are provisioned only via the wizard funnel (§2 stage 6). The navbar "S'inscrire" does NOT route partners — partners click "Devenir partenaire" instead. |
| D8 | **`is_hidden` boolean for offer/post lifecycle** | Conflates moderator-removed, creator-unpublished, auto-hidden, soft-deleted (`content-creator-economy.md` §4). | `status` enum on `partner_offers` (§3.2). `is_active` is a derived flag that cannot diverge from `status='approved'`. |
| D9 | **`gamification-system/database/migrations/019_social_sharing.sql` `TPM`-prefixed referral codes** | Legacy "Teens Party Morocco" naming, isolated from cash ambassador flow, 0 usage (`ambassador-referral.md` §2-§3). | Single `ambassadors` + `ambassador_referrals` schema (§7 missing). Consolidate the XP-only and DH-cash referral stacks into one. |
| D10 | **`/partner/restaurant/{menu,orders}` URL namespace** | Built but unreachable from sidebar (B3 §1.2, §4.1). Naming uses `restaurant` while the locked taxonomy uses `partner_type='food'`. | Move to `/partner/food/{menu,orders,dashboard}`; add to type-aware sidebar. |
| D11 | **`PARTNER_ACTIVE_STATUSES = {active, verified, approved}` synonym set** | Three statuses doing one job (`partner-network.md` §2). | LOCKED: `status='active'` is the only "live" value. `verified` and `approved` are forbidden. |

---

## 6. FORBIDDEN Patterns

Any code matching these patterns MUST fail review.

| # | Pattern | Why forbidden | Detection signal |
|---|---------|---------------|------------------|
| F1 | INSERT into `partners` without a corresponding `auth.users` row reachable in the same transaction OR a `partner_pending_credentials` row staged for stage-6 activation. | Creates orphan partners that cannot log in (the current production defect). | Any direct `partners` insert outside `/api/partners/wizard/submit` or `/api/admin/partners/[id]/activate`. |
| F2 | Scanner endpoints (`apply-discount`, `verify-card`, `check-in`) accepting QR payloads without HMAC signature verification, expiry check, or nonce single-use enforcement. | Static QR is replayable indefinitely (E5 §5). Any leaked screenshot drains offers. | Absence of `qr_nonces` write or HMAC verify in apply path. |
| F3 | `INSERT INTO partner_offers (..., is_active=true)` directly on offer creation. | Bypasses moderation (E5 §4 — current `/api/partner/offers` does this). | Grep for `is_active: true` in offer create code. CHECK constraint `NOT is_active OR status='approved'` is the DB-level guardrail. |
| F4 | Sidebar items rendered without per-`partner_type` filtering. | Today's flat 8-item list shows the same links to all types (B3 §1.1) — restaurant partners can't see menu/orders, retail partners see "Events" they can't use. | Sidebar component without `partner_type` switch. |
| F5 | Pages accessible only by direct URL, not linked from navigation. | Five working pages today are orphaned (`restaurant/menu`, `restaurant/orders`, `kyc`, `payouts`, `invoices`) (B3 §1.2). | Cross-check `app/partner/**/page.tsx` against `components/dashboard/partner/sidebar.tsx`; any page with no inbound nav link is forbidden. |
| F6 | Try/catch around `discount_usage` write that "silently skips when missing". | Permits double-spend (E5 §5 — current code does this). | Grep for `// discount_usage missing` or analogous defensive comments. |
| F7 | Non-atomic counter increments (`SET current_total_uses = (offer.current_total_uses || 0) + 1`). | Race-prone (E5 §5). | Any RMW pattern on counter columns; must be RPC-driven `UPDATE … RETURNING` with row lock. |
| F8 | `validated_by` on `teen_grades` set to a `parent` user id when source is teacher action. | Inverts the trust model — teachers MUST be the validator, parents only veto (`teacher-coach-xp.md` §3). | Code paths that resolve `validated_by = parent.user.id` when the actor is a teacher. |
| F9 | Mentor-mentee chat outside `[T-30min, T+duration+30min]`. | Off-platform DM is the highest-risk T&S surface (`mentorship-career.md` §6). | Chat API not gating on session window. |
| F10 | Driver pool dispatching a ride to a `nivy_drivers` row whose `kyc_status != 'approved'`. | Single bad-actor driver is reputationally fatal (`transport-mobility.md` §4). | Dispatch endpoint missing `WHERE kyc_status='approved' AND is_active=true`. |
| F11 | Ambassador referral attribution without a verified `/join?ref=CODE` cookie set at signup. | Today's links 404 (`ambassador-referral.md` §4). Attribution can't fire. | `share-buttons.tsx` link without a corresponding `app/join/route.ts` handler that drops the cookie. |
| F12 | Partner KYC document URLs served as public storage paths or via long-lived signed URLs (>15 min). | PII (CIN, casier judiciaire) (`mentorship-career.md` §6, `partner-network.md` recos). | Signed URLs with TTL > 900s; public bucket policy for `kyc-documents`. |
| F13 | Featured-post / "boost" actions executed by a single moderator without an audit row. | Moderator capture risk on a 500 XP + 200 coin lever (`content-creator-economy.md` §4). | `feed_posts.featured=true` UPDATE without paired `featured_audit_log` row. |

---

## 7. MISSING Surfaces

These do not exist today and MUST be built. Listed in the order of stage they support in §2 + §1.

### 7.1 Public landings (stage 1)

- **`/devenir-restaurant`** — landing for `partner_type='food'`. Card 5 in `/devenir-partenaire`. (E5 §1, food-delivery-restaurants.md §3.)
- **`/devenir-driver`** — landing for `partner_type='driver'`. (transport-mobility.md §6.)
- **`/devenir-mentor`** + **`/devenir-mentor/candidature`** — landing + apply form (mentorship-career.md §6; `/api/mentor/apply` exists).
- **`/devenir-coach`**, **`/devenir-teacher`** — sub-role landings; either join existing club/centre by code or self-apply for matching.
- **`/devenir-organisateur`** — event organizer landing.
- **`/devenir-anniv-host`** — birthday-host extension landing (or a checkbox inside venue/food wizard with its own marketing page).
- **`/devenir-dj`** — rename/upgrade existing `/djs/candidature`.

### 7.2 KYC capture UI (stage 4)

- **`/devenir-{archetype}/kyc?token=…`** — signed-link KYC uploader. Today no partner-side upload UI exists anywhere (E5 §3). Reuses `kyc-documents` bucket, writes `partner_kyc_documents`.
- **`/partner/kyc/upload`** — post-activation supplementary upload (renew expiring docs).

### 7.3 Type-aware partner workspace (stage 8)

- **`/partner/{retail|venue|club|education|food|event_organizer}/dashboard`** — replaces today's generic `/partner/dashboard`. Per-type KPIs (C3 §4 #8).
- **`/driver/dashboard`** + **`/driver/rides`** + **`/driver/earnings`** + **`/driver/profile`** — full new workspace; today the API exists but the surface does not (C3 §1 row 6).
- **`/mentor/dashboard`** — exists, but adds `/mentor/availability`, `/mentor/strikes` (read-only).
- **`/creator/dashboard`** — for `partner_type='creator'`; today nothing exists post-login.
- **`/ambassador/dashboard`** — chrome exists but redirects because role missing; locked role addition + backing tables.
- **`/partner/awards`** — coach/teacher XP-grant UI (whitepaper §9 — explicitly specified, 0% built).
- **`/partner/staff`** — partner staff manager (invite, role assignment, deactivate). 0% built (B3 §1.3).
- **`/partner/birthday`** — incoming `anniv_orders` queue for venue/food partners flagged `accepts_birthday=true` (C3 §4 row 14).
- **`/partner/events/new`** + **`/partner/events/[id]`** — event-organizer create + edit. Today list-only (C3 §4 #6).
- **`/partner/payouts/request`** — payout-request button (E5 §6 — currently NO request mechanism, partners wait for cron).
- **`/partner/food/{menu,orders,dashboard}`** — restaurant workspace (renamed from `/partner/restaurant`), wired into sidebar.

### 7.4 Cross-cutting

- **Partner-card primitive** (`components/partner/partner-card.tsx`) — shared across `/teen/offres`, `/teen/food`, `/teen/mentors`, `/teen/partenaires` (proposed new directory).
- **`/teen/partenaires`** — unified teen-side directory; today partners are only browsable via offer-keyed, restaurant-keyed, or mentor-keyed surfaces (C3 §4 #9).
- **Type-aware sidebar** (`components/dashboard/partner/sidebar.tsx`) — accepts `partner_type` prop, shows the right links per archetype.
- **Invoice PDF generator** (`/api/partner/invoices/[id]/pdf`) — today partners are told to "ask support" (E5 §6).

### 7.5 Moderation + safety

- **`/admin/creator-moderation`** — feed-post + sponsored-post queue distinct from generic `moderation_queue` (content-creator-economy.md §3).
- **`featured_audit_log`** table + UI surface — F13 enforcement.
- **Driver KYC review queue** at `/admin/drivers` — partial today, needs the full form per `nivy_drivers.kyc_status`.

---

## 8. UNRESOLVED Founder Decisions (Recommendations)

Each item has a default recommendation; founder must ratify. Not locking these means the spec drifts.

### 8.1 Is `driver` a partner archetype, or its own role?

- **Tension**: drivers share the partner mental model (KYC, payout, scanner-ish workspace) but their primitives (rides, tracks, geo-fence) and risk profile (vehicle insurance, road incidents) are entirely separate. Every other partner sells goods/sessions; drivers sell ride-time.
- **Recommendation (LOCKED above as default):** `partner_type='driver'` AND `auth.users.app_metadata.role='driver'`, with workspace at **`/driver/*`** (NOT `/partner/*`). Reason: shared `partners` table simplifies KYC/payout reuse, but the dashboard is too different (live map, accept/reject ride card, earnings per ride) to share `/partner/*` chrome. The role split lets the sidebar/dock be entirely independent.
- **Founder call needed**: ratify the dual role+partner_type stance, or split them entirely (drivers leave `partners` and live in `nivy_drivers` only).

### 8.2 Coach / teacher: separate signup or extend mentor?

- **Tension**: a coach is closer to a mentor (adult-to-teen sustained relationship, certification, XP-issuing) than to a club commercial entity. But they work *for* a club. A teacher is similar inside an education centre.
- **Recommendation (LOCKED above as default):** coach and teacher are `partner_staff.role` values inside a `club`/`education` partner. They get a dedicated landing (`/devenir-coach`, `/devenir-teacher`) that produces a `partner_staff` row tied to either (a) an existing partner via invite code, or (b) a new pending `partners` row if the candidate is solo (e.g. independent tutor). They do **NOT** become `partner_type='mentor'` — mentor is reserved for the career/hobby advisory role with monthly cadence.
- **Founder call needed**: confirm coaches/teachers are NEVER mentors and vice versa, or unify all three under a single "certified human" archetype with a sub-discriminator. The two models are incompatible long-term — pick one.

### 8.3 Influencer == Ambassador?

- **Tension**: both refer/promote, but on different levers. Ambassadors earn cash commission per filleul purchase. Influencers earn fees per sponsored post / view (V2). Both can be teens.
- **Recommendation (LOCKED above as default):** they are **distinct**. `ambassador` is a `auth.users` role with `ambassadors` row (referral economy). `creator`/`influencer` is `partner_type='creator'` (sponsored content economy). They *can* coexist on the same human (an ambassador with high reach gets upgraded to influencer status and signs sponsored briefs). The `/devenir-ambassadeur` and `/devenir-influenceur` flows stay separate.
- **Founder call needed**: ratify the split, or merge into a single "creator economy" track with an internal flag.

### 8.4 Who creates the partner's `auth.users` and when?

- **Tension**: stage 6 of §2 says "admin activates → atomic create auth user with the password collected at stage 2". Alternative: send `inviteUserByEmail` and let partner set password later (no transient `partner_pending_credentials` table needed).
- **Recommendation:** keep password collection at stage 2 (better UX continuity — partner already typed it and can log in immediately on activation), with the transient table. The invite-email model adds a 4th friction point in an already long funnel (§2).
- **Founder call needed**: pick stage-2-password vs invite-email.

### 8.5 Aggregator vs own driver pool — which goes first?

- **Tension**: aggregator (Careem/Heetch) ships fast but with thin margins and unverified drivers. Own pool is the wedge (parent-trust) but takes 3+ months to recruit.
- **Recommendation (per transport-mobility.md §6):** ship Nivy partner pool first in Casablanca (M0–M3), aggregator as overflow in M4. Lock the API surface `provider TEXT CHECK IN ('careem','heetch','nivy_partner','public_transport')` from day 1 so the adapter slot exists.
- **Founder call needed**: ratify Casa-first own-pool sequencing.

### 8.6 Who pays the mentor / coach / teacher?

- **Tension**: three plausible compensation models — teen wallet (paid sessions), Nivy subsidy pool (free for low-tier families), partner-club-funded (coach paid by club, Nivy is top-of-funnel).
- **Recommendation:** mixed. Free intro session always; then mentor/coach picks per-session rate (paid = teen wallet) OR opts into volunteer track (XP-only, Nivy boosts visibility). Teachers in `education` partners default to club-funded.
- **Founder call needed**: ratify the mixed model and the subsidy budget per teen tier.

### 8.7 Should `partners.commission_rate` be per-partner-type default or per-partner override?

- **Tension**: whitepaper §9 specifies per-type defaults (retail 8%, venue 10%, club 12%, education 15%) but says "can be overridden per partner". Need to lock the default source and the override authority.
- **Recommendation:** defaults live in `partner_type_settings (partner_type, default_commission_rate)`. Override only by admin at activation time (stage 5). Renegotiation requires admin re-approval. Partner cannot self-edit.
- **Founder call needed**: ratify defaults + override authority.

### 8.8 First mentor session: parent-attended OR parent-watching-recording?

- **Tension**: `mentorship-career.md` §6 says "ALWAYS parent-attended". But that kills mentor scheduling (parent must clear the calendar slot too). Alternative: session is recorded with consent disclosure on screen, parent watches the recording within 24h.
- **Recommendation:** for first session, keep parent-attended as a **policy default** but allow parent opt-out → recording-watch-required-within-24h (else mentor is auto-paused). This preserves safety while removing the worst friction point.
- **Founder call needed**: ratify the opt-out clause or hold the strict default.

### 8.9 Marketplace seller — partner or teen-with-flag?

- **Tension**: locked above as "teen-with-flag" (§1 row 15). But sellers need RIB, KYC for AML — that looks like a partner. The split is fragile.
- **Recommendation (LOCKED above as default):** keep them as teens with `seller_kyc_status` because the social graph, the parental approvals, and the wallet are teen-bound. Adding them to `partners` would require new policy for teen-as-partner everywhere.
- **Founder call needed**: ratify, or accept the "teen-as-partner" complexity.

---

## Contradictions flagged across vision docs

| Contradiction | Source A | Source B | Locked resolution |
|---------------|----------|----------|-------------------|
| `food` is its own `partner_type` vs `food` is `venue.sub_category='restaurant'` | `food-delivery-restaurants.md` §SPEC says "extend the switch" with new `partner_type='food'` | Same doc says "Within partner_type='venue' or new partner_type='food'" — ambiguous | LOCKED: `partner_type='food'` (own value), with `sub_category` enum for restaurant/cafe/bakery/catering/grocery/dark_kitchen. |
| Three statuses for "active" (`active`, `verified`, `approved`) | `app/partner/page.tsx` `PARTNER_ACTIVE_STATUSES` | `partner-network.md` §3 flags ambiguity | LOCKED: only `active` is alive. Forbidden to use `verified` or `approved`. |
| Commission % (10 vs 15 vs per-partner) | `/devenir-ambassadeur` page advertises 10% | `app/ambassador/page.tsx` hardcodes 15 | LOCKED: per-ambassador rate stored on `ambassadors.commission_rate`, defaulting to 10% (matches public marketing). Tier upgrades raise it. |
| Cash-out threshold (100 DH vs 500 DH) | `/api/ambassador/withdrawals` enforces 100 DH | Public landing advertises 500 DH | LOCKED: 500 DH (matches the marketing promise). API min raised to 500. |
| `dj_applications` vs `partner_staff` for DJ candidatures | C3 audit notes `dj_applications` not in DB grep | Locked taxonomy puts DJs in `partner_type='event_talent'` with `partner_staff` | LOCKED: `dj_applications` is a candidature stash that maps directly into the wizard funnel; its rows must be migrated to `partners (partner_type='event_talent')` + `partner_staff (role='owner')`. |
| `partner_xp_awards` cap source | Whitepaper §9: "Coach/teacher XP awards capped (DEFAULT 500 XP / teen / week / awarder)" | `teacher-coach-xp.md` recos: per-staff daily cap | LOCKED: both apply — per-teen-per-week 500 XP from any single awarder + per-staff daily aggregate (configurable per partner). RPC enforces both. |

---

*End of LOCKED canonical spec. Read-only. Any deviation requires a new `docs/canon/*.locked.md` superseding section, signed off by founder.*
