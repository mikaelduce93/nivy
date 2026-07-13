# Audit & refonte — Compagnon IA « Niv » · 2026-07-13

> Analyse du compagnon IA Niv + plan d'action exécuté. Clôt le périmètre couvert
> par l'audit `audit-2026-05-31/AUDIT-COACH-NIV-IA.md` (désormais **obsolète** —
> voir en tête de ce dernier).

## TL;DR

Niv est désormais le **seul** compagnon IA de Nivy. Le cluster legacy « Kai »
(EliteAICompanion + AgentSheet + `/api/agent/action`) a été supprimé. Un socle
**TTS/STT natif** (Web Speech API, sans lib externe) et un **classifier welfare
P0** (détection de détresse mineurs) ont été ajoutés. La migration Kai→Niv
annoncée en 2026-05 est **terminée**.

---

## 1. État avant refonte (constaté au 2026-07-13)

L'audit `AUDIT-COACH-NIV-IA.md` (2026-05-31) décrivait un état pré-remédiation.
Une vague de tickets `#202/#210/#211/#212` avait **déjà corrigé** la majorité
des « Quick wins » listés (démonter Kai du layout teen, env-driven models,
memory long terme, tools agentiques closed-loop, prompt caching, label
transparence IA, cap 20/jour). Mais le code legacy Kai **restait présent**
(dormant mais non supprimé), et deux gaps persistaient :

1. **Pas de TTS/STT sur la surface Niv** — la voix vivait uniquement dans le
   composant déprécié Kai (hors charte, avec `react-speech-recognition`).
2. **Pas de classifier welfare** — la sécurité mineurs reposait sur des regex
   `DENY_PATTERNS` (attrapant les mots-clés explicites) + un post-filtre, mais
   aucune détection sémantique des détresses exprimées indirectement.

### Cluster legacy Kai encore présent (12 fichiers, ~2 229 lignes)

- `components/ai/` : `elite-ai-companion.tsx`, `use-ai-chat.ts`,
  `AgentFloatingButton.tsx`, `AgentSheet.tsx`, `widgets/{Budget,FriendMap,Offer}.tsx`
- `app/api/agent/action/route.ts` (backend Kai, gpt-4o-mini en dur)
- `lib/ai/provider.ts`, `agent-actions.ts`, `context-engine.ts`, `prompts/roles.ts`
- Monté behind flag `legacy_agent_sheet` (off) dans 4 layouts
  (admin/ambassador/parent/partner)
- Dépendances mortes : `react-speech-recognition`, `regenerator-runtime`,
  `@ai-sdk/openai`, `@ai-sdk/react`, `ai`

---

## 2. Refonte exécutée (2026-07-13)

### Phase 1 — Suppression définitive du legacy Kai

**12 fichiers supprimés** (~2 229 lignes) + **4 layouts nettoyés** (retrait de
`AgentFloatingButton` + flag `legacy_agent_sheet`) + **5 dépendances retirées**
du `package.json`. Aucun consommateur vivant ne restait (confirmé par grep).

- `lib/features/flags.ts` : retrait du type `'legacy_agent_sheet'` + default
- `tests/unit/wave6i-design-mobile-truth.test.ts` : retrait des 3 entrées legacy
- `types/modules.d.ts` : retrait du `declare module 'react-speech-recognition'`
- `app/teen/layout.tsx` + `components/brand/niv.tsx` : commentaires actualisés

**Vérification** : `tsc --noEmit` = 0 régression (les 6 erreurs résiduelles dans
`app/blog/page.tsx` sont pré-existantes, hors-scope).

### Phase 2 — TTS/STT natifs (sans lib externe)

**Choix** : Web Speech API native (`window.speechSynthesis` + `SpeechRecognition`),
pas de fallback Whisper dans ce plan (le bouton STT est masqué sur les navigateurs
non supportés comme Firefox).

**Nouvelles modules** :
- `lib/voice/tts.ts` — `speakNiv()`, `stopSpeaking()`, `isTTSSupported()`.
  Corrige le bug Kai (`getVoices()` appelé mais jamais assigné) via écoute
  `voiceschanged` + cache. Voix FR préférée, prosodie légèrement aiguë (ados).
- `lib/voice/use-stt.ts` — hook `useSpeechToText()` (dictée continue fr-FR,
  interimResults, cleanup du micro au unmount).
- `types/globals.d.ts` — décla `SpeechRecognition` / `webkitSpeechRecognition`.

**Intégration** dans `components/teen/avatar-coach-client.tsx` :
- **Micro** (STT) dans le composer : bouton `Mic`/`MicOff` (lucide), rose +
  `motion-safe:animate-pulse` en écoute. Transcript live → `state.draft`.
- **Toggle TTS** (header panel) : bouton `Volume2`/`VolumeX`, `aria-pressed`,
  état `ttsEnabled`. Coupe la voix en cours si désactivé.
- **Speak auto** sur frame NDJSON `done` (pas sur chaque delta — évite le
  re-cancel permanent pendant le stream).
- **Bouton "parler cette réponse"** sur chaque bulle assistant `<NivCoach>`.

**Charte respectée** (vs erreurs Kai) : pas de `blur-*`/`backdrop-blur`/glow/
néon, pas de `framer-motion` (CSS transitions + `motion-safe:`), pas de
`canvas-confetti` direct, bordures `border-ink`, lucide-react pour les icônes,
`aria-pressed`/`aria-label` partout.

### Phase 3 — Classifier welfare P0 (sécurité mineurs)

**Objectif** : détecter les détresses exprimées indirectement que les regex
`DENY_PATTERNS` ratent (ex : « j'en peux plus », « à quoi ça sert », « personne
ne me comprend »).

**Nouveau module** `lib/ai/welfare-classifier.ts` :
- 3 niveaux : `ok` / `distress` / `crisis`
- 2 couches : (1) **regex synchrone** (déterministe, gratuit), (2) **LLM Haiku**
  sémantique (3s timeout via `withTimeout`, fallback regex si pas de clé/erreur)
- Skip des messages < 3 mots (économie) ; truncation à 500 chars

**Injection** dans `app/api/teen/avatar-coach/route.ts` (3e rideau, après
`DENY_PATTERNS` regex, avant le modèle principal) :
- `crisis` → **skip modèle** + `WELFARE_CRISIS_REPLY` (empathie + ligne SOS
  Amitié MA 05 22 22 22 22 + nudge parent) + log `behavioral_signals`
  (`signal_type: welfare_crisis`)
- `distress` → modèle **laissé passer** MAIS `welfareHint` injecté au system
  prompt (« ton empathique, propose un adulte de confiance ») + log
  `behavioral_signals` (`welfare_distress`)
- `ok` → flux normal

**PII-safe** : le texte du message n'est **jamais** persisté dans
`behavioral_signals` — seulement `signal_type` + `metadata {level, signals}`.

**Défense en profondeur** (3 rideaux) :
1. `DENY_PATTERNS` regex (synchrone, cheap) — reste le 1er rideau
2. Classifier welfare (sémantique, ~200ms Haiku) — 2e rideau
3. `isReplySafe` post-filtre incrémental sur la sortie modèle — 3e rideau

**Tests** : `tests/unit/welfare-classifier.test.ts` — **27 tests** couvrent la
couche regex (crisis/distress/ok + edge cases + invariants de sécurité). La
couche LLM n'est pas testée en CI (nécessite clé API) mais son fallback
regex-only est couvert.

### Phase 4 — Cette doc

---

## 3. Architecture finale

```
Surface unique : components/teen/avatar-coach-client.tsx (chat Niv)
                         │  STT (use-stt.ts) → state.draft
                         │  TTS (tts.ts) ← frame 'done' + boutons bulle
                         ▼
         POST /api/teen/avatar-coach (route.ts)
                         │
        ┌────────────────┼────────────────────────┐
        ▼                ▼                        ▼
   DENY_PATTERNS   Classifier welfare      Modèle principal
   (regex, rideau 1) (Haiku, rideau 2)   (Claude Sonnet, rideau 3)
                         │                  + tools agentiques
            ┌────────────┼────────────┐       (coach-tools.ts)
            ▼            ▼            ▼
         crisis       distress        ok
         (skip +      (log + hint     (flux normal)
          reply +     injecté)
          log)
                         │
                         ▼
              behavioral_signals (PII-safe)
```

**Provider** : Claude préféré (`ANTHROPIC_API_KEY`) → OpenAI fallback. Modèles
env-driven (`CLAUDE_MODEL_ID`, `CLAUDE_GREETING_MODEL`, `OPENAI_MODEL_ID`).

**Mémoire** : `coach_profile.long_summary` + `coach_goals` + `coach_facts`
(migration 119), injectée via `getCoachMemoryLine()`. Extraction Haiku best-effort
après chaque tour modèle.

**Cap** : `COACH_DAILY_TURN_CAP` (défaut 20/jour/teen, env-driven).

---

## 4. Suivi post-refonte (màj 2026-07-13, fin de session)

Les items initialement laissés en backlog ont été traités dans la même session :

- **✅ FAIT — Escalade parent active sur `crisis`** : création d'une ligne
  `parental_approvals` (`action_type: "welfare_alert"`, TTL 30j) → visible
  automatiquement dans la page `/parent/approvals` + le badge compteur du
  layout parent. **Conservatif : pas d'auto-push** (risque faux positif +
  panique) ; le parent découvre l'alerte à sa prochaine connexion. `details`
  inclut un guidance d'approche + SOS Amitié MA. PII-safe (aucun contenu).
  Cf `lib/ai/welfare-classifier.ts → escalateCrisisToParent`.
- **✅ FAIT — Red-team eval suite** : `lib/ai/coach-safety.ts` extrait les
  filtres (DENY_PATTERNS + isReplySafe) en module testable ;
  `tests/unit/coach-safety-redteam.test.ts` = **46 tests** (contenus explicites
  bloqués, faux positifs autorisés, limites regex documentées, invariant
  SAFE_REDIRECT). Bonus : correction d'un bug (`drugs` non matché, whitespace
  unsafe). Total : **73 tests** safety (red-team + welfare).
- **✅ FAIT — Observabilité** : `lib/ai/coach-telemetry.ts` logge un événement
  structuré parsable par tour (`[coach] {provider, model, tokens, latencyMs,
  costUsd, outcome, ...}`). 8 outcomes distincts. Estimation coût via table
  pricing env-overridable. Branché sur les 5 points de sortie de la route.
  PII-safe (teenId tronqué, aucun contenu).
- **✅ FAIT — Surface « Ce que Niv retient de toi »** : route
  `/api/teen/coach-memory` (GET lecture / DELETE effacement) + composant
  `<CoachMemoryPanel>` monté dans le chat Niv. RGPD/CNDP droit d'accès +
  droit d'effacement. Effacement en 2 clics (confirm).

### Décision Whisper / TTS serveur (P1 — en attente de métriques)

**Choix retenu : natif d'abord (Web Speech API), pas de fallback immédiat.**
Le bouton STT est masqué sur les navigateurs non supportés (Firefox) — pas de
*régression* vs l'avant (Kai était démonté). La décision de basculer sur un
STT serveur (Whisper) ou TTS serveur (OpenAI) sera **déclenchée par les
métriques télémétrie**, pas à l'aveugle :

- **Déclencheur STT Whisper** si : (> 15% des sessions sont sur Firefox ET
  le taux d'usage du chat dépasse 30%) OU (feedback support signalant une
  demande récurrente de dictée sur Firefox).
- **Déclencheur TTS serveur** si : (feedback qualité voix système jugée
  pauvre sur > 20% des devices Android) OU (coût agrégé < $X/mois, seuil à
  fixer selon le budget).
- **Risque à surveiller** : privacy. Le STT serveur envoie l'audio d'un
  mineur à un fournisseur US (OpenAI) → implication RGPD/CNDP + nécessité
  d'un consentement parental explicite. Le natif reste sur device = privacy
  maximale. C'est l'argument fort pour garder le natif le plus longtemps
  possible.

**Réévaluation** : après 30j de production avec la télémétrie
(`[coach]` logs), décision data-driven.

### Reste réellement à faire (plans séparés ultérieurs)

- **🟡 P2 — Sur-blocage regex** : `halal`/`haram` matchent « religion » dans
  `DENY_PATTERNS` alors que le system prompt demande un « cadre halal ».
  Faux positifs ennuyeux. À affiner en filtrage sémantique. (Documenté dans
  `coach-safety-redteam.test.ts` au besoin.)
- **🟡 P3 — Push notification主动 sur `welfare_alert`** : aujourd'hui
  reviewable seulement. Si la modération constate qu'une alerte crisis n'est
  pas vue assez vite par les parents, activer un push dédié (design faux
  positif requis — ne pas alarmer à tort).


---

## 5. Fichiers modifiés/créés

### Supprimés (12)
- `components/ai/elite-ai-companion.tsx`, `use-ai-chat.ts`,
  `AgentFloatingButton.tsx`, `AgentSheet.tsx`, `widgets/{BudgetChart,FriendMap,OfferPreview}.tsx`
- `app/api/agent/action/route.ts`
- `lib/ai/provider.ts`, `agent-actions.ts`, `context-engine.ts`, `prompts/roles.ts`

### Créés (4)
- `lib/voice/tts.ts` — TTS natif
- `lib/voice/use-stt.ts` — hook STT natif
- `lib/ai/welfare-classifier.ts` — classifier détresse P0
- `tests/unit/welfare-classifier.test.ts` — 27 tests

### Modifiés (9)
- `app/admin/layout.tsx`, `app/ambassador/layout.tsx`, `app/parent/layout.tsx`,
  `app/partner/layout.tsx` — retrait AgentFloatingButton + flag
- `app/teen/layout.tsx` — commentaire actualisé
- `app/api/teen/avatar-coach/route.ts` — injection welfare + 3e rideau
- `components/teen/avatar-coach-client.tsx` — TTS/STT + boutons voix
- `components/brand/niv.tsx` — doc comment actualisée
- `lib/features/flags.ts` — retrait `legacy_agent_sheet`
- `tests/unit/wave6i-design-mobile-truth.test.ts` — retrait entrées legacy
- `types/modules.d.ts` — retrait `react-speech-recognition`
- `types/globals.d.ts` — décla SpeechRecognition
- `package.json` — retrait 5 deps
