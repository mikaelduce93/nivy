# Avatar / Coach — Vision Audit

> Read-only audit of the avatar/companion surface that proposes
> challenges to the teen. Date: 2026-05-07. Branch: `main`.

The vision pitched ("a panda mascot that greets the teen by name,
proposes the next défi based on mood/time/history, adapts its tone to
age, celebrates wins, comforts losses") **does not exist as one
coherent feature**. Two unrelated surfaces overlap with the idea, and
neither does what the pitch describes.

---

## 1. What was searched

- `components/avatar/` — does not exist.
- `components/mascot/` — does not exist (only `components/brand/mascot-states.tsx`).
- `components/panda/` — does not exist.
- `components/coach/` — does not exist.
- `lib/avatar/` — does not exist.
- Glob `**/avatar*` → `components/ui/avatar.tsx` (Radix wrapper),
  `components/gamification/avatar-dashboard.tsx` (4-pillar radial
  dashboard, NOT a coach).
- Glob `**/mascot*` → `components/brand/mascot-states.tsx` only.
- Glob `**/coach*` → no files.
- Live DB tables matching `avatar|coach|mascot|companion`: **none**.
- Profile customization tables: present but cosmetic only (frames,
  titles, colors, backgrounds), and **0 rows in production**
  (`user_profile_customization=0`, `user_unlocked_frames=0`,
  `user_unlocked_titles=0` — only the catalog tables `profile_frames=7`
  and `profile_titles=9` are seeded).

## 2. What actually exists

### A. The brand panda — decorative only
- `components/brand/panda-logo.tsx` — `PandaLogo` and `PandaIcon` SVG
  with 5 expressions (`happy`, `celebrating`, `confused`, `sad`,
  `sleeping`). Pure presentational SVG.
- `components/brand/mascot-states.tsx` — `PandaMascot` adds decorative
  emoji (🎉, ✨, 💧, ?, Z) on top of `PandaIcon`. State is **passed in
  by the caller**, never derived from teen context.
- The panda is **not used inside `app/teen/`**:
  `Grep PandaMascot|MascotState` over `app/teen/**` = 0 hits. The only
  consumer is `app/page.tsx` (marketing landing). The teen dashboard
  never renders the panda.
- Asset: `public/icons/panda-favicon.svg` only (no full mascot
  illustration in `public/`).

### B. KAI — the AI Companion (text chatbot, not a visual avatar)
- `components/teen/dashboard/ai-companion.tsx` — a floating purple
  `Sparkles` button (bottom-right) opens a chat sheet branded "KAI /
  AI Companion" with a `Brain` Lucide icon. No panda. No persona art.
- Greets with `Yo ${teenName} ! 👋 Je suis ton AI Companion.` — so the
  "greet by name" piece exists, but as one hard-coded line.
- Talks to `/api/agent/action` (`app/api/agent/action/route.ts`) which
  streams `streamText()` from the AI SDK with the
  `TEEN_AGENT_PROMPT` from `lib/ai/prompts/roles.ts`.
- That prompt names the persona **"Kai, a cool, energetic, gamified AI
  coach for teenagers in Morocco"**, with tools `performCheckIn`,
  `getQuestSuggestions`, `getNearbyEvents`. Real Supabase RPC behind
  `performCheckIn` (`add_xp_to_user`).
- Suggestions panel calls `GET /api/teen/recommendations` for up to 3
  cards. Falls back to two hard-coded entries on failure.
- An older variant lives at `components/ai/elite-ai-companion.tsx`
  plus `components/ai/AgentSheet.tsx` / `AgentFloatingButton.tsx`.

### C. AI Oracle Card — static prediction card
- `components/teen/dashboard/ai-oracle-card.tsx` exists but is **not
  wired into the dashboard** (`teen-dashboard-content.tsx` does not
  import it). Hard-coded copy: "Tu as dominé les quêtes Intellect…".
  Placeholder, not a real coach.

### D. Avatar (image) — Radix wrapper + ReadyPlayerMe shim
- `components/ui/avatar.tsx` — generic Radix `Avatar` with neon ring
  variants (party/vitality/intellect/creativity/prestige) and presence
  status. Used everywhere a profile picture appears (`hero.tsx`,
  feed, friends, etc.).
- `components/gamification/avatar-dashboard.tsx` — circular HUD with
  the user photo at center and 4 pillar gauges around it. Not a coach,
  not animated by events.
- `lib/ai/ready-player-me.ts` — class wrapping the ReadyPlayerMe API
  for 3D avatars. **Zero call sites** in the app (`Grep
  ReadyPlayerMeService` = 1 hit, the file itself). Dead/spec code.

## 3. Gap vs. the vision

| Vision feature | Status |
|---|---|
| Panda mascot greets the teen | Absent in `/teen/*`; KAI greets in text only |
| Proposes next défi from mood/time/history/level | KAI calls `recommendations` API (no mood/time signal); `nextBestAction` on dashboard is server-picked (`lib/server/teen-dashboard`) and not framed as the avatar speaking |
| Tone adapts to age (13-17) | Not implemented — single TEEN_AGENT_PROMPT |
| Celebrates wins / comforts losses | `PandaMascot` has the *visual* states but nothing triggers them on XP up / streak loss / failed quest |
| Customizable avatar / earn skins | Schema present (`profile_frames`, `profile_titles`, `profile_colors`, `profile_backgrounds`, `user_unlocked_*`) but **0 unlocks in DB** and no UI surface for "equip" was found in `/teen/*` |
| Visual progression tied to XP/level | Avatar **ring color** and dashboard **hero variant** (`standard` / `elite` / `legendary` from `getHeroVariant(level, streak)`) change with level — closest thing to "avatar evolves" |
| Voice / TTS | No |
| Persona name consistent | No — landing uses panda + "NIVY", chatbot uses "KAI" with a `Brain` icon. Two unrelated personas |

## 4. Open questions for the founder

- Is the avatar a **separate persona per teen** (own panda they raise),
  or **one shared mascot** (Kai/Niv) the same for everyone?
- Canonical name? Right now: panda has no name, chatbot is "Kai", brand
  is "NIVY". Three different identities.
- Should the coach speak via **TTS / voice**, or text only?
- How **autonomous**? Hand-written nudges (templates), or full
  LLM-driven dialogue like KAI today?
- Should the **panda art replace the `Brain` icon in KAI's sheet** so
  the brand mascot becomes the chatbot face? That would unify (B) and
  (A) into one product.
- Cosmetic unlocks (frames/titles/colors) are seeded but no teen has
  unlocked anything — is the shop UI for these meant to ship, or kill
  the schema?

## 5. Files of interest (absolute paths)

- `C:\Users\Shadow\Desktop\NIVY\components\brand\panda-logo.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\brand\mascot-states.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\teen\dashboard\ai-companion.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\teen\dashboard\ai-oracle-card.tsx` (orphan)
- `C:\Users\Shadow\Desktop\NIVY\components\ai\elite-ai-companion.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\ai\AgentSheet.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\ai\AgentFloatingButton.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\gamification\avatar-dashboard.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\ui\avatar.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\api\agent\action\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\prompts\roles.ts` (`TEEN_AGENT_PROMPT` defines "Kai")
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\agent-actions.ts` (real `performCheckIn` RPC)
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\ready-player-me.ts` (dead)
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\014_profile_customization.sql`
- `C:\Users\Shadow\Desktop\NIVY\docs\brand\PANDA_LOGO.md`
- `C:\Users\Shadow\Desktop\NIVY\docs\brand\VOICE_AND_TONE.md`

## 6. One-line verdict

The "avatar coach" is currently **two disjoint surfaces** — a
brand-only panda mascot (decorative, never on the teen dashboard) and
a Lucide-branded text chatbot called Kai (functional, no avatar art,
no mood/age tone adaptation, not tied to wins/losses). The unified
"panda greets you and proposes today's défi" experience does not
exist yet.
