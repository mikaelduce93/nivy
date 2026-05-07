# Mentorship & Career Exploration — Vision

> Status: **GREENFIELD** (concept-only). No `mentors`, `mentor_sessions`, `career_pathways`, `internships`, or `internship_applications` tables exist live (verified via `information_schema.tables` on project `imchornjvmgmaovhypco`). Adjacent live infrastructure: `passion_paths` (5 rows seeded, 0 levels), `passion_path_levels` (0), `teen_passion_path_progress` (0), `passion_tutorials` (0). The Pilier CREA migration `gamification-system/database/migrations/022_pillars_system.sql:427-520` defines the passion-path data model but is not the same surface as career mentorship — it covers hobby skill ladders (dance, music, art, tech, writing, photography, video, fashion, cooking, diy), not adult-to-teen advisory or internships.

---

## 1. Why this exists (the gap)

Nivy already has two **platform-funded XP-awarder** roles for teens:

- **Coaches** — sport instruction, paid by clubs / Nivy subsidy, formal sessions (`docs/vision/teacher-coach-xp.md`).
- **Teachers** — academic tutoring, paid by parents / school partnerships, structured curriculum.

Both roles are **transactional** (book → attend → XP/coins → repeat). What is missing is the **advisory, career-exploration relationship**: the older teen / young adult who has already walked the path the mentee wants to walk. A 24-year-old médecine résident telling a 13-year-old "here is what bac S looks like, here is what concours d'entrée demands, here is what an external rotation feels like" is not a coach and not a teacher — it is a **mentor**, and the relationship is half-vocational, half-emotional, low-frequency, high-stakes.

Career exploration extends that: shadowing days at partner companies, alumni Q&A panels, recruiter open days, summer internships at hospitals / agencies / start-ups. A teen who declares "je veux être médecin" should land in a **pathway** that bundles (a) curated quizzes, (b) matched mentors, (c) hospital partner shadowing, (d) skill-assessment milestones, (e) an application portfolio assembled from creator-economy outputs + grades + DeFi history.

---

## 2. The third role: Mentor (vs Coach vs Teacher)

| Axis | Coach | Teacher | **Mentor** |
|------|-------|---------|-----------|
| Domain | sport | academic subject | **career, hobby, life** |
| Age | 25+ adult | 25+ adult | **17+ teen or 18-25 young adult** |
| Cadence | weekly drills | weekly lessons | **monthly check-ins, ad-hoc Q&A** |
| Pay model | club / Nivy subsidy | parents / partner | **mixed: free intro + paid hourly OR XP-only OR Nivy-subsidised** |
| Formality | structured plan | curriculum | **advisory, conversational** |
| KYC | CIN + cert | CIN + diploma | **CIN + clean police record + reference call** |
| Risk profile | medium (physical) | low | **HIGH (adult-teen DM relationship)** |

The risk profile is the dominant design constraint. Mentors are the **only** Nivy role where an unrelated adult/young-adult can have a sustained 1-to-1 relationship with a minor outside a public class setting. Trust & safety must be over-engineered (see §6).

### Mentor archetypes
- **Career mentor** — med student → 13yo aspiring doctor; software engineer at OCP → 15yo who codes.
- **Sport mentor** — semi-pro Raja player → 14yo on club team (different from coach: post-training advice, mindset, scout exposure).
- **Hobby/passion mentor** — a published illustrator → 12yo who fills sketchbooks; a Berklee-attending oudist → 13yo musician.
- **Older-sibling mentor** — 19yo bac-grad → 16yo navigating bac S choice (less domain-specific, more meta).

---

## 3. Career exploration surface

Three concentric rings around a teen's declared interest:

1. **Discover** — quizzes (`recommend_for_teen('quiz')`), open-day events, alumni panels at partner companies. Low commitment, browse-and-bookmark.
2. **Shadow** — 1-day hospital / agency / studio shadowing organised through `partners` table. Medium commitment, parental consent required, age-gated.
3. **Intern** — 1-week → 2-weeks → summer → part-time school-year internships at vetted partners. Highest commitment, application-based, parental consent + (in MA) labour-law check for under-16s.

Pathways stitch these rings together: declaring "Médecine" auto-surfaces medical mentors, hospital partner shadowing slots, anatomy/biology quizzes, and milestones like "shadowed an ER for 1 day", "completed 5 anatomy quizzes 80%+", "interviewed a med student".

---

## 4. Personalization hook (§19.5 reuse)

`recommend_for_teen()` already exists per `docs/vision/personalization-engine.md`. Three new flavours:

- `recommend_for_teen('mentor')` — rank by `expertise_tags ∩ teen.interest_tags`, age-fit (`age_min_mentee ≤ teen.age ≤ age_max_mentee`), city/locale, language, rating, sessions_count, Nivy-trust-score.
- `recommend_for_teen('internship')` — rank by city, `age_min/age_max` fit, declared pathway match, partner reputation, application deadline urgency.
- `recommend_for_teen('pathway')` — when `teen_affinity_scores` (from `lib/ai/interest-integration.ts`) shows a strong cluster (e.g. high `bio` + `chem` + `volunteering` quiz scores), auto-suggest the Médecine pathway with a soft-CTA, never auto-enrolling.

---

## 5. Integration with existing systems

- **Coins economy** — paid mentor sessions debit teen wallet; first session always free; Nivy can subsidise N free sessions/month for low-tier families. Stipend internships credit wallet on milestone.
- **XP / pillars** — completing pathway milestones grants XP into the relevant pillar (Médecine → Académie pillar; Football mentor → Sport pillar). Reuse `gamification-system/features/pillars/actions.ts`.
- **Parental authorizations** — every mentor session and internship application MUST go through the `parental_authorizations` flow defined in `docs/vision/parental-authorizations.md`. Booking/applying without consent is rejected at the API layer.
- **Passion paths (live)** — the existing `passion_paths` (5 rows: 10 categories planned) become the **hobby leg** of pathways. Career pathways are a separate, parallel structure (`career_pathways`) — they reference passion paths but are not subsumed by them. A "Médecine" pathway recommends a Sciences passion-path AND medical mentors AND hospital shadowing.
- **Creator economy** — application portfolio auto-pulls best `teen_creations` (illustration internships), top quiz scores, public sport records, and DeFi savings history (proof of executive function).
- **Ambassador program** — graduating mentees can become mentors at 17+ via the existing `ambassador-application-form.tsx` pipeline, extended.

---

## 6. Trust & safety (the load-bearing section)

Adult-to-teen 1-to-1 is the highest-risk surface on Nivy. Non-negotiable controls:

- **Mentor onboarding** — CIN scan + selfie + clean criminal-record extract (extrait de casier judiciaire) + 2 reference calls + intro video review by admin.
- **Tier system** — `pending` → `intro_only` (parent-attended free sessions only) → `active` (paid sessions allowed, all logged) → `paused` / `suspended` / `banned`.
- **First session** — ALWAYS free, ALWAYS parent-attended (joins the call), ALWAYS recorded with consent disclosure on screen. No exceptions.
- **Recording & transcript** — every session logged (`mentor_sessions.meeting_url` + recording stored 90 days, transcript retained indefinitely for audit). Mentee parent has on-demand access.
- **No off-platform DMs** — mentor cannot message mentee outside the scheduled session window (T-30min → T+30min). All chat goes through Nivy and is moderated by `lib/server/ai-safety/*` (see `docs/vision/ai-safety-teen-welfare.md`).
- **Age-appropriate matching** — default `age_min_mentee = mentor.age - 5`, `age_max_mentee = mentor.age - 1`. A 25yo cannot mentor a 13yo without explicit parent override and admin approval, and only for hobby/group format.
- **3-strike + permanent ban** — any flagged behaviour (inappropriate language, off-platform contact attempt, unconsented physical meeting suggestion) triggers strike. 3 strikes → permanent ban + report to authorities for criminal-grade misconduct.
- **Reporting** — one-tap report button in session UI for mentee AND parent. SLA: admin review within 4 business hours.
- **Liability** — Nivy's role is platform + KYC; mentors sign a code of conduct + liability waiver; insurance product to evaluate (open question).

---

## SPEC

### Data contract

```sql
public.mentors (
  id UUID PK, user_id UUID UNIQUE REFERENCES auth.users(id),
  expertise_tags TEXT[],            -- 'medicine','coding','football','art_drawing','music_oud'
  years_experience INTEGER,
  bio TEXT, intro_video_url TEXT,
  hourly_rate_dh NUMERIC, free_intro BOOLEAN DEFAULT TRUE,
  status TEXT CHECK (status IN ('pending','intro_only','active','paused','suspended','banned')),
  kyc_status TEXT CHECK (kyc_status IN ('not_started','submitted','approved','rejected')),
  age_min_mentee INTEGER, age_max_mentee INTEGER,
  rating NUMERIC, sessions_count INTEGER DEFAULT 0,
  nivy_trust_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

public.mentor_sessions (
  id UUID PK,
  mentor_id UUID REFERENCES mentors(id),
  mentee_user_id UUID REFERENCES auth.users(id),
  scheduled_for TIMESTAMPTZ, duration_minutes INTEGER,
  meeting_url TEXT, meeting_provider TEXT CHECK (meeting_provider IN ('zoom','google_meet','in_person','nivy_video')),
  status TEXT CHECK (status IN ('requested','parent_pending','scheduled','live','completed','cancelled','no_show')),
  parent_approval_id UUID REFERENCES parental_authorizations(id),
  parent_attended BOOLEAN DEFAULT FALSE,
  recording_url TEXT, transcript_url TEXT,
  amount_dh NUMERIC, amount_coins INTEGER,
  rating_by_mentee INTEGER CHECK (rating_by_mentee BETWEEN 1 AND 5),
  rating_by_mentor INTEGER CHECK (rating_by_mentor BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

public.career_pathways (
  id UUID PK, slug TEXT UNIQUE, title TEXT,
  description TEXT, icon TEXT,
  required_subjects TEXT[],          -- 'maths','svt','physique'
  typical_grades TEXT[],             -- 'bac_s','bac_se','bac_lettres'
  recommended_quizzes UUID[],
  recommended_partners UUID[],
  recommended_mentor_tags TEXT[],
  total_milestones INTEGER,
  is_active BOOLEAN DEFAULT TRUE
);

public.teen_pathway_progress (
  teen_id UUID REFERENCES teens(id),
  pathway_id UUID REFERENCES career_pathways(id),
  declared_interest_at TIMESTAMPTZ DEFAULT NOW(),
  milestones_completed INTEGER DEFAULT 0,
  total_milestones INTEGER,
  notes TEXT, last_active_at TIMESTAMPTZ,
  PRIMARY KEY (teen_id, pathway_id)
);

public.internships (
  id UUID PK, partner_id UUID REFERENCES partners(id),
  title TEXT, description TEXT,
  duration TEXT CHECK (duration IN ('1_day','1_week','2_weeks','summer','part_time_school_year')),
  age_min INTEGER, age_max INTEGER,
  application_deadline DATE,
  spots_total INTEGER, spots_taken INTEGER DEFAULT 0,
  paid BOOLEAN, stipend_dh NUMERIC,
  required_skills TEXT[], application_form JSONB,
  city TEXT, remote_ok BOOLEAN DEFAULT FALSE,
  status TEXT CHECK (status IN ('draft','open','closed','filled','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

public.internship_applications (
  id UUID PK, internship_id UUID REFERENCES internships(id),
  applicant_user_id UUID REFERENCES auth.users(id),
  cover_letter TEXT, portfolio_urls TEXT[],
  parent_consent_at TIMESTAMPTZ,
  parent_authorization_id UUID REFERENCES parental_authorizations(id),
  status TEXT CHECK (status IN ('draft','submitted','reviewed','accepted','rejected','withdrawn')),
  decision_at TIMESTAMPTZ, decision_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API
- `POST /api/mentor/apply` — apply to be a mentor (KYC upload, intro video, references).
- `GET /api/teen/mentors?tag=medicine&city=casablanca` — discover mentors (RLS: only `status='active'|'intro_only'`).
- `POST /api/teen/mentor-sessions/book` — body: `{ mentor_id, scheduled_for, duration }`; creates `parental_authorization` row, blocks until approved.
- `POST /api/teen/mentor-sessions/:id/start` — generates meeting URL, starts recording.
- `POST /api/teen/mentor-sessions/:id/rate` — bilateral rating.
- `GET /api/teen/pathways` — list with progress.
- `POST /api/teen/pathways/:slug/declare` — teen declares interest.
- `GET /api/internships?pathway=medecine&city=...` — discover.
- `POST /api/internships/:id/apply` — with portfolio + parent consent gate.
- `GET /api/parent/mentor-sessions` — parent visibility (all of their teens' sessions, recordings).
- `POST /api/admin/mentors/:id/decision` — KYC approve/reject/tier change.

### UI
- `/teen/passion` — existing, extend to surface declared career pathways alongside hobby paths (`app/teen/passions/passions-client.tsx`).
- `/teen/pathways` — pathway hub (declare, see progress, recommended quizzes/mentors/internships).
- `/teen/mentors` — discover + filter by tag/city/language/rate.
- `/teen/mentor-sessions` — upcoming + history + ratings.
- `/teen/internships` — list + apply + status tracker.
- `/parent/mentor-sessions` — see all teens' sessions, watch live, access recordings, approve/deny.
- `/parent/pathways` — see what teen is exploring; gentle nudge surface, not gate.
- `/admin/mentors` — KYC queue, tier moves, ban/strike management, recording audit.
- `/admin/internships` — partner submission queue, curation.
- `/admin/pathways` — pathway authoring (slug, recommended quizzes/partners/tags).

### Trust & safety (CRITICAL — adult-teen)
- Mentor KYC required: CIN + selfie + extrait de casier judiciaire vierge + 2 references + admin video review.
- Tier ladder: `pending → intro_only → active`; demotion is instant on any strike.
- All sessions logged; first session free + parent-attended + recorded with on-screen consent disclosure.
- Mentor cannot DM mentee outside `[scheduled_for - 30min, scheduled_for + duration + 30min]` — enforced at chat-API layer.
- 3-strike → permanent ban → reported to authorities for criminal-grade misconduct.
- Age-appropriate matching default: `age_min_mentee = mentor.age - 5`, `age_max_mentee = mentor.age - 1`; wider age gaps require parent override + admin approval + group/hobby format only.
- One-tap reporting in session UI for both mentee and parent; admin SLA 4 business hours.
- Recording retention: video 90 days, transcript indefinite (audit). Parent has on-demand access throughout retention window.

### Personalization (§19.5)
- `recommend_for_teen('mentor')` — rank by `expertise_tags ∩ teen.interest_tags`, age-fit, city/locale, language, rating, sessions_count, nivy_trust_score.
- `recommend_for_teen('internship')` — rank by city, age fit, declared pathway, partner rep, deadline urgency.
- `recommend_for_teen('pathway')` — soft-suggest when `teen_affinity_scores` show a dominant cluster; never auto-enrol.

### Acceptance criteria
- ☐ Teen declares "Médecine" pathway via `/teen/pathways` → `teen_pathway_progress` row created.
- ☐ System recommends 3 medical mentors + 2 hospital internships in their city (`recommend_for_teen('mentor'|'internship')`).
- ☐ Teen books 30-min intro session → `mentor_sessions` row created with `status='parent_pending'`, `parental_authorizations` row created.
- ☐ Parent receives push → approves → session moves to `scheduled`.
- ☐ First session: parent attends (`parent_attended=true`), session recorded with consent disclosure shown.
- ☐ Both parties rate (`rating_by_mentee`, `rating_by_mentor`).
- ☐ Coins debited if paid mentor (after free intro window).
- ☐ Pathway progress increments by 1 milestone (`milestones_completed += 1`).
- ☐ Off-platform DM attempt is blocked at chat-API layer + creates strike on mentor.
- ☐ Internship application requires parent_consent_at NOT NULL before `status='submitted'`.

### Open questions
- Mentor compensation model: pure hourly / Nivy subsidy pool / volunteer-only / mixed tiers? (current bias: mixed — free intro always, then choose hourly or volunteer at activation).
- Background check process in Morocco — is `extrait de casier judiciaire` sufficient, or do we partner with a private vetting service?
- Internship payment: stipend mandatory or can be unpaid? Moroccan labour law for under-16 vs 16-18 needs legal review.
- Pathway count at launch: 10 curated (Médecine, Ingénierie, Droit, Commerce, Arts, Sport pro, Tech/Code, Enseignement, Santé paramedical, Entrepreneuriat) or 20+?
- Mentor matchmaking: full algorithmic v1 or admin-curated cohorts initially (to manage T&S blast radius)?
- Liability for mentor session quality / harm — Nivy as platform vs Nivy as employer? Insurance product needed?
- Cross-city remote mentoring vs in-person only — remote default for safety + reach, in-person only via partner-hosted shadowing?
- How does mentor rating decay influence future visibility — recent-weighted only, or all-time average with floor?
- Do we allow mentor → mentee gift coins, and if so do we cap to prevent grooming-via-economy?
- Graduation flow: when does a 17yo mentee become eligible to apply as a mentor — automatic prompt at 17, or invite-only?
