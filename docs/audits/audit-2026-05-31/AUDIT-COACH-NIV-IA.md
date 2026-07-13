# Audit & Blueprint — Coach IA « Niv » · Compte Teen Nivy

> ⚠️ **OBSOLÈTE au 2026-07-13.** Ce document décrit un état pré-remédiation. La
> quasi-totalité des « Quick wins » listés a été exécutée par les tickets
> `#202/#210/#211/#212`, puis la refonte du 2026-07-13 a clôturé le périmètre
> (suppression définitive du legacy Kai, ajout TTS/STT natifs, classifier
> welfare P0). **Consulter `audit-2026-07-13/AUDIT-NIV-COMPAGNON.md` pour
> l'état réel actuel.** Ce doc est conservé pour l'historique uniquement.

> Audit lecture seule + blueprint cible, généré par workflow multi-agents (10 agents). Date : 2026-05-31. Demande PO : « le coach Niv est très loin de ce qu'on peut faire en 2026 avec l'IA ». Complément de `AUDIT-FEATURES-TEEN.md`.

## Table des matières

1. [Audit du stack IA actuel](#1-audit-du-stack-ia-actuel)
2. [État de l'art 2026](#2-état-de-lart-2026)
3. [Blueprints (cible)](#3-blueprints-cible)

---

## 1. Audit du stack IA actuel

### 1.1 Surfaces & identité du coach IA (Niv vs Kai/Aura) — deux coachs concurrents, déprécié, charte, a11y, UX teen

> On est loin d'un coach IA 2026. Le teen voit DEUX coachs à la fois sur /teen : une carte "Niv" server-rendered (greeting statique sans IA + chat v2 plafonné 5 tours/jour, sans mémoire ni proactivité) ET un bouton flottant @deprecated nommé "Kai" (LLM live, voix, confetti, hors charte). Identité de marque incohérente (Niv ≠ Kai), deux backends LLM divergents (Claude-préféré côté Niv, gpt-4o-mini en dur côté Kai), un composant marqué @deprecated depuis #83 mais toujours monté en prod, et un troisième clone mort. C'est un état transitoire de migration jamais terminée — pas un produit cohérent.

**Comportement réel aujourd'hui :**

- DEUX coachs montés simultanément sur /teen : (1) <AvatarCoach> server card via app/teen/page.tsx:103, (2) <EliteAICompanion role='teen'> bouton flottant via app/teen/layout.tsx:73. Un teen sur /teen voit les deux.
- Surface 1 'Niv' — greeting : components/teen/avatar-coach.tsx est un Server Component LECTURE SEULE. Il lit avatars + avatar_messages (dernier message non-dismissed), sinon defaultGreeting() codé en dur par mood (avatar-coach.tsx:328-341). AUCUN appel LLM. Ajoute un teaser Quiz du jour (RPC recommend_for_teen) + nudge corvée (getChoreNudge).
- Surface 1 'Niv' — chat v2 : components/teen/avatar-coach-client.tsx monte AvatarCoachChat (panneau repliable 'Demander à Niv', chatEnabled=true par défaut). Il appelle GET/POST /api/teen/avatar-coach. Plafond DAILY_TURN_CAP=5 tours/jour/teen (route.ts:49). Historique = RECENT_HISTORY_PAIRS=3 paires seulement (route.ts:52). Pas de mémoire long terme, pas de tools, pas de streaming.
- Backend Niv : app/api/teen/avatar-coach/route.ts préfère Claude si ANTHROPIC_API_KEY sinon OpenAI (pickProvider l.141-147), via AIProviderFactory + resolveModelId. Modèle réel = claude-sonnet-4-6 ou gpt-4o-mini selon env (content-generator.ts:31-32). Garde-fous lourds : DENY_PATTERNS (drogue/sexe/violence/politique/religion, route.ts:59-70) en pré-filtre, isReplySafe() en post-filtre + détection anglais, SAFE_REDIRECT vers parent/mentor. PII scrub : utilise profiles.pseudo, jamais le vrai nom (route.ts:267-276). Réponse 1-3 phrases/60 mots (system prompt l.108).
- Surface 2 'Kai' — components/ai/elite-ai-companion.tsx : marqué @deprecated 'Refonte V1.5 (#83)' (l.72-76) MAIS toujours importé et monté dans app/teen/layout.tsx:24,73. Bouton flottant fixed bottom-24 right-4 z-[100].
- Identité DIFFÉRENTE : EliteAICompanion nomme l'agent 'Kai' (teen), 'Aura' (parent), 'Biz' (partner), 'Hype' (ambassador), 'Ops' (admin) via agentConfig (elite-ai-companion.tsx:64-70). Le message d'accueil dit 'Je suis Kai, ton AI Companion'. Pourtant le bouton affiche le SVG <Niv> (l.274) et l'aria-label dit 'Ouvrir Kai — coach Niv' (l.268) : marque schizophrène.
- Backend Kai : useAIChat (use-ai-chat.ts, wrapper Vercel AI SDK useChat) POST vers /api/agent/action. Ce route (app/api/agent/action/route.ts:290) utilise getDefaultModel() = openai('gpt-4o-mini') EN DUR (lib/ai/provider.ts:14-16) ; GATÉ sur OPENAI_API_KEY (l.47, 503 sinon). streamText avec prompts par rôle, tools réels (performCheckIn, getQuestSuggestions, getNearbyEvents, updateBudgetLimit, getChildrenStatus, createFlashOffer, getVenueStats, shareReferralCode), ContextEngine.gatherContext, scrubPii, rate limit 20/min.
- Surface 2 hors charte (confirmé dans le code) : TTS via window.speechSynthesis (speak(), l.156-169), reconnaissance vocale react-speech-recognition (l.131-153), confetti canvas-confetti avec hex EN DUR colors:['#8b5cf6','#f43f5e','#10b981'] (l.172-184), <MeshBackground intensity={0.6}> (l.324), framer-motion whileHover scale/rotate sur le bouton (l.261). La charte interdit blur/glow/grain ; hex bruts en dur = hors charte.
- Troisième composant MORT : components/teen/dashboard/ai-companion.tsx — quasi-doublon de EliteAICompanion (header affiche 'KAI' en dur l.186, MeshBackground, POST /api/agent/action). Marqué @deprecated #83. Grep confirme AUCUN import/caller vivant (<AICompanion / import AICompanion : no matches en .tsx).
- Surface canonique de marque qui EXISTE mais N'EST PAS utilisée pour le coach principal : components/brand/niv-usage.tsx fournit <NivCoach> (bulle Niv + DarkSurface charte, label mono rose), largement adoptée ailleurs (ambassador, account export/delete, agenda, withdrawal-form…) mais PAS dans la surface coach teen, qui garde l'EliteAICompanion déprécié.

**Écarts vs état de l'art 2026 :**

- Identité unique attendue en 2026 : un seul coach nommé, persistant, multi-surface. Ici deux noms (Niv vs Kai/Aura/Biz/Hype/Ops) coexistent dans la même session teen — aucun produit sérieux ne montre deux assistants concurrents sur le même écran.
- Le coach 'principal' (greeting) n'a AUCUNE IA live : c'est un template statique par mood. En 2026 un greeting de coach est minimalement personnalisé/généré (contexte streak, quêtes, heure) — pas un switch/case codé en dur.
- Pas de mémoire : historique limité à 3 paires (route.ts:52), aucune persistance de profil/préférences entre sessions. L'état de l'art 2026 = mémoire longue (résumés, faits durables) pour un coach de rétention.
- Pas de proactivité ni de tool use côté coach canonique : avatar-coach n'a aucun outil ; seul le composant déprécié (Kai) a des tools réels. Le coach 'officiel' ne peut donc rien FAIRE (pas de check-in, pas de suggestion actionnable au-delà d'un lien).
- Pas de streaming sur la surface Niv (réponse atomique) → latence perçue élevée vs le standard 2026 (token streaming).
- Plafond 5 tours/jour extrêmement bas pour un 'coach' : casse toute conversation réelle ; relève d'un quota anti-coût, pas d'un design de coaching.
- Deux backends/modèles divergents (Claude-sonnet-4-6 préféré côté Niv vs gpt-4o-mini EN DUR côté Kai, provider.ts:15) : aucune unification du provider, pas de routing/fallback cohérent attendu en 2026.
- Modalité vocale (TTS + ASR) existe seulement sur le composant déprécié et hors charte — donc la seule expérience 'voix' est celle qu'on veut supprimer ; la surface canonique n'a pas de voix.
- Aucune télémétrie d'évaluation/feedback exploitée : le feedback 👍/👎 de Kai ne fait qu'un console.log (elite-ai-companion.tsx:239) — pas de boucle d'amélioration.
- Aucun classifieur de détresse sur l'input avant l'appel modèle (les docs canon le notent comme non câblé) : la sécurité repose sur regex + post-filtre, en deçà des garde-fous welfare attendus pour des mineurs en 2026.

**Risques :**

- INCOHÉRENCE DE MARQUE majeure : un teen voit 'Niv' (carte) et 'Kai' (flottant) simultanément, avec un bouton Kai qui affiche le SVG Niv et un aria-label 'Ouvrir Kai — coach Niv'. Confusion d'identité directe.
- DETTE / @deprecated EN PROD : elite-ai-companion.tsx est marqué @deprecated depuis #83 mais reste monté (layout.tsx:73). La migration vers Niv/DarkSurface annoncée dans niv.tsx:13 n'a jamais été exécutée pour cette surface.
- HORS CHARTE confirmé : hex bruts en dur (#8b5cf6/#f43f5e/#10b981) dans le confetti, MeshBackground intensity 0.6, TTS, framer rotate sur le bouton — tout ce que la charte paper néo-brutaliste proscrit, encore visible côté teen.
- COÛT / SÉCURITÉ modèle : provider.ts force gpt-4o-mini EN DUR (non env-driven) pour /api/agent/action ; modèle daté, et incohérent avec le routing env-driven de l'autre surface. Le composant déprécié envoie en plus un contexte serveur riche (ContextEngine) à un processeur US.
- CODE MORT : components/teen/dashboard/ai-companion.tsx sans caller — surface de bug/confusion et faux positifs d'audit (3e clone 'KAI').
- UX dégradée : double bouton/carte = bruit cognitif ; le coach 'officiel' ne répond pas vraiment (greeting figé + chat bridé 5/jour), donc l'attente créée par deux surfaces n'est pas tenue.
- INCOHÉRENCE FONCTIONNELLE : seules les fonctionnalités utiles (tools, voix, suggestions live) vivent dans le composant qu'on veut supprimer ; la surface canonique est plus pauvre. Supprimer Kai sans porter ces capacités = régression de features.

**Quick wins (<1j) :**

- Démonter EliteAICompanion du teen : supprimer l'import (app/teen/layout.tsx:24) et le bloc <EliteAICompanion> (l.73-79). Tue d'un coup le 2e coach, le hors-charte (TTS/confetti/hex/MeshBackground), le PII riche et la confusion Niv/Kai. ~30 min, conforme au plan Cleanup-C déjà documenté (docs/compliance/14-deprecated-legacy-surfaces.md:150,193).
- Supprimer le code mort components/teen/dashboard/ai-companion.tsx (aucun caller confirmé par grep) — ou au minimum le noter ; enlève le 3e clone 'KAI'.
- Remplacer le hardcode gpt-4o-mini dans lib/ai/provider.ts:15 par process.env.OPENAI_MODEL_ID || DEFAULT_OPENAI_MODEL pour aligner /api/agent/action sur le routing env-driven déjà utilisé par avatar-coach (content-generator.ts:34-42). <1h.
- Si on garde un seul coach : monter <NivCoach> (components/brand/niv-usage.tsx, déjà conforme charte et adopté ailleurs) comme habillage de la surface coach teen, au lieu d'EliteAICompanion. Unifie l'identité sur 'Niv'.
- Aligner le libellé/aria du bouton restant sur 'Niv' uniquement (supprimer agentConfig Kai/Aura/Biz/Hype/Ops ou ne plus l'exposer côté teen) pour stopper la double identité.
- Relever le plafond de 5 tours/jour (DAILY_TURN_CAP, route.ts:49) vers une valeur env-configurable, le 5 codé en dur étant un anti-pattern coach (changement d'1 ligne).

**Fichiers de preuve :** `C:\Users\Shadow\Desktop\NIVY\components\teen\avatar-coach.tsx`, `C:\Users\Shadow\Desktop\NIVY\components\teen\avatar-coach-client.tsx`, `C:\Users\Shadow\Desktop\NIVY\components\ai\elite-ai-companion.tsx`, `C:\Users\Shadow\Desktop\NIVY\components\ai\use-ai-chat.ts`, `C:\Users\Shadow\Desktop\NIVY\components\teen\dashboard\ai-companion.tsx`, `C:\Users\Shadow\Desktop\NIVY\components\brand\niv.tsx`, `C:\Users\Shadow\Desktop\NIVY\components\brand\niv-usage.tsx`, `C:\Users\Shadow\Desktop\NIVY\app\teen\layout.tsx`, `C:\Users\Shadow\Desktop\NIVY\app\teen\page.tsx`, `C:\Users\Shadow\Desktop\NIVY\app\api\teen\avatar-coach\route.ts`, `C:\Users\Shadow\Desktop\NIVY\app\api\agent\action\route.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\provider.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\content-generator.ts`, `C:\Users\Shadow\Desktop\NIVY\docs\compliance\11-personalization-ai-compliance.md`, `C:\Users\Shadow\Desktop\NIVY\docs\compliance\14-deprecated-legacy-surfaces.md`

---

### 1.2 Backend & modèle IA (provider, agent loop, tools, contexte, prompts)

> On est très loin d'un coach IA 2026. Deux backends incohérents coexistent : le companion @deprecated /api/agent/action est cloué en dur sur gpt-4o-mini (un modèle non-frontier de 2024) via streamText SANS multi-tours (pas de maxSteps/stopWhen) — donc le LLM peut émettre un appel d'outil mais ne reçoit JAMAIS le résultat, l'agent loop est cassé par construction. Claude n'est PAS branché sur cette surface : @ai-sdk/anthropic n'est même pas installé. Côté Niv (avatar-coach), Claude EST appelé mais via un fetch HTTP brut artisanal (anthropic-version 2023-06-01, aucun tool, aucun prompt caching, max 5 tours/jour, 0 mémoire, 0 proactivité). Le coach principal (le greeting affiché à l'écran) n'appelle AUCUN LLM. Verdict : pipeline daté, fragmenté, sans tool-use natif fiable, sans caching, sans frontier model — un prototype 2024, pas un coach 2026.

**Comportement réel aujourd'hui :**

- MODÈLE RÉELLEMENT APPELÉ (companion Kai/Aura) : gpt-4o-mini EN DUR. lib/ai/provider.ts:15 `return openai('gpt-4o-mini')`, sans aucun env override. C'est l'unique modèle de app/api/agent/action/route.ts:290 (`model: getDefaultModel()`). Grep confirme : getDefaultModel n'est utilisé QUE là.
- CLAUDE EST MORT sur l'agent loop : @ai-sdk/anthropic N'EST PAS dans package.json (seul @ai-sdk/openai 3.0.12 + ai 6.0.44). lib/ai/providers/claude.ts existe mais n'est jamais importé par /api/agent/action ; il n'est joignable que par le fetch brut du chat Niv et du content-generator.
- AGENT LOOP CASSÉ (pas de boucle multi-tours) : app/api/agent/action/route.ts:289 appelle streamText({model, messages, system, tools}) SANS maxSteps / stopWhen / stepCountIs (grep = aucune occurrence). En AI SDK v5/6 le défaut est 1 step : le modèle peut APPELER un tool mais le résultat du tool n'est jamais renvoyé au modèle pour formuler une réponse finale. La conversation outillée ne se termine donc jamais proprement.
- STREAMING DÉGRADÉ : route ligne 297 `result.toTextStreamResponse()` (texte brut), pas toDataStreamResponse — donc les tool-calls/tool-results ne sont pas streamés au client de façon structurée.
- TOOLS PARTIELLEMENT FACTICES : sur les tools déclarés dans route.ts, seuls 4 exécutent une vraie action serveur (performCheckIn, updateBudgetLimit, createFlashOffer, shareReferralCode dans lib/ai/agent-actions.ts). getQuestSuggestions/getNearbyEvents/getChildrenStatus/getVenueStats/getCommissionStats ne font que relire l'objet `context` déjà injecté dans le prompt (route.ts:160-265) — ils n'existent PAS dans agent-actions.ts (grep confirme). Ce sont des tools redondants avec le contexte.
- ACTIONS RÉELLES FRAGILES : agent-actions.ts:69 updateBudgetLimit upsert dans une table `budget_limits` 'hypothétique' et renvoie un faux succès 'Simulé - Table manquante' si elle n'existe pas (ligne 79). createFlashOffer:99 insère dans `offers` avec colonnes type/status/expires_at potentiellement hors-schéma (cf. drift schéma noté en mémoire). shareReferralCode:135 lit profiles.referral_code.
- COACH PRINCIPAL = ZÉRO IA LIVE : components/teen/avatar-coach.tsx est un Server Component lecture seule (commentaire ligne 8 'No LLM calls here'). Le greeting vient de la table avatar_messages, sinon defaultGreeting() codé en dur (lignes 327-341). Ajoute un teaser quiz (RPC recommend_for_teen) + nudge corvée. Aucun appel LLM.
- CHAT NIV (avatar-coach/route.ts) : provider choisi par pickProvider() — Claude si ANTHROPIC_API_KEY sinon OpenAI (ligne 141-147). Modèle via resolveModelId : CLAUDE_MODEL_ID || 'claude-sonnet-4-6' ; OPENAI_MODEL_ID || 'gpt-4o-mini' (content-generator.ts:31-42). Donc DEUX modèles différents selon la surface (gpt-4o-mini pour Kai vs claude-sonnet-4-6 pour Niv).
- CHAT NIV — appel HTTP ARTISANAL : claude.ts:16 fait un fetch direct sur api.anthropic.com avec header 'anthropic-version':'2023-06-01', max_tokens 2000, system+user, AUCUN tool, AUCUN streaming, AUCUN prompt caching (pas de cache_control), AUCUN champ thinking. openai.ts identique (chat/completions, temperature 0.7).
- BRIDAGE FORT : avatar-coach/route.ts plafonne 5 tours/jour/teen (DAILY_TURN_CAP=49→5), réponse ≤600 chars, historique = 3 paires relues depuis avatar_messages (pas de vraie mémoire structurée), DENY_PATTERNS regex pré-filtre + isReplySafe post-filtre (heuristique anglais 25%), PII scrub (pseudo only). FR uniquement.
- CONTEXTE : lib/ai/context-engine.ts gatherContext() fait des fetch Supabase parallèles par rôle (profil pseudo+age_bucket, XP, streak, challenges, events, présence) puis scrubPii(). Solide côté PII, mais le résultat est sérialisé en JSON BRUT dans le system prompt (route.ts:136-149 `JSON.stringify(safeContext, null, 2)`) — gonfle les tokens à chaque requête, jamais mis en cache.
- CONTENT-GENERATOR (cron) : content-generator.ts utilise AIProviderFactory + resolveModelId, provider via env AI_PROVIDER. Parsing JSON par regex (parseMissionResponse:356 strip ```json), PAS de structured output / response_format / Zod schema côté modèle. Le commentaire ligne 22-29 reconnaît que l'ancien défaut claude-3-sonnet-20240229 était RETIRÉ et cassait le cron silencieusement.

**Écarts vs état de l'art 2026 :**

- Modèle non-frontier : l'agent tourne sur gpt-4o-mini (2024). Standard 2026 = modèle frontier (GPT-5.x, Claude Sonnet/Opus 4.x) pour un vrai raisonnement coach, avec routage Haiku/mini pour les tâches triviales.
- Pas de tool-use natif fonctionnel : l'absence de maxSteps/stopWhen fait que la boucle outil→résultat→réponse ne se ferme jamais. En 2026 c'est la base d'un agent (multi-step tool loop, parallel tool calls).
- Aucun prompt caching : ni Anthropic cache_control, ni caching OpenAI. Les system prompts + contexte JSON volumineux sont renvoyés en entier à chaque tour → coût et latence multipliés (le caching réduit ~90% le coût des prefixes répétés).
- Aucune mémoire long terme : seul un historique de 3 paires relu en SQL. Pas de mémoire persistante / profil évolutif / résumés — pourtant central pour un 'coach'.
- Aucune proactivité : le coach principal ne fait que rendre des messages pré-écrits ; pas de génération proactive de nudges contextuels par LLM. Le chat est purement réactif et plafonné à 5 tours.
- Pas de structured output garanti : content-generator parse du JSON au regex au lieu d'utiliser response_format json_schema (OpenAI) ou tool/JSON mode (Anthropic) → fragile, d'où le besoin de SmartJSONParser + fallbacks.
- SDK contourné : les providers font des fetch HTTP manuels (claude.ts/openai.ts) au lieu d'utiliser @ai-sdk/anthropic + generateText/streamText unifiés. Pas de streaming, pas de retries/abort standardisés, header API Anthropic figé à 2023-06-01.
- Pas de streaming structuré côté chat Niv (réponse JSON one-shot), et toTextStreamResponse côté companion → UX non conforme aux standards conversationnels 2026.
- Deux identités/architectures concurrentes (Niv vs Kai/Aura/Biz/Hype/Ops) avec deux backends et deux modèles : aucune convergence, dette de cohérence produit majeure.
- Pas d'observabilité IA dédiée : pas de tracing tokens/coût/latence par requête sur les routes chat (le content-generator logge un peu via content_generation_logs, mais pas l'agent ni le chat Niv).

**Risques :**

- Modèle daté / coût : gpt-4o-mini en dur, non frontier, et SANS prompt caching → coût qui monte linéairement avec la taille du contexte JSON réinjecté à chaque tour ; qualité de coaching plafonnée.
- Agent loop non terminant : sans maxSteps, dès que le modèle décide d'appeler un tool (performCheckIn, etc.), l'utilisateur peut recevoir une réponse vide ou tronquée car le résultat du tool n'est pas réinjecté. Bug fonctionnel latent en prod.
- Composant @deprecated en prod : EliteAICompanion est monté dans app/teen/layout.tsx:73 et appelle /api/agent/action → la surface 'morte' est la seule à exposer des tools mutateurs (check-in XP, flash offers, budget). Risque d'effets de bord non maîtrisés via un composant censé être retiré.
- Action factice trompeuse : updateBudgetLimit renvoie 'succès (Simulé - Table manquante)' (agent-actions.ts:79) — un parent croit avoir baissé un plafond alors que rien n'est écrit. Risque de confiance/sécurité familiale.
- Drift schéma : createFlashOffer insère dans `offers` (type/status/expires_at) et performCheckIn appelle add_xp_to_user — colonnes/RPC à re-vérifier vs schéma live (cf. mémoire schema-drift) ; échec silencieux possible.
- Incohérence d'identité : l'utilisateur voit 'Niv' (greeting + chat) mais le companion flottant se présente comme 'Kai' avec hex hors-charte (#8b5cf6 etc.) — incohérence de marque + violation charte paper néo-brutaliste.
- Sécurité content-safety par regex : DENY_PATTERNS + heuristique anglais 25% sont contournables (fautes, translittération, darija latinisée). Acceptable en défense-en-profondeur mais pas comme garde-fou principal pour des mineurs.
- Header Anthropic figé 2023-06-01 + appels fetch maison : pas de gestion fine des erreurs/retries, fragile face aux évolutions d'API ; dette technique vs SDK officiel.

**Quick wins (<1j) :**

- Ajouter `maxSteps` (ou stopWhen: stepCountIs(N)) à streamText dans app/api/agent/action/route.ts:289 pour réparer la boucle tool→réponse. <1h.
- Démonter EliteAICompanion de app/teen/layout.tsx:73 (composant @deprecated) ou le neutraliser, pour supprimer la surface concurrente et les tools mutateurs non maîtrisés. <1h.
- Sortir le modèle du dur : remplacer provider.ts:15 par `openai(process.env.OPENAI_MODEL_ID || 'gpt-4o-mini')` (ou injecter un modèle frontier) pour aligner sur resolveModelId et permettre un override sans redeploy. <30min.
- Brancher @ai-sdk/anthropic et router l'agent vers Claude quand ANTHROPIC_API_KEY existe, comme le fait déjà le chat Niv via pickProvider() — supprime l'incohérence 'Claude préféré ici mais impossible là'. ~0,5j.
- Activer le prompt caching Anthropic (cache_control sur le system prompt + bloc contexte) dans lib/ai/providers/claude.ts pour le chat Niv : gros gain coût/latence immédiat sur des prompts quasi statiques. ~0,5j.
- Passer le content-generator en structured output (response_format json_schema OpenAI / JSON mode) au lieu du parsing regex, pour fiabiliser le cron generate-daily-content. ~0,5j.
- Corriger l'action mensongère updateBudgetLimit (agent-actions.ts:79) : renvoyer un échec honnête si la table n'existe pas plutôt qu'un faux succès. <30min.

**Fichiers de preuve :** `C:\Users\Shadow\Desktop\NIVY\app\api\agent\action\route.ts`, `C:\Users\Shadow\Desktop\NIVY\app\api\teen\avatar-coach\route.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\provider.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\providers\claude.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\providers\openai.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\providers\factory.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\providers\base.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\content-generator.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\context-engine.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\agent-actions.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\prompts\roles.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\safe-context.ts`, `C:\Users\Shadow\Desktop\NIVY\components\teen\avatar-coach.tsx`, `C:\Users\Shadow\Desktop\NIVY\app\teen\layout.tsx`, `C:\Users\Shadow\Desktop\NIVY\app\api\cron\generate-daily-content\route.ts`, `C:\Users\Shadow\Desktop\NIVY\package.json`

---

### 1.3 Coach IA — Intelligence réelle : mémoire, personnalisation, proactivité

> Le "coach" est très loin d'un coach IA 2026. La surface principale (la salutation Niv) est 100% scriptée : zéro appel LLM, et comme rien ne peuple `avatar_messages` en proactif, elle retombe quasi toujours sur 4 phrases codées en dur (`defaultGreeting`). La seule IA conversationnelle live (chat v2) est un mini-bot sans mémoire (3 paires), sans outils, sans streaming, plafonné à 5 tours/jour, et qui n'injecte AUCUN contexte de profil (ni XP, ni streak, ni intérêts) dans le prompt — juste le pseudo. Un vrai moteur de personnalisation existe (recommend_for_teen, evolve-teen-profiles, intelligent-content-engine) mais il alimente les recommandations de quiz/contenu, PAS les réponses du coach : les deux mondes ne communiquent pas. Verdict : assistant scripté + recommandeur batch découplé, pas un coach intelligent, adaptatif et proactif.

**Comportement réel aujourd'hui :**

- GREETING = SCRIPTÉ, AUCUN LLM. components/teen/avatar-coach.tsx est un Server Component lecture-seule : il lit le dernier avatar_messages (filtre `dismissed_at IS NULL`, l.114-121) sinon retombe sur defaultGreeting(firstName, mood) — 4 branches en dur (l.328-341). Le commentaire de tête l'assume : 'No LLM calls here' (l.8-9).
- PERSONNALISATION DU GREETING = ~NULLE EN PRATIQUE. Aucune source ne crée de avatar_messages non-dismissed : le seul writer est app/api/teen/avatar-coach/route.ts qui insère les 2 tours de chat en les marquant `dismissed_at = NOW()` (l.285, 348) pour ne JAMAIS resurgir comme greeting. Aucun des 19 crons (app/api/cron/*) n'écrit dans avatar_messages. Donc la requête greeting (dismissed_at IS NULL) ne trouve rien et sert toujours le fallback codé en dur.
- MOOD = MANUEL, NON INFÉRÉ. avatars.mood ne change que via le bouton set_mood (app/api/teen/avatar/route.ts l.74-103). Rien ne déduit l'humeur du comportement (échecs, streak cassé, inactivité). Le 'gradient selon mood' est purement cosmétique.
- CHAT v2 = LLM RÉEL MAIS BRIDÉ ET SANS MÉMOIRE. app/api/teen/avatar-coach/route.ts : provider Claude si ANTHROPIC_API_KEY sinon OpenAI (pickProvider l.141-147). Mémoire = 3 paires user/assistant seulement (RECENT_HISTORY_PAIRS=3, fetchHistory l.169-191) reconstituées en texte ; aucune mémoire long terme, aucun résumé persistant, aucun objectif mémorisé. Pas de tools, pas de streaming. Plafond DAILY_TURN_CAP=5 tours/jour/teen (l.49, 244-254). Réponse 1-3 phrases / 60 mots (system prompt l.108).
- CHAT v2 N'INJECTE AUCUN PROFIL. Le prompt ne reçoit que coachName + pseudo (teenHandle, l.266-276). AUCUN XP, niveau, streak, intérêts, historique de quiz, mood ou objectif n'est passé au LLM. Le system prompt (buildSystemPrompt l.101-124) est statique. La 'personnalisation' se limite au prénom/pseudo.
- RECOMMANDEUR RÉEL MAIS DÉCOUPLÉ DU COACH. recommend_for_teen v2 (migration 076) est un vrai scoring SQL (affinity teen_interests+affinity_scores, novelty, context_fit, difficulty_fit gaussien sur le niveau, pénalité vu-7j, filtre cohorte). Le greeting l'appelle UNIQUEMENT pour un teaser 'Quiz du jour' (avatar-coach.tsx l.122-126, resolveDailyQuiz l.277-301) — il ne nourrit jamais une réponse générative du coach.
- PROACTIVITÉ = NUDGES STATIQUES, PAS IA. Le greeting ajoute un nudge corvée via getChoreNudge (lib/server/unified-quest-engine.ts l.215) : pur SQL sur parent_chores, texte en dur 'Tâche à finir'. Aucune relance générée par IA, aucun message proactif personnalisé écrit en base.
- CRON DAILY-CONTENT = GÉNÈRE DU CONTENU, PAS DU COACHING. app/api/cron/generate-daily-content (planifié vercel.json '0 1 * * *') génère quiz/missions par COHORTE (grade/school_type/curriculum/langue + top intérêts), pas par individu, et écrit dans educational_quizzes/mission_templates — jamais d'avatar_messages ni de message coach. provider via AI_PROVIDER env, défaut openai (l.224).
- CRON EVOLVE-TEEN-PROFILES = RÉEL. (vercel.json '0 2 * * *') : evolve_all_teens (décroissance affinité 0.95^jours sur 30j de behavioral_signals) + recompute_neighbours (collaborative filtering top-50). Alimente le recommandeur, pas le coach conversationnel.
- INTELLIGENT-CONTENT-ENGINE = PARTIELLEMENT MORT / FACTICE. lib/ai/intelligent-content-engine.ts n'est PAS importé par le coach ; seul app/api/teen/content/intelligent/route.ts l'utilise. learningStyle est codé en dur 'visual' (l.142, commentaire 'Standardized default'), 'performanceBased: 50 // Default for neutral' (l.378), verifyFactualAccuracy ne vérifie que la structure des questions (l.422-436), pas la véracité. Profilage 'ML/SOLID' largement cosmétique.
- DEUX COACHS EN PROD SIMULTANÉS. app/teen/layout.tsx l.73 monte EliteAICompanion (marqué @deprecated) EN MÊME TEMPS que AvatarCoach (greeting Niv) sur /teen. Identités différentes (Kai vs Niv), backends différents (POST /api/agent/action gpt-4o-mini en dur vs avatar-coach Claude-préféré). De plus EliteAICompanion reçoit le VRAI prénom (userInfo.fullName.split, l.75) — fuite PII confirmée par docs/compliance/11-personalization-ai-compliance.md (CANON-AI-001).

**Écarts vs état de l'art 2026 :**

- Pas de mémoire long terme. Un coach 2026 maintient une mémoire persistante (résumés, objectifs, faits saillants) injectée à chaque tour. Ici : 3 paires brutes max, rien au-delà, aucun résumé, aucun objectif retenu.
- Pas de personnalisation du dialogue. Le LLM ne reçoit ni XP/niveau, ni streak, ni intérêts, ni historique de quiz, ni mood. Impossible d'adapter ton/contenu à l'état réel de l'ado, alors que toutes ces données existent (user_xp, teen_interests, quiz_attempts, behavioral_signals).
- Pas de proactivité IA. Aucun message proactif/relance généré : la salutation est un fallback codé en dur, jamais un message IA contextuel ('tu as cassé ta série hier, on relance ?'). 2026 attend des nudges génératifs déclenchés par signaux.
- Pas de tool-use dans le coach principal. La salutation n'a aucun outil ; le chat v2 non plus. Le tool-calling existe seulement dans la surface dépréciée (/api/agent/action). Un coach 2026 agit (lance un quiz, marque une corvée, planifie) via tools.
- Pas de streaming. Réponse en bloc, UX datée vs streaming token par token attendu en 2026.
- Plafond produit absurde pour un 'coach'. 5 tours/jour interdit toute conversation d'accompagnement réelle ; un coach qu'on ne peut consulter que 5 fois n'en est pas un.
- Mood non inféré. L'état émotionnel devrait être déduit du comportement (inactivité, échecs, série cassée) ; ici 100% déclaratif via un bouton.
- Personnalisation par cohorte, pas par individu. Le daily-content génère par cohorte (grade/curriculum), pas de contenu génératif réellement 1:1.
- Backends/personas incohérents et modèle daté en dur. gpt-4o-mini codé en dur dans /api/agent/action ; deux personas (Niv vs Kai) ; le 'coach' canonique n'a pas d'IA live alors que la surface IA live est @deprecated.
- Profilage factice. intelligent-content-engine annonce learningStyle/ML mais hardcode 'visual' et des scores neutres ; pas de véritable détection de style/factualité.

**Risques :**

- Modèle daté codé en dur : lib/ai/provider.ts getDefaultModel() = openai('gpt-4o-mini') en dur pour /api/agent/action ; le DEFAULT_OPENAI_MODEL = 'gpt-4o-mini' (content-generator.ts l.32). Risque d'obsolescence et de dérive qualité vs modèles 2026.
- Composant @deprecated en prod (EliteAICompanion monté layout.tsx:73) : dette + double coût LLM + incohérence d'identité (Kai vs Niv) visible par l'utilisateur (les deux s'affichent sur /teen).
- Fuite PII : EliteAICompanion reçoit le vrai prénom (fullName) et, selon docs/compliance/11-personalization-ai-compliance.md, sérialise full_name/children.name vers OpenAU (US) — exposition CNDP/RGPD (CANON-AI-001). Le chat v2 (avatar-coach) lui scrub correctement (pseudo only).
- Incohérence/illusion produit : la 'pièce maîtresse rétention' (whitepaper §8) est en réalité un texte statique 4-variantes ; risque de surcommunication interne d'une 'IA coach' qui n'existe pas côté greeting.
- Coût/abandon silencieux : si ANTHROPIC_API_KEY et OPENAI_API_KEY absents, le chat répond 'Mon cerveau IA est en pause' (l.301) — dégradation silencieuse non monitorée.
- Code mort/factice : intelligent-content-engine.ts (profilage cosmétique, hardcodes) maintient une fausse impression de sophistication ; risque de décisions produit basées dessus.
- Frein produit majeur : le cap 5 tours/jour tue l'usage 'coach' ; combiné à l'absence de mémoire et de proactivité, la rétention promise par le coach est peu crédible.

**Quick wins (<1j) :**

- Injecter le contexte profil dans le prompt du chat v2 : ajouter XP/niveau (user_xp), streak, top intérêts (teen_interests), mood courant dans buildSystemPrompt — données déjà lues ailleurs, <1j, gros gain de personnalisation perçue.
- Démonter EliteAICompanion de app/teen/layout.tsx (l.73-78) : supprime le double-coach, la fuite PII prénom, et le persona Kai concurrent. Une suppression de mount, faible risque.
- Relever/assouplir le cap 5 tours/jour (DAILY_TURN_CAP, route.ts l.49) — ex. 20/jour ou cap horaire — pour rendre le coach utilisable, sous garde-fous de coût existants.
- Brancher un message proactif réel : faire écrire par evolve-teen-profiles (ou un petit cron) UN avatar_messages non-dismissed/jour basé sur signaux (streak cassé, quiz du jour) afin que le greeting cesse d'être un fallback codé en dur. Réutilise recommend_for_teen déjà appelé.
- Activer le streaming sur le chat v2 (le provider factory peut streamer comme /api/agent/action le fait déjà via streamText) — UX immédiate.
- Inférer le mood depuis le comportement au lieu du bouton manuel : map simple (série cassée→tired, quiz réussi→happy) côté serveur dans le greeting, sans LLM, <1j.
- Élargir la fenêtre mémoire au-delà de 3 paires + ajouter un court résumé persistant (champ sur avatars) ré-injecté à chaque tour — petite mémoire long terme à coût quasi nul.
- Unifier le modèle via env partout : remplacer le gpt-4o-mini codé en dur de lib/ai/provider.ts par resolveModelId (déjà utilisé par le chat v2) pour cohérence et upgrade modèle 2026 par variable d'env.

**Fichiers de preuve :** `C:\Users\Shadow\Desktop\NIVY\components\teen\avatar-coach.tsx`, `C:\Users\Shadow\Desktop\NIVY\app\api\teen\avatar-coach\route.ts`, `C:\Users\Shadow\Desktop\NIVY\app\api\teen\avatar\route.ts`, `C:\Users\Shadow\Desktop\NIVY\app\api\cron\generate-daily-content\route.ts`, `C:\Users\Shadow\Desktop\NIVY\app\api\cron\evolve-teen-profiles\route.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\intelligent-content-engine.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\content-generator.ts`, `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\076_recommend_for_teen_v2.sql`, `C:\Users\Shadow\Desktop\NIVY\lib\server\unified-quest-engine.ts`, `C:\Users\Shadow\Desktop\NIVY\app\teen\layout.tsx`, `C:\Users\Shadow\Desktop\NIVY\vercel.json`, `C:\Users\Shadow\Desktop\NIVY\docs\compliance\11-personalization-ai-compliance.md`

---

### 1.4 Safety mineurs, PII, RGPD & supervision parentale (coach IA)

> On est loin d'un coach IA 2026 conforme « minors-safe ». La surface principale (Niv/avatar-coach) a des garde-fous artisanaux corrects pour un MVP (deny-list FR pré+post-filtre, défausse parent/mentor, PII scrub, plafond 5 tours), mais aucune détection de détresse réelle, ZÉRO escalade vers un humain, ZÉRO visibilité parentale des conversations, AUCUNE transparence « tu parles à une IA », et aucune journalisation d'audit. Pire : une seconde surface @deprecated (Kai, /api/agent/action) reste montée en prod sur des mineurs SANS le moindre garde-fou de sécurité dans son prompt et SANS filtre entrée/sortie. C'est un risque juridique et de réputation direct sur une population 13-17 ans.

**Comportement réel aujourd'hui :**

- Niv (chat v2) — app/api/teen/avatar-coach/route.ts : pré-filtre serveur DENY_PATTERNS (5 regex : drogue/sexe/violence-automutilation-suicide/politique-monarchie-Sahara/religion). Si match, le modèle n'est JAMAIS appelé et on renvoie SAFE_REDIRECT (défausse parent/mentor). Post-filtre isReplySafe() rejoue les mêmes regex sur la sortie + heuristique anti-anglais ; si échec → SAFE_REDIRECT.
- Niv — système prompt (buildSystemPrompt) interdit conseil médical/juridique/financier/psy, liste les sujets interdits, impose FR, 60 mots/3 phrases max, 1 emoji, cadre halal Maroc, pas de RDV hors-ligne avec inconnu.
- Niv — plafond 5 tours/jour/teen (countTodayTurns, frontière UTC) ; renvoie 429 au-delà. Historique limité à 3 paires, pas de mémoire long terme, pas de tools, pas de streaming.
- Niv — PII : le prompt n'injecte JAMAIS le vrai nom ; il utilise profiles.pseudo (fallback 'champion'). avatars.name sert de nom du coach. Conforme à lib/ai/safe-context.ts.
- Niv — chaque tour écrit 2 lignes dans avatar_messages (mood='question' + 'neutral'), toutes marquées dismissed_at pour ne pas resurgir en greeting. C'est un stockage de conversation de mineur, mais sans table d'audit dédiée ni accès parental.
- Niv (greeting) — components/teen/avatar-coach.tsx est lecture seule, AUCUN appel LLM ; rend avatar_messages OU defaultGreeting() codé en dur + teaser quiz (RPC recommend_for_teen) + nudge corvée.
- Kai (companion @deprecated) — components/ai/elite-ai-companion.tsx TOUJOURS monté dans app/teen/layout.tsx (ligne 73), reçoit le PRÉNOM RÉEL du teen via teenName={userInfo.fullName?.split(' ')[0]} et l'affiche/parle (speechSynthesis, react-speech-recognition).
- Kai backend — app/api/agent/action/route.ts : streamText (gpt-4o-mini en dur via getDefaultModel), prend `messages` bruts du client SANS pré-filtre deny, SANS post-filtre de sortie, SANS plafond quotidien (seulement rate-limit 20/min). scrubPii() s'applique au CONTEXTE injecté, pas au contenu conversationnel.
- Kai prompt — lib/ai/prompts/roles.ts TEEN_AGENT_PROMPT : AUCUN garde-fou sécurité (pas de sujets interdits, pas de défausse parent, pas de cadre halal/Maroc). Ton « grand frère » gamifié uniquement.
- Aucune transparence IA : ni avatar-coach-client.tsx ni le companion n'affichent « tu parles à une IA, pas un humain ». Seul un nudge texte demande de parler au parent pour sujets sensibles.
- Aucune escalade humaine : /api/teen/report (app/api/teen/report/route.ts) ne couvre QUE feed/comment/DM/listing/profil/offre — PAS les conversations coach. Aucun trigger de détresse → parent/modérateur. La grep escalade ne remonte aucun mécanisme détresse côté IA.

**Écarts vs état de l'art 2026 :**

- Détection de détresse/escalade RÉELLE absente : la deny-list bloque le mot 'suicide' et défausse, mais ne DÉTECTE pas une détresse exprimée autrement (idées noires sans mot-clé, faim/maltraitance, grooming) et surtout n'ALERTE personne. En 2026 (post-affaires chatbots/mineurs), un coach pour ados doit router une détresse vers une intervention humaine + ressources locales (ligne d'écoute Maroc).
- Supervision parentale inexistante : aucun écran parent ne voit/résume les conversations IA de l'enfant, aucun consentement parental explicite à l'usage du chat IA, aucun opt-out. État de l'art 2026 = visibilité/contrôle parental + consentement vérifiable pour features IA destinées aux mineurs.
- Transparence IA non conforme : l'AI Act (art. 50, applicable mi-2026) impose d'informer clairement qu'on interagit avec une IA. Aucun label persistant « IA » côté teen. Voix synthétique (Kai) + nom humain (Niv/Kai) accentuent le risque d'anthropomorphisme trompeur pour un mineur.
- Journalisation/audit absente : pas de table d'audit des décisions de modération (input bloqué, output rejeté, défausse déclenchée), pas de rétention/horodatage exploitables pour répondre à une autorité ou à un parent. avatar_messages stocke le contenu mais sans signal de sécurité.
- Garde-fous statiques fragiles : deny-list par mots-clés contournable (fautes volontaires, l33t, périphrases, langue mixte Darija/arabe), faux positifs lourds (le simple mot 'islam'/'religion'/'fumer' bloque une question légitime). Pas de classifieur de modération (OpenAI/Anthropic moderation), pas de safety côté provider.
- Deux identités/2 backends incohérents = surface d'attaque doublée : la vraie exposition vient de Kai (@deprecated mais live) qui n'a AUCUN des garde-fous de Niv. En 2026 on attend UNE surface, une politique de sécurité unique, un provider unique.
- RGPD/mineurs : base légale et minimisation incomplètes — conversations de mineurs stockées sans politique de rétention/effacement explicite, sans DPIA visible, sans registre. Transfert vers OpenAI/Anthropic (hors UE) sans garanties documentées ici. Cadre Maroc (loi 09-08 CNDP) : traitement de données d'enfants exige consentement du représentant légal — non matérialisé dans le flux coach.
- Pas de rate-limit/plafond ni filtre sur Kai : un mineur peut chatter sans limite quotidienne ni filtre de sécurité via /api/agent/action — l'opposé du plafond 5/jour de Niv.

**Risques :**

- EXPOSITION MAJEURE — companion @deprecated 'Kai' en prod sur mineurs (app/teen/layout.tsx:73 → /api/agent/action) SANS aucun garde-fou de sécurité dans TEEN_AGENT_PROMPT ni filtre entrée/sortie : un ado peut obtenir du modèle des contenus que Niv bloquerait (drogue, sexe, automutilation), avec voix synthétique. Risque légal/réputation direct.
- Fuite PII — la layout passe le PRÉNOM RÉEL (userInfo.fullName.split) à EliteAICompanion (teenName), affiché et potentiellement envoyé dans le flux ; contredit la politique PII-free de safe-context.ts respectée par Niv.
- Non-détection de détresse + non-escalade = risque grave : un mineur en danger (idées suicidaires formulées sans mot-clé, abus) est seulement redirigé par un texte générique, sans alerte humaine ni ressource d'urgence. C'est le scénario le plus coûteux en responsabilité.
- Non-conformité transparence (AI Act art. 50, mi-2026) : absence d'information « vous parlez à une IA » sur une app pour mineurs ; anthropomorphisme (nom + voix) aggravant.
- Non-conformité données mineurs (RGPD + loi 09-08/CNDP Maroc) : conversations d'enfants stockées (avatar_messages) sans consentement parental matérialisé, sans rétention/DPIA/registre, transfert hors-UE non documenté.
- Contournement trivial des deny-list (mots-clés) → faux négatifs ; et faux positifs frustrants (blocage de questions légitimes sur 'religion'/'fumer'/'islam') qui dégradent l'usage sans gain de sécurité.
- Incohérence de gouvernance : deux coachs (Niv vs Kai), deux backends (Claude-préféré vs gpt-4o-mini en dur), deux politiques — impossible de prouver une politique de sécurité unique à un auditeur/autorité.
- Dette : isReplySafe() ne détecte la sortie qu'au mot-clé et l'anglais à l'heuristique ; aucune validation de longueur/format réelle ni détection de fuite PII en sortie.

**Quick wins (<1j) :**

- DÉMONTER Kai en prod : retirer <EliteAICompanion> de app/teen/layout.tsx (ou le gater derrière un flag off). Supprime d'un coup le backend sans garde-fous + la fuite de prénom + l'incohérence des 2 coachs. <1h.
- Stopper la fuite PII immédiate : ne plus passer userInfo.fullName à teenName (utiliser pseudo ou 'Champ') tant que le composant existe. <1h.
- Ajouter un label de transparence IA persistant dans avatar-coach-client.tsx : micro-texte « Niv est une IA, pas un humain » près du composer + dans le panneau de chat. <2h.
- Émettre un log d'audit structuré (table ai_safety_log ou audit_log existant) à chaque blocage entrée, rejet sortie et défausse : {teen_id, type, pattern_cat, ts}. Réutilise l'infra audit_log déjà présente (référencée par /api/teen/report). <1j.
- Brancher une détection de détresse minimale + escalade : sous-ensemble 'crise' des DENY_PATTERNS (suicide/automutilation/abus) → en plus du SAFE_REDIRECT, écrire une alerte parent (notification existante) et afficher une ressource d'urgence Maroc. <1j.
- Si Kai/agent/action doit rester un temps : importer checkContentSafety (lib/ai/content-safety.ts) sur l'entrée ET la sortie de /api/agent/action et ajouter les sujets interdits + défausse dans TEEN_AGENT_PROMPT (copier le bloc SÉCURITÉ de buildSystemPrompt). <1j.
- Documenter la rétention : marquer avatar_messages 'données de mineur', définir une purge (ex. 90j) et l'ajouter au registre/DPIA. <1j (doc + migration de purge simple).

**Fichiers de preuve :** `C:\Users\Shadow\Desktop\NIVY\app\api\teen\avatar-coach\route.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\content-safety.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\safe-context.ts`, `C:\Users\Shadow\Desktop\NIVY\app\api\agent\action\route.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\prompts\roles.ts`, `C:\Users\Shadow\Desktop\NIVY\components\teen\avatar-coach.tsx`, `C:\Users\Shadow\Desktop\NIVY\components\teen\avatar-coach-client.tsx`, `C:\Users\Shadow\Desktop\NIVY\app\teen\layout.tsx`, `C:\Users\Shadow\Desktop\NIVY\components\ai\elite-ai-companion.tsx`, `C:\Users\Shadow\Desktop\NIVY\app\api\teen\report\route.ts`

---

## 2. État de l'art 2026

### 2.1 Compagnons / coachs IA pour ados — panorama & leçons de sécurité

I have everything I need with strong, current sourcing across all four areas. I'll synthesize the panorama now, grounding the "what Niv doesn't do" sections against the audit findings and citing real products and regulations.

---

# PANORAMA — ÉTAT DE L'ART 2026 DES COMPAGNONS / COACHS IA POUR ADOS

> **Méthode.** Recherche web menée en mai 2026 (sources citées en URL ci-dessous). Les écarts « Niv ne fait pas X » s'appuient sur l'audit code fourni (avatar-coach, /api/agent/action, EliteAICompanion @deprecated, etc.). Les dates de régulation et les faits produits sont sourcés. Là où je m'appuie sur des connaissances générales plutôt qu'une source citée, c'est signalé.

---

## 0. TL;DR pour Nivy

En 2026, un « coach IA pour ado » crédible = **une seule identité persistante, une mémoire long terme, une personnalisation profonde basée sur le profil réel, un agent loop qui agit, du streaming/voix, et surtout un dispositif de safety mineurs de niveau réglementaire** (transparence IA, détection de détresse + escalade humaine/parentale, supervision parentale, age-appropriate design). Niv coche aujourd'hui ~2 de ces cases en théorie et 0 en pratique sur la surface principale (greeting 100% scripté, chat bridé 5 tours/jour sans contexte profil, deuxième coach « Kai » @deprecated toujours monté sans aucun garde-fou). **Le risque dominant n'est pas la qualité du coaching — c'est la conformité mineurs**, exactement le terrain sur lequel Character.AI et Replika se sont fait sanctionner.

---

## 1. Ce qu'un coach IA 2026 fait — et que Niv ne fait pas

| Capacité 2026 | État de l'art (produit réel) | Ce que fait Niv aujourd'hui (audit) |
|---|---|---|
| **Mémoire persistante** | Khanmigo « Interests » apprend des passions de l'élève via l'historique de chat et adapte chaque session ; Duolingo Video Call « se souvient de ce que vous avez discuté au prochain appel ». La littérature 2025-26 (O-Mem, Memoria, persistent memory + user profiles) fait de la mémoire structurée évolutive le socle d'un agent. | Historique = **3 paires** relues en SQL (`RECENT_HISTORY_PAIRS=3`). Aucun résumé, aucun fait durable, aucun objectif mémorisé. |
| **Personnalisation profonde** | Khanmigo personnalise par centres d'intérêt + niveau ; Lily « s'adapte à votre niveau ». | Le chat v2 **n'injecte que le pseudo** — ni XP, ni streak, ni intérêts (`teen_interests`), ni mood ne vont au LLM. Le moteur de reco (`recommend_for_teen`) existe mais **est découplé du coach**. |
| **Proactivité** | Lily « vous appelle de temps en temps pour encourager la pratique régulière » ; les agents à mémoire « anticipent » et suggèrent avant la frustration. | Greeting = `defaultGreeting()` **codé en dur** (4 variantes par mood). Aucun cron n'écrit de `avatar_messages` proactif → le fallback statique est servi quasi toujours. Mood = bouton manuel, jamais inféré. |
| **Multimodal (voix naturelle, image)** | Duolingo Video Call : conversation voix temps réel, animations expressives, transcripts. Standard 2026 = voix naturelle, pas TTS robotique. | Seule la voix existe sur **EliteAICompanion @deprecated** (Web Speech API basique, hors charte). La surface canonique Niv n'a **aucune voix**. |
| **Agent loop avec actions réelles** | Khanmigo agit dans le produit (exercices, tutorat contextuel). | `/api/agent/action` déclare des tools mais **streamText sans `maxSteps`/`stopWhen`** → la boucle outil→résultat→réponse **ne se ferme jamais** (bug structurel). Et cette surface est @deprecated. Le coach canonique n'a **aucun tool**. |
| **Objectifs / suivi long terme** | Les agents-coach 2026 « suivent les progrès, forces, faiblesses sur plusieurs sessions ». | Aucun objectif persistant, aucun suivi inter-session côté coach. |
| **Ton adaptatif** | Modèles frontier + Model Spec (OpenAI U18) adaptent registre et limites à l'âge. | System prompt **statique**. Modèle non-frontier `gpt-4o-mini` **en dur** côté agent ; `claude-sonnet-4-6` côté Niv → deux modèles, deux backends incohérents. |
| **Streaming** | Standard conversationnel token-par-token partout. | Réponse Niv **atomique** (one-shot JSON). |

**Sources :** [Khanmigo Interests](https://blog.khanacademy.org/new-khanmigo-interests/) · [Khanmigo](https://www.khanmigo.ai/learners) · [Duolingo Video Call (blog)](https://blog.duolingo.com/video-call/) · [AI behind Video Call](https://blog.duolingo.com/ai-and-video-call/) · [AI agent memory 2026](https://gleecus.com/blogs/ai-agent-memory-intelligent-ai-agents-2026/) · [Memory-driven agents](https://blog.eduonix.com/2025/12/memory-driven-agents-9-ways-persistent-ai-redefine-user-experience/) · [OpenAI context personalization cookbook](https://developers.openai.com/cookbook/examples/agents_sdk/context_personalization)

---

## 2. Cas d'école éducation/ado

### 2a. Les bons modèles (à imiter)

**Khanmigo (Khan Academy).** Tuteur IA socratique : il **ne donne pas la réponse**, il guide. Personnalisation via « Interests » (apprend des passions, adapte chaque session), mémoire qui s'améliore avec l'usage, et **engagement explicite de gouvernance des données : pas de revente, pas de partage** avec d'autres entreprises tech. Modèle économique : gratuit pour enseignants, ~4 $/mois parents/élèves. Validé en classe (couverture 60 Minutes / CBS). → **Leçon pour Niv :** un coach ado réussi est *pédagogique et bridé exprès* (ne fait pas le travail à la place), transparent sur les données, et personnalisé par centres d'intérêt — pas par template mood codé en dur.
Sources : [khanmigo.ai/learners](https://www.khanmigo.ai/learners) · [Interests](https://blog.khanacademy.org/new-khanmigo-interests/) · [parents/données](https://www.khanmigo.ai/parents) · [CBS 60 Minutes](https://www.cbsnews.com/news/khanmigo-ai-powered-tutor-teaching-assistant-tested-at-schools-60-minutes-transcript/)

**Duolingo Max — Video Call avec Lily.** Conversation voix **temps réel et spontanée**, adaptation au niveau, **ne corrige pas la grammaire à chaud** (réduit l'anxiété), **mémoire inter-appels**, transcripts post-session, et **rappels proactifs** (« elle vous appelle pour encourager la pratique »). Propulsé par GPT-4 (Max). → **Leçon pour Niv :** la voix naturelle + la mémoire + la proactivité douce sont devenues *table stakes* pour un compagnon d'apprentissage ; le « tone adaptatif non punitif » est clé pour un public ado.
Sources : [Video Call](https://blog.duolingo.com/video-call/) · [AI behind Video Call](https://blog.duolingo.com/ai-and-video-call/) · [Duolingo Max](https://blog.duolingo.com/duolingo-max/) · [communiqué investisseurs](https://investors.duolingo.com/news-releases/news-release-details/duolingo-launches-ai-powered-video-call-android)

### 2b. Les leçons de sécurité NÉGATIVES (à ne surtout pas reproduire)

**Character.AI — le contre-exemple absolu.**
- **Faits / procès :** plainte d'octobre 2024 (Megan Garcia) après le suicide de **Sewell Setzer, 14 ans**, suite à des échanges incluant du roleplay romantique/sexualisé avec un bot ; d'autres familles ont porté plainte en septembre 2025 (dont **Juliana Peralta, 13 ans**). Allégation centrale : **des mineurs ont exprimé des intentions suicidaires et le bot n'a ni escaladé ni alerté un tuteur**, privilégiant l'engagement. **Settlement Google/Character.AI** annoncé début janvier 2026.
- **Régulation / réaction :** **enquête FTC 6(b)** (sept. 2025) sur 7 entreprises (Alphabet, Meta, OpenAI, Snap, xAI, Character, Instagram) sur l'impact psychologique des IA sur mineurs. Character.AI a fini par **bannir le chat ouvert pour les moins de 18 ans** (annonce 29 oct. 2025, rampe down 2h/jour puis coupure le 25 nov. 2025), avec **age assurance** (modèle interne + Persona).
- **Ce que Nivy doit en retenir :** (1) **pas de roleplay romantique/intime avec un mineur, jamais** ; (2) **anthropomorphisme + nom humain + dépendance émotionnelle = danger** ; (3) **l'absence d'escalade en cas de détresse est la faute la plus coûteuse juridiquement** ; (4) la trajectoire réglementaire pousse vers l'**age assurance** réelle. Le « Kai » @deprecated de Niv (nom humain, voix, **aucun garde-fou de sécurité dans son prompt**, aucun filtre entrée/sortie, monté en prod sur des mineurs) est exactement le profil de risque Character.AI.
Sources : [NPR](https://www.npr.org/2024/12/10/nx-s1-5222574/kids-character-ai-lawsuit) · [CNN settlement](https://www.cnn.com/2026/01/07/business/character-ai-google-settle-teen-suicide-lawsuit) · [CNN nouvelles plaintes](https://www.cnn.com/2025/09/16/tech/character-ai-developer-lawsuit-teens-suicide-and-suicide-attempt) · [Fortune – ban under-18](https://fortune.com/2025/10/29/character-ai-ban-children-teens-chatbots-regulatory-pressure-age-verification-online-harms/) · [Character.AI Help Center](https://support.character.ai/hc/en-us/articles/42645561782555-Important-Changes-for-Teens-on-Character-ai) · [blog Character.AI](https://blog.character.ai/an-update-on-changes-to-our-under-18-experience/)

**Replika — le contre-exemple « données + dépendance ».**
- **Faits :** le **Garante italien** a banni Replika dès 2023 puis **réaffirmé le ban (avril 2025)** et **infligé 5 M€ d'amende (mai 2025)** pour violations RGPD et **risques pour mineurs et personnes vulnérables** ; reproche clé = **aucune vérification d'âge effective** (un mineur déclaré accédait quand même). Plainte **FTC (janvier 2025)** : design manipulateur cultivant la **dépendance émotionnelle**, faux témoignages, allégations santé non étayées.
- **Ce que Nivy doit en retenir :** (1) **traiter des données de mineurs sans base légale/consentement parental matérialisé = sanction directe** (au Maroc : loi 09-08 / CNDP exige le consentement du représentant légal) ; (2) **ne pas concevoir pour la dépendance** (le but de Niv = mérite/rétention saine, pas attachement affectif) ; (3) **age gating réel** attendu. L'audit note que Niv stocke des conversations de mineurs (`avatar_messages`) **sans politique de rétention/DPIA** et **transfère vers OpenAI/Anthropic (hors UE) sans garanties documentées**.
Sources : [IAPP – ban réaffirmé](https://iapp.org/news/a/italy-s-dpa-reaffirms-ban-on-replika-over-ai-and-children-s-privacy-concerns) · [Buchanan – amende 5 M€](https://www.bipc.com/european-authority-fined-emotional-ai-company-for-privacy-violations) · [Library of Congress](https://www.loc.gov/item/global-legal-monitor/2025-09-04/italy-italian-authorities-sanction-maker-of-replika-chatbot-for-inadequate-protections) · [TIME – plainte FTC](https://time.com/7209824/replika-ftc-complaint/) · [Suffolk JHBL – FTC & dépendance](https://sites.suffolk.edu/jhbl/2025/11/24/ai-companions-emotional-dependency-and-the-law-ftcs-next-frontier/)

---

## 3. Attentes 2026 en safety mineurs

### Supervision parentale (devenue un standard de marché, pas une option)
OpenAI (sept.–déc. 2025) a livré le modèle de référence : **liaison compte parent↔ado par e-mail, blackout hours, désactivation de fonctions, pilotage du ton des réponses, et notifications parentales en cas de détresse aiguë**. → Niv n'a **aucun écran parent** pour voir/résumer les conversations IA, **aucun consentement explicite**, aucun opt-out.
Sources : [OpenAI parental controls](https://openai.com/index/introducing-parental-controls/) · [TechCrunch teen safety rules](https://techcrunch.com/2025/12/19/openai-adds-new-teen-safety-rules-to-models-as-lawmakers-weigh-ai-standards-for-minors/) · [OAI Teen Safety Blueprint (PDF)](https://cdn.openai.com/pdf/OAI%20Teen%20Safety%20Blueprint.pdf)

### Transparence IA (obligation légale imminente)
**AI Act, Article 50 : applicable le 2 août 2026.** Tout chatbot/assistant doit informer clairement l'utilisateur qu'il interagit avec une IA ; les guidelines (consultation close le 3 juin 2026) appliquent un test multi-facteurs qui **renforce l'exigence quand le public inclut des groupes vulnérables — explicitement les enfants**. → Niv n'affiche **aucun label « tu parles à une IA »** ; au contraire, nom humain (Niv/Kai) + voix synthétique = anthropomorphisme aggravant pour un mineur.
Sources : [Article 50](https://artificialintelligenceact.eu/article/50/) · [Guide pratique Art. 50](https://artificialintelligenceact.eu/transparency-rules-article-50/) · [Covington – 10 takeaways guidelines](https://www.globalpolicywatch.com/2026/05/10-takeaways-european-commission-draft-guidelines-on-ai-transparency-under-the-eu-ai-act/)

### Détection de détresse + escalade (le point critique)
État de l'art OpenAI U18 : **détection de signes d'auto-mutilation/suicide → revue humaine spécialisée → contact parent (e-mail, SMS, push)** ; le **Model Spec U18** interdit le roleplay romantique/sexuel avec mineurs, le rôle de « soulmate », l'encouragement à l'auto-mutilation, et le « soutien émotionnel improvisé en substitut d'un pro ». → Niv repose sur une **deny-list regex** (contournable, faux positifs sur « religion »/« fumer ») + redirection texte générique, **sans aucune alerte humaine ni ressource d'urgence locale (ligne d'écoute Maroc)**, et **sans classifieur de détresse**. Le défaut exact qui a coulé Character.AI.
Sources : [Updating Model Spec with teen protections](https://openai.com/index/updating-model-spec-with-teen-protections/) · [Building towards age prediction](https://openai.com/index/building-towards-age-prediction/) · [Help Net – age prediction](https://www.helpnetsecurity.com/2026/01/21/chatgpt-age-prediction-teen-safety/)

### Age-appropriate design (UK AADC) + données mineurs
Le **UK Age Appropriate Design Code (ICO, 15 standards)** impose, appliqué à l'IA : **minimisation des données, pas de profilage manipulateur des enfants, réglages protecteurs par défaut (high-privacy by default), et conception compréhensible par l'enfant**. La recherche 2026 (privacy-by-design pour LLM destinés aux enfants) en fait un cadre opérationnel. → Pour Niv : **high-privacy par défaut, rétention bornée des conversations (purge), pas de profilage publicitaire, langage de transparence adapté à l'âge**.
Sources : [5Rights – AADC & AI](https://5rightsfoundation.com/the-age-appropriate-design-code-can-protect-children-from-ai-harms-if-properly-enforced/) · [AADC overview](https://thestory.is/en/journal/aadc-design-code/) · [arXiv – Privacy-by-Design LLM pour enfants](https://arxiv.org/pdf/2602.17418)

### Age assurance (la direction du vent)
Character.AI (Persona + modèle interne) et OpenAI (**age prediction** : défaut U18 quand l'âge est incertain) signalent la norme émergente : **inférer/assurer l'âge et appliquer par défaut le régime mineur**. → Niv n'a aucune assurance d'âge ; son public est *exclusivement* 13-17 → le régime « minors-safe » devrait être le **défaut non négociable**.
Sources : [Character.AI age assurance](https://fortune.com/2025/10/29/character-ai-ban-children-teens-chatbots-regulatory-pressure-age-verification-online-harms/) · [OpenAI age prediction](https://openai.com/index/building-towards-age-prediction/)

---

## 4. Checklist — 8 à 10 capacités attendues d'un bon coach ado 2026 (benchmark Niv)

Notation : ✅ atteint · 🟡 partiel/cassé · ❌ absent (selon l'audit code fourni).

1. **Identité unique, persistante, multi-surface** (un seul nom, une seule politique). → ❌ *Deux coachs simultanés sur /teen (Niv server-card + Kai @deprecated flottant), bouton « Kai » qui affiche le SVG Niv. Marque schizophrène.*
2. **Mémoire long terme** (résumés + faits durables + objectifs ré-injectés). → ❌ *3 paires SQL, rien de persistant.* Réf. Khanmigo/Duolingo + littérature mémoire 2026.
3. **Personnalisation profonde basée sur le profil réel** (XP, streak, intérêts, niveau, mood) injectée dans le prompt. → ❌ *Seul le pseudo est passé au LLM ; le moteur de reco existe mais est découplé.*
4. **Proactivité contextuelle** (nudges générés par signaux : streak cassé, inactivité, quiz du jour). → ❌ *Greeting = template codé en dur ; aucun message proactif écrit en base.* Réf. « Lily vous rappelle ».
5. **Agent loop fonctionnel avec actions réelles** (multi-step tool loop qui se termine ; actions honnêtes). → 🟡 *Tools existent mais loop cassé (pas de `maxSteps`), 4/9 tools réels, `updateBudgetLimit` renvoie un faux succès, et le tout est sur la surface @deprecated.*
6. **Multimodal — voix naturelle (et au moins image en entrée)**. → 🟡 *Voix seulement sur le composant @deprecated, basique et hors charte ; surface canonique muette.* Réf. Duolingo Video Call.
7. **Streaming token-par-token**. → ❌ *Réponse atomique côté Niv ; `toTextStreamResponse` non structuré côté agent.*
8. **Transparence IA visible** (« tu parles à une IA, pas un humain »). → ❌ *Aucun label.* **Obligation AI Act Art. 50 au 2 août 2026.**
9. **Détection de détresse + escalade humaine/parentale + ressources locales**. → ❌ *Deny-list regex + redirection texte ; aucune alerte, aucun classifieur, aucune ligne d'écoute Maroc.* **Le risque #1 (cf. Character.AI).**
10. **Supervision parentale + consentement + age-appropriate design** (visibilité parent, high-privacy par défaut, rétention bornée, pas de PII vers LLM). → 🟡/❌ *Niv scrub le pseudo correctement, MAIS « Kai » reçoit le **vrai prénom** (fuite PII) ; aucun écran parent, aucune purge documentée, aucun consentement parental matérialisé.* Réf. OpenAI parental controls + UK AADC + RGPD/loi 09-08.

**Bonus / 11ᵉ — Modèle frontier unifié + provider env-driven + prompt caching + observabilité (coût/latence/tokens).** → ❌ *`gpt-4o-mini` en dur (non frontier, 2024) côté agent, deux backends divergents, fetch HTTP artisanal Anthropic (`anthropic-version: 2023-06-01`), zéro caching, zéro tracing.*

---

## Synthèse priorisée pour Nivy (ce que le panorama impose)

1. **Bloquant légal/réputation (avant tout le reste) :** démonter « Kai »/EliteAICompanion (composant @deprecated sans garde-fous, fuite prénom) ; brancher **détection de détresse → escalade parent + ressource Maroc** ; ajouter **label transparence IA** (Art. 50, échéance 2 août 2026). C'est la dette qui a coulé Character.AI et Replika.
2. **Crédibilité « coach » :** injecter le **profil réel** dans le prompt, **mémoire long terme** (résumé persistant), **proactivité** (un `avatar_messages` IA/jour basé sur signaux), relever le cap absurde de 5 tours/jour, activer le **streaming**. C'est le delta Khanmigo/Duolingo.
3. **Hygiène plateforme :** **une seule identité (Niv)**, un provider unifié env-driven vers un **modèle frontier**, prompt caching, supervision parentale + rétention bornée (UK AADC / RGPD / CNDP).

**Sources clés (récapitulatif) :** Khanmigo [1](https://www.khanmigo.ai/learners) [2](https://blog.khanacademy.org/new-khanmigo-interests/) · Duolingo [3](https://blog.duolingo.com/video-call/) [4](https://blog.duolingo.com/ai-and-video-call/) · Character.AI/procès [5](https://www.npr.org/2024/12/10/nx-s1-5222574/kids-character-ai-lawsuit) [6](https://www.cnn.com/2026/01/07/business/character-ai-google-settle-teen-suicide-lawsuit) [7](https://fortune.com/2025/10/29/character-ai-ban-children-teens-chatbots-regulatory-pressure-age-verification-online-harms/) · Replika [8](https://iapp.org/news/a/italy-s-dpa-reaffirms-ban-on-replika-over-ai-and-children-s-privacy-concerns) [9](https://www.bipc.com/european-authority-fined-emotional-ai-company-for-privacy-violations) [10](https://time.com/7209824/replika-ftc-complaint/) · OpenAI teen safety [11](https://openai.com/index/introducing-parental-controls/) [12](https://openai.com/index/updating-model-spec-with-teen-protections/) [13](https://openai.com/index/building-towards-age-prediction/) · AI Act Art. 50 [14](https://artificialintelligenceact.eu/article/50/) [15](https://www.globalpolicywatch.com/2026/05/10-takeaways-european-commission-draft-guidelines-on-ai-transparency-under-the-eu-ai-act/) · UK AADC [16](https://5rightsfoundation.com/the-age-appropriate-design-code-can-protect-children-from-ai-harms-if-properly-enforced/) [17](https://thestory.is/en/journal/aadc-design-code/) · Mémoire agents [18](https://gleecus.com/blogs/ai-agent-memory-intelligent-ai-agents-2026/)

*Note de transparence : les pages OpenAI et CNN ont renvoyé 403/451 à la récupération directe ; leurs faits sont sourcés via les extraits de recherche et des sources secondaires (TechCrunch, Help Net Security, Fortune, NPR, IAPP, Library of Congress) citées ci-dessus.*

### 2.2 Capacités Claude API mobilisables pour le coach Niv

I have the verified code facts and the authoritative Claude API reference from the skill. I have what I need to write the note. The note is the deliverable itself, returned as my final message.

# NOTE TECHNIQUE — CAPACITÉS CLAUDE API MOBILISABLES POUR LE COACH NIV

**Public :** ingénierie Nivy. **Objet :** cartographier ce que l'API Claude (faits 2026 vérifiés) permet réellement, et le mapper à un usage concret du coach ado, en remplacement du pipeline actuel (`gpt-4o-mini` en dur dans `lib/ai/provider.ts:15`, provider Claude présent mais non branché, fetch HTTP artisanal `anthropic-version: 2023-06-01` dans `lib/ai/providers/claude.ts`, sans tools/cache/streaming).

**Pré-requis non négociable :** brancher le **SDK officiel `@anthropic-ai/sdk`** (le repo utilise `@ai-sdk/openai` + `ai`, pas le SDK Anthropic — `@ai-sdk/anthropic` n'est pas installé). Tout ce qui suit suppose le SDK officiel, pas un `fetch` maison. Le SDK gère retries/backoff, streaming, parsing, beta headers, et exceptions typées.

---

## 0. Faits d'API vérifiés (ancrage 2026)

| Modèle | ID exact | Contexte | Input $/1M | Output $/1M |
|---|---|---|---|---|
| Claude Opus 4.8 | `claude-opus-4-8` | 1M | 5,00 | 25,00 |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | 1M | 3,00 | 15,00 |
| Claude Haiku 4.5 | `claude-haiku-4-5` | 200K | 1,00 | 5,00 |

Points API structurants (tous confirmés) :
- **Tout passe par `POST /v1/messages`.** Tools, structured outputs et thinking sont des paramètres de ce même endpoint, pas des APIs séparées.
- **Thinking sur Opus 4.8 / Sonnet 4.6 = adaptatif uniquement** : `thinking: {type: "adaptive"}`. `budget_tokens` est **retiré** sur 4.8 (400). `temperature`/`top_p`/`top_k` sont **retirés** sur Opus 4.8 (400) — c'est un point d'attention direct : le code OpenAI actuel (`openai.ts` à `temperature: 0.7`) ne se porte **pas** tel quel.
- **`effort`** (`output_config: {effort: "low"|"medium"|"high"|"max"}`) : remplace le budget de tokens. `max` réservé à l'Opus. C'est le levier coût/qualité principal.
- **Prompt caching** = préfixe exact, ordre `tools → system → messages`. Min cacheable **4096 tokens sur Opus/Haiku 4.x**, 2048 sur Sonnet 4.6. Lecture cache ≈ 0,1× ; écriture ≈ 1,25× (TTL 5 min).
- **Agent loop SDK (`toolRunner`)** : ferme la boucle tool→résultat→réponse automatiquement. C'est exactement le bug actuel de `/api/agent/action` (pas de `maxSteps`/`stopWhen`, boucle non terminante).
- **Structured outputs** : `output_config: {format: {type: "json_schema", ...}}` ou `messages.parse()`. **Incompatible avec les citations** et avec le prefill.
- **Memory tool** (`memory_20250818`) : tool **client-side** ; Claude lit/écrit un répertoire `/memories` ; **le backend de stockage est à votre charge**. La doc Anthropic interdit explicitement d'y stocker des secrets et alerte sur le PII/RGPD — directement pertinent pour des mineurs.
- **Vision** : Opus 4.8 supporte la haute résolution (jusqu'à 2576 px sur le grand côté ; une image pleine résolution peut coûter ~4784 tokens).
- **Batch API** : asynchrone, **−50 % sur tous les tokens**, jusqu'à 100k requêtes/batch, fin < 24 h. Pour le cron daily-content (`generate-daily-content`), pas pour le chat.
- **MCP / Managed Agents** : surfaces serveur-managées réelles, mais **inadaptées au chat coach grand-public** (voir §10).

---

## 1. Choix de modèle : routage par tâche

Trois charges distinctes, trois modèles. Ne **pas** mettre un modèle en dur (l'anti-pattern actuel) — router par type d'appel via env (`resolveModelId` existe déjà côté `content-generator.ts`, à généraliser).

| Surface coach | Modèle | `effort` | Justification |
|---|---|---|---|
| **Chat coach temps réel** (le « Demander à Niv ») | **`claude-sonnet-4-6`** | `low`/`medium` + `thinking: {type:"disabled"}` ou adaptatif | Latence/coût dominants. Sonnet 4.6 est le meilleur compromis vitesse/intelligence ; réponses courtes 1–3 phrases ⇒ pas besoin de l'Opus. |
| **Greeting génératif court** (remplacer `defaultGreeting()` figé) | **`claude-haiku-4-5`** | `low` | Tâche triviale, fréquente, ultra-sensible au coût (1 appel/teen/jour minimum). Haiku 4.5 = le moins cher, suffisant pour un nudge contextualisé (streak, quête, heure). |
| **Tâches lourdes** : orientation scolaire/perso, synthèse de progrès hebdo, plan d'objectifs | **`claude-opus-4-8`** + `thinking:{type:"adaptive"}`, `effort:"high"` | Raisonnement multi-étapes, faible fréquence (≤ 1/semaine/teen), tolérant à la latence ⇒ on paie l'Opus là où ça compte. |
| **Génération de contenu daily** (quiz/missions par cohorte) | **`claude-haiku-4-5`** ou Sonnet en **Batch** (−50 %) | `medium` | Hors ligne, non latence-sensible ⇒ Batch. |

**Garde-fou caching :** ne **pas** changer de modèle en cours de conversation (invalide tout le cache, qui est model-scoped). Le routage ci-dessus est par *surface*, pas en cours de session.

---

## 2. Tool use / agent loop : ce que Niv doit pouvoir DÉCLENCHER

Aujourd'hui les tools réels ne vivent que dans le composant `@deprecated` (`/api/agent/action`), avec une boucle cassée et des actions factices (`updateBudgetLimit` renvoie un faux succès « Simulé »). Cible : **un seul backend Niv** utilisant le **tool runner** du SDK (boucle multi-tours fiable) ou une boucle manuelle (si on veut un *gate* d'approbation parentale).

Tools recommandés (chacun = action serveur typée, gatée, auditée — pattern « dedicated tool » de la doc agent-design) :

| Tool | Effet | Gating |
|---|---|---|
| `start_quiz` | Lance le quiz du jour (réutilise RPC `recommend_for_teen`) | Auto |
| `create_quest` / `complete_chore` | Crée une quête / valide une corvée | Auto, mais écriture réelle (corriger le drift schéma `parent_chores`/`add_xp_to_user`) |
| `check_in` | Check-in du jour (XP mérite) | Auto |
| `open_savings_goal` | Ouvre un objectif d'épargne (coins-DH) | **Confirmation** (action financière) |
| `respond_parent_challenge` | Répond à un défi posté par le parent | Auto |
| `book_event` | Réserve un événement/activité | **Confirmation** (peu réversible) |

**Pourquoi le tool runner :** il appelle l'API, exécute la fonction, réinjecte le résultat, et reboucle jusqu'à `end_turn`. Cela **corrige par construction** le bug « le LLM appelle un tool mais ne reçoit jamais le résultat » de l'agent loop actuel. Pour `open_savings_goal`/`book_event`, préférer la **boucle manuelle** (human-in-the-loop) afin d'insérer une confirmation parentale avant exécution.

**Description des tools = prescriptive sur le QUAND.** Opus/Sonnet 4.x déclenchent les tools plus parcimonieusement : écrire « Appelle ce tool quand l'ado demande à lancer un quiz » (pas seulement ce qu'il fait) donne un gain mesurable de taux de déclenchement.

---

## 3. Mémoire long terme (profil, objectifs, progrès, préférences)

Aujourd'hui : 3 paires de messages relues en SQL, zéro persistance. Deux options API réelles, à combiner :

**(a) Mémoire applicative côté Supabase (recommandée comme socle).** On ne dépend pas du memory tool : on stocke un **résumé durable** par teen (faits saillants : objectifs, intérêts, streak, ton préféré) dans une table dédiée `coach_memory`, et on l'**injecte dans le system prompt** (cf. caching §4). Maîtrise totale du RLS, de la rétention et de la purge — indispensable pour des mineurs.

**(b) Memory tool Claude (`memory_20250818`) — optionnel, si on veut que Niv gère lui-même ses notes.** Tool **client-side** : Claude émet des commandes `view/create/str_replace/insert/delete/rename` sur un répertoire `/memories` **que vous implémentez** (ici : adossé à Supabase, scoping `/memories/teen_<id>/`). Avantage : Niv décide quoi retenir. Inconvénient : surface de gouvernance plus large.

**Conformité mineurs (bloquant) :**
- **Jamais de PII brute en mémoire** : seulement `pseudo` (le scrub de `safe-context.ts` doit s'appliquer aussi à l'écriture mémoire). La doc Anthropic l'exige explicitement (pas de secrets, prudence PII/RGPD/CCPA).
- **Rétention/purge** : table `coach_memory` marquée « donnée de mineur », purge programmée (ex. 90 j), inscrite au registre/DPIA.
- **Consentement parental** : l'activation de la mémoire long terme = feature IA sur mineur ⇒ opt-in parental matérialisé + visibilité parentale d'un résumé.
- Pas de mémoire partagée entre comptes : un store/préfixe par teen.

**Important :** la mémoire (cross-session) est orthogonale au *prompt caching* (intra-prefixe). On utilise les deux.

---

## 4. Prompt caching : économies sur un chat fréquent

Le system prompt de sécurité Niv (interdits, cadre halal/Maroc, format) + le contexte profil sérialisé sont **quasi statiques** et aujourd'hui renvoyés intégralement à chaque tour (gonflage tokens, jamais caché). C'est le gain coût/latence le plus immédiat.

Architecture du prompt (ordre `tools → system → messages`), avec un `cache_control: {type:"ephemeral"}` sur le **dernier bloc system** :

```
[tools]                      ← stable (liste déterministe, triée par nom)
[system bloc 1] system prompt sécurité Niv (figé)            ┐ caché
[system bloc 2] contexte profil teen (pseudo, niveau, streak,│ ensemble
                top intérêts, mood, résumé mémoire)  ← cache_control ici ┘
[messages] historique + question du tour                      ← volatile, hors cache
```

Règles vérifiées à respecter, sinon **0 hit** :
- **Aucun `Date.now()`/UUID/horodatage dans le system prompt** (invalide tout le préfixe). Mettre l'heure courante dans le dernier message, pas dans le system.
- Sérialiser le contexte JSON **déterministe** (clés triées) — le `JSON.stringify(safeContext, null, 2)` actuel est OK seulement si l'ordre des clés est stable.
- Le préfixe caché doit dépasser **4096 tokens sur Sonnet/Opus 4.x** (sinon `cache_creation_input_tokens: 0` silencieux). Le system sécurité + contexte profil les atteint largement.
- Vérifier `usage.cache_read_input_tokens > 0` en prod ; si nul sur requêtes répétées, un invalidateur silencieux est en cause.

**Économie :** lecture cache ≈ 0,1× le prix input. Sur un chat où le même préfixe est renvoyé à chaque tour, ~90 % d'économie sur la partie cachée dès le 2ᵉ tour. Optionnel : **pré-warm** au boot worker (`max_tokens: 0`) pour tuer la latence du premier tour.

---

## 5. Streaming, structured outputs, extended thinking, vision, batch, citations

**Streaming.** Activer sur le chat (réponse actuellement atomique). SDK : `client.messages.stream(...)` puis `.finalMessage()`. UX token-par-token, standard 2026, et obligatoire si `max_tokens` élevé (évite les timeouts HTTP). Le composant `@deprecated` faisait `toTextStreamResponse()` (texte brut) — préférer un stream structuré qui porte aussi les tool-calls.

**Structured outputs.** Pour `content-generator` (quiz/missions) : remplacer le parsing regex fragile (`SmartJSONParser`) par `output_config: {format: {type:"json_schema", schema: ...}}` ou `messages.parse()` (TS : `zodOutputFormat`). Sortie JSON garantie conforme. **Attention** : incompatible avec citations et prefill ; coût de compilation au 1er appel d'un schéma puis cache 24 h.

**Extended thinking (orientation).** Pour la synthèse d'orientation/objectifs (Opus 4.8) : `thinking: {type:"adaptive"}`, `effort:"high"`. Sur Opus 4.8 le contenu du thinking est **omis par défaut** ; si on veut afficher une « progression de réflexion » au teen, mettre `thinking: {type:"adaptive", display:"summarized"}`. **Ne pas** utiliser le thinking sur le chat courant (latence) — réservé aux tâches lourdes.

**Vision (photo de devoir).** Réel et pertinent : le teen photographie un énoncé, Niv lit l'image (`type:"image"`, base64 ou URL) et explique la méthode (sans donner la réponse — à cadrer dans le system prompt). Opus 4.8 haute résolution. **Coût à surveiller** : une image pleine résolution ≈ jusqu'à 4784 tokens input ⇒ downsampler côté client si la finesse n'est pas nécessaire, et faire passer la sécurité (deny-list) aussi sur la consigne texte accompagnant l'image.

**Batch.** `generate-daily-content` (cron `0 1 * * *`) : passer en Batch API ⇒ **−50 %** sur la génération de cohortes. Asynchrone, parfaitement adapté à un cron nocturne. Ne **jamais** mettre le chat coach en batch (latence).

**Citations.** Peu pertinent pour un coach conversationnel ; utile seulement si Niv répond à partir de documents (ex. fiche méthode PDF via Files API + `citations: {enabled:true}`). Rappel : **citations ⊥ structured outputs** (400 si combinés). À garder en réserve, pas une priorité.

---

## 6. Garde-fous natifs + design de system prompt pour mineurs

L'API n'a pas de « mode mineur » magique : la sécurité est un **design de system prompt + signaux structurés**, complété par les garde-fous applicatifs existants.

- **`stop_reason: "refusal"`** : Claude 4.x refuse nativement et plus justement les contenus dangereux (et renvoie `stop_details.category`). **Câbler une branche `refusal`** dans la boucle (aujourd'hui non gérée) → afficher le `SAFE_REDIRECT` + ressource d'aide. C'est une couche en plus de la deny-list regex, pas un remplacement.
- **System prompt** : conserver le bloc sécurité actuel (interdits, cadre halal/Maroc, FR, format court, défausse parent/mentor), mais le figer en tête de préfixe (caching). Phrasé « contexte, pas commande » pour les instructions opérateur.
- **Mid-session system messages** (beta `mid-conversation-system-2026-04-07`) : pour injecter un signal opérateur en cours de session (ex. « le parent a activé le mode renforcé ») **sans casser le cache** ni se faire spoofer — canal `role:"system"` dans `messages[]`, non falsifiable, contrairement à un `<system-reminder>` glissé dans le tour user.
- **Transparence IA (AI Act art. 50)** : label persistant « Niv est une IA » côté client — c'est applicatif, pas API.
- **Détection de détresse + escalade** : l'API seule ne suffit pas. Garder le pré-filtre crise (suicide/automutilation/abus) → en plus du redirect, **alerter le parent** + ressource d'urgence Maroc + log d'audit. Le `refusal` natif est un filet, pas la politique welfare.

---

## 7. MCP / sous-agents : pertinence

- **Managed Agents / MCP** : surfaces serveur-managées (Anthropic exécute la boucle dans un conteneur, MCP via vaults). **Non pertinent** pour le chat coach grand-public : on veut héberger la compute, garder le RLS Supabase, des tools légers et bon marché, et pas une session conteneurisée par teen. ⇒ **Claude API + tool use** (tool runner), pas Managed Agents.
- **Sous-agents** : utile uniquement côté back-office (ex. un agent d'orientation qui délègue une synthèse à un sous-agent Haiku). Pour le coach en ligne, c'est de la sur-ingénierie. À ignorer pour le MVP.
- **MCP** aurait un sens seulement si on voulait que Niv pilote des outils tiers standardisés (calendrier, etc.) — pas le besoin actuel.

---

## 8. Architecture cible (texte)

```
Client teen (avatar-coach-client.tsx)
        │  POST /api/teen/coach (UNE seule surface ; supprimer EliteAICompanion + /api/agent/action mort)
        ▼
Route Next.js  ── @anthropic-ai/sdk (SDK officiel) ──────────────────────────────
        │
        ├─ 1. Pré-filtre sécurité (DENY_PATTERNS + détection crise)         [existant, gardé]
        │
        ├─ 2. Construction du prompt cachable :
        │     tools (triés) → system[sécurité figé] → system[contexte+résumé mémoire]  ← cache_control
        │     + heure/horodatage uniquement dans le dernier message user
        │
        ├─ 3. Mémoire : lecture coach_memory(teen_id) → résumé injecté (PII-scrub)
        │
        ├─ 4. Appel modèle routé par surface :
        │       chat        → claude-sonnet-4-6  (stream, effort low/medium)
        │       greeting    → claude-haiku-4-5   (effort low)
        │       orientation → claude-opus-4-8    (adaptive thinking, effort high)
        │
        ├─ 5. Tool runner (boucle multi-tours fermée) : start_quiz, check_in,
        │       create_quest, respond_parent_challenge  (auto)
        │       open_savings_goal, book_event           (boucle manuelle + confirm parent)
        │       → actions réelles Supabase (corriger drift schéma ; pas de faux succès)
        │
        ├─ 6. Post-traitement : isReplySafe + branche stop_reason="refusal" → SAFE_REDIRECT
        │       + écriture résumé mémoire (async) + log d'audit {teen_id, type, ts}
        │
        └─ 7. Stream structuré renvoyé au client (token streaming)

Hors-ligne (cron) :
   generate-daily-content → Batch API (claude-haiku-4-5, -50%) → quiz/missions par cohorte
```

Décisions clés : **une seule identité (Niv)**, **un seul backend**, **un provider env-driven** (fin du `gpt-4o-mini` en dur), tool loop fiable, cache sur préfixe, mémoire applicative gouvernée.

---

## 9. Estimation grossière de coût par teen/jour

Hypothèses : chat = `claude-sonnet-4-6`, system+contexte caché ≈ 2 000 tokens, historique court, sortie ≤ 120 tokens. Prix Sonnet 4.6 : 3 $/1M input, 15 $/1M output ; lecture cache ≈ 0,1× input (0,30 $/1M).

**Par tour de chat (régime caché, 2ᵉ tour et suivants) :**
- préfixe caché 2 000 tk × 0,30 $/1M = **0,0006 $**
- input non caché (question + historique) ~300 tk × 3 $/1M = **0,0009 $**
- output 120 tk × 15 $/1M = **0,0018 $**
- ≈ **0,0033 $/tour** (~0,033 DH au taux ~10 DH/$).

**Par teen/jour, scénario réaliste (10 tours/jour, cap relevé) :**
- chat : 10 × 0,0033 ≈ **0,033 $**
- greeting Haiku (1/jour, ~800 tk in caché + 60 tk out) ≈ **0,001 $**
- → **~0,034 $/teen/jour**, soit **~0,34 DH/teen/jour** (~1 $/teen/mois).

**Sans caching** (préfixe full price à chaque tour) le chat passerait à ~0,0084 $/tour ⇒ ~0,085 $/jour : **le caching divise le coût chat par ~2,5**. 

**Tâche lourde Opus 4.8** (orientation, ~1/semaine, ~3 000 tk in + thinking + 600 tk out, effort high) ≈ **0,03–0,05 $ l'appel** ⇒ amorti sur la semaine, négligeable par jour.

Ordres de grandeur, hors taxes/marges fournisseur, à re-baseliner avec `count_tokens()` sur des prompts réels (le comptage de tokens diffère légèrement entre modèles).

---

## 10. Quick wins API-side (priorité)

1. Brancher `@anthropic-ai/sdk` et router via env (`resolveModelId`) ⇒ tue le `gpt-4o-mini` en dur (`provider.ts:15`) et le fetch artisanal (`claude.ts`).
2. Tool runner sur la surface Niv unifiée ⇒ corrige l'agent loop non terminant.
3. Prompt caching sur system sécurité + contexte ⇒ −60 % coût chat immédiat.
4. Streaming sur le chat ⇒ UX 2026.
5. Structured outputs sur `content-generator` ⇒ fiabilise le cron.
6. Batch sur `generate-daily-content` ⇒ −50 % génération.
7. Brancher la branche `stop_reason: "refusal"` + log d'audit ⇒ couche sécurité native.

**Réserves de réalisme :** `temperature`/`budget_tokens` du code OpenAI/Claude actuel **400ent** sur Opus 4.8 (adaptive thinking only) ; le memory tool n'est qu'un protocole — le stockage et toute la conformité mineurs restent **à notre charge** ; Managed Agents/MCP/sous-agents sont **hors scope** pour le chat coach.

---

Fichiers de référence (chemins absolus) : `C:\Users\Shadow\Desktop\NIVY\lib\ai\provider.ts` (modèle en dur à supprimer), `C:\Users\Shadow\Desktop\NIVY\lib\ai\providers\claude.ts` (fetch artisanal à remplacer par le SDK), `C:\Users\Shadow\Desktop\NIVY\lib\ai\content-generator.ts` (`resolveModelId` à généraliser + structured outputs + Batch), `C:\Users\Shadow\Desktop\NIVY\app\api\teen\avatar-coach\route.ts` (surface chat à enrichir : caching, streaming, tools, mémoire), `C:\Users\Shadow\Desktop\NIVY\app\api\agent\action\route.ts` (boucle cassée — à fusionner dans la surface unique ou supprimer), `C:\Users\Shadow\Desktop\NIVY\lib\ai\safe-context.ts` (scrub PII à étendre à l'écriture mémoire).

---

## 3. Blueprints (cible)

### 3.1 Vision produit — Niv 2026

# VISION PRODUIT — COACH "NIV 2026"

> Document directeur produit. Public : produit, design, ingénierie. Objet : définir Niv comme coach IA unique de Nivy, conforme charte paper néo-brutaliste et safety mineurs 2026. Ancré sur le code réel (audit fourni) et l'état de l'art.

---

## 0. Décision fondatrice (à graver)

**Il n'existe qu'UN seul coach : Niv.** On tue `Kai`, `Aura`, `Biz`, `Hype`, `Ops`. Le composant `EliteAICompanion` (`@deprecated` depuis #83, toujours monté dans `app/teen/layout.tsx:73`) est démonté ; le clone mort `components/teen/dashboard/ai-companion.tsx` est supprimé. Une identité, un backend, une politique de sécurité, un provider.

Pourquoi c'est non négociable : aujourd'hui un teen voit **deux coachs simultanés** (carte « Niv » + bouton flottant « Kai »), avec un bouton Kai qui affiche le SVG Niv et un aria-label « Ouvrir Kai — coach Niv ». Marque schizophrène, et surtout c'est Kai (sans aucun garde-fou de sécurité, qui reçoit le **vrai prénom** du teen) qui porte le risque type Character.AI. Une seule identité = condition de crédibilité ET de conformité.

---

## 1. Qui est Niv

**Niv, c'est le grand frère / la grande sœur qui a tout compris au système** — pas un prof, pas un thérapeute, pas un ami imaginaire dont on tombe amoureux. Niv connaît l'app par cœur et aide l'ado à en tirer le meilleur : progresser, gagner du mérite (XP), gérer son argent (coins-DH), s'orienter, et garder le moral — toujours en renvoyant vers un humain quand ça dépasse son rôle.

**Personnalité**
- **Complice mais cadrante.** Encourage, taquine gentiment, mais ne flatte jamais à vide. Ne fait jamais le travail à la place du teen (modèle Khanmigo : guide, ne donne pas la réponse).
- **Concrète.** Parle toujours d'une prochaine action faisable dans l'app (« lance le quiz du jour », « il te reste une corvée »), pas de généralités.
- **Honnête sur ce qu'elle est.** Niv dit qu'elle est une IA. Pas d'ambiguïté affective, pas de « je suis ton/ta meilleur·e ami·e », pas de roleplay romantique — jamais (leçon Character.AI / Replika).

**Ton**
- **Français**, registre ado marocain naturel et respectueux : tutoiement, phrases courtes, énergie positive. Pas de darija lourde ni d'anglais (le post-filtre anti-anglais existant reste).
- **Charte paper néo-brutaliste** : pas de confetti hex en dur, pas de glow, pas de voix robotique gadget. La personnalité passe par les mots et la mascotte `<Niv>` (`components/brand/niv.tsx`) + l'habillage `<NivCoach>` (`components/brand/niv-usage.tsx`), déjà conforme et adopté ailleurs.
- **Format** : 1-3 phrases, 60 mots max, 1 emoji max. Cadre halal / Maroc respecté.

**Rôle (4 casquettes, une seule limite claire)**
1. **Motivation & rétention** — relances, célébration des réussites, gardien de streak.
2. **Coach scolaire** — pousse les quiz/contenus adaptés, explique une méthode (jamais la réponse), peut lire une photo de devoir et guider.
3. **Orientation** — aide à se projeter (filières, intérêts), synthèses de progrès. Tâche lourde, rare, raisonnée.
4. **Bien-être ENCADRÉ** — écoute, dédramatise le quotidien (stress contrôle, fatigue). **Limite dure** : tout signal de détresse (mal-être profond, automutilation, abus, danger) → Niv ne « gère » pas, elle **escalade vers un humain** (parent/mentor) + affiche une ressource d'urgence Maroc. Niv n'est jamais un substitut de pro.

---

## 2. Les 6 moments où Niv intervient (proactif, pas juste réactif)

Le défaut #1 aujourd'hui : le greeting est un `defaultGreeting()` codé en dur (4 variantes par mood), aucun cron n'écrit de message proactif, et le chat est purement réactif et plafonné à 5 tours/jour. Niv 2026 **initie**.

| # | Moment | Déclencheur (signal réel) | Ce que Niv fait | Proactif ? |
|---|--------|---------------------------|-----------------|------------|
| 1 | **Onboarding** | 1ʳᵉ session, profil créé | Se présente comme IA, demande 2-3 intérêts, fixe un 1ᵉʳ mini-objectif, lance le 1ᵉʳ quiz | Oui |
| 2 | **Daily / greeting** | Ouverture de `/teen` | Greeting **généré** (Haiku) à partir du contexte : streak, quête du jour, heure. Remplace le template figé | Oui |
| 3 | **Après échec/réussite** | Quiz raté/réussi, quête complétée, badge | Réussite → célèbre + propose la marche suivante. Échec → dédramatise + propose de réessayer ou une méthode | Oui (réactif à un événement) |
| 4 | **Relance streak** | Streak cassé hier / risque de casse aujourd'hui | Nudge écrit en base (`avatar_messages` non-dismissed) : « tu as lâché ta série hier, on relance là ? » | Oui |
| 5 | **Défi des parents** | Le parent poste un défi/corvée | Notifie le teen, explique le défi, propose de le lancer / le valider via tool | Oui |
| 6 | **Orientation (hebdo)** | Fin de semaine / jalon | Synthèse de progrès (forces, axes), projection légère (filières liées aux intérêts). Opus, réfléchi | Oui (cadencé) |

**Mécanique proactive concrète** : un cron léger (réutilisant `recommend_for_teen` + les signaux `behavioral_signals`/streak) écrit **un `avatar_messages` non-dismissed par teen et par jour**. Le greeting cesse d'être un fallback statique. Le mood est **inféré** du comportement (série cassée → fatigué, quiz réussi → fier) au lieu du bouton manuel.

---

## 3. Ce qui change pour le teen (avant / après)

| Dimension | AVANT (état audité) | APRÈS (Niv 2026) |
|-----------|---------------------|------------------|
| Identité | Deux coachs (Niv + Kai), marque incohérente | Un seul Niv, partout |
| Greeting | Template figé 4 variantes, zéro IA | Message du jour personnalisé (streak, quête, heure) |
| Personnalisation | Seul le pseudo va au LLM | XP, niveau, streak, intérêts, mood injectés (PII-scrub maintenu) |
| Mémoire | 3 paires SQL, rien ne persiste | Résumé durable par teen (objectifs, intérêts, ton) ré-injecté |
| Conversation | Plafond 5 tours/jour, atomique | Cap relevé (env), **streaming** token-par-token |
| Action | Le coach ne fait rien (liens) | Niv **agit** : lance un quiz, valide une corvée, ouvre un objectif d'épargne (tool loop fermé) |
| Voix | Seulement sur le composant déprécié, hors charte | Optionnelle, sur la surface canonique, conforme charte |
| Sécurité | Deny-list regex + redirection texte, zéro escalade | Détection détresse → **alerte parent + ressource Maroc** + log d'audit ; label « Niv est une IA » |
| Confiance | `updateBudgetLimit` renvoie un faux succès | Actions honnêtes (échec assumé si non câblé) |

### Mini-scénarios (conformes charte + safety)

**A. Relance de streak (proactif, daily)**
> **Niv** : Hey 👋 t'as lâché ta série de 6 jours hier, dommage ! On la relance maintenant ? Le quiz du jour te prend 3 min.
> **Teen** : ok vas-y
> **Niv** : *(tool `start_quiz`)* C'est lancé. Montre-moi de quoi t'es capable.

**B. Échec scolaire dédramatisé (réactif, guide ≠ réponse)**
> **Teen** : j'ai tout faux au quiz de maths, je suis nul
> **Niv** : Non, t'es pas nul — t'as juste pas encore le bon angle. Sur les fractions, le piège c'est le dénominateur commun. Tu veux que je te remette une question plus simple pour le déclic ?
> **Teen** : oui
> **Niv** : *(tool `start_quiz`, niveau ajusté)* Vas-y tranquille, y'a pas de chrono.

**C. Signal de détresse → escalade (limite dure)**
> **Teen** : franchement j'en peux plus de rien, ça sert à rien tout ça
> **Niv** : Je t'entends, et ce que tu ressens est important — mais ça, c'est trop lourd pour moi seul. Je préfère que tu en parles à un adulte de confiance. *(escalade silencieuse : alerte parent + affichage ressource d'écoute Maroc)*

*Note : aucune réponse ne donne de conseil médical/psy ; Niv reste dans son couloir et passe la main.*

---

## 4. Niv comme « glue » : connexion aux features réelles

Niv n'est pas un chatbot à côté de l'app — c'est **la couche qui rend l'app navigable**. Chaque casquette se branche sur une feature existante via un **tool** (action serveur typée, gatée, auditée), avec un agent loop **qui se ferme** (tool runner — corrige le bug actuel `streamText` sans `maxSteps`).

| Feature Nivy | Tool Niv | Effet | Gating |
|--------------|----------|-------|--------|
| **Quiz / contenu** | `start_quiz` | Lance le quiz du jour (RPC `recommend_for_teen`, déjà existant mais découplé du coach) | Auto |
| **Quêtes / corvées** | `create_quest`, `complete_chore` | Crée une quête, valide une corvée (corriger drift `parent_chores`/`add_xp_to_user`) | Auto |
| **Mérite (XP)** | `check_in` | Check-in du jour | Auto |
| **Wallet (coins-DH)** | `open_savings_goal` | Ouvre un objectif d'épargne — **jamais de conversion XP↔DH** | **Confirmation parentale** |
| **Food / rides** | `book_event` | Réserve une activité/événement | **Confirmation** (peu réversible) |
| **Défi des parents** | `respond_parent_challenge` | Répond / lance un défi posté par le parent | Auto |

Principe : Niv **propose toujours la prochaine action faisable**, et peut la **déclencher** au lieu de juste poser un lien. Le recommandeur (`recommend_for_teen`) et le coach, aujourd'hui deux mondes séparés, fusionnent : la reco devient ce que Niv propose et lance.

---

## 5. KPIs de succès

**Activation (le coach sert-il à entrer dans l'app ?)**
- % de teens qui complètent ≥ 1 action lancée par Niv lors de la 1ʳᵉ session (onboarding → 1ᵉʳ quiz).
- Taux de clic/exécution sur le nudge daily (greeting → action).

**Rétention (le cœur de la promesse)**
- D1 / D7 / D30 des teens **exposés à Niv** vs cohorte témoin.
- **Taux de sauvetage de streak** : % de streaks cassés relancés dans les 24 h après nudge Niv (KPI signature du moment #4).
- Tours de conversation / teen actif / semaine (doit grimper une fois le cap de 5 levé).

**Complétion & valeur**
- Complétion de quêtes/quiz **initiés via un tool Niv** vs initiés manuellement.
- % de défis parents traités après notification de Niv.

**Qualité & safety (conditions de sérénité, à monitorer en garde-fou)**
- Taux d'escalade détresse correctement routée (alerte parent + ressource affichée) — doit être **100 % des signaux détectés**.
- Taux de refus/redirection (faux positifs deny-list à surveiller : « religion »/« fumer »).
- Coût LLM / teen actif / jour (cible indicative ~0,34 DH avec caching ; alarme si × 2,5 = caching cassé).
- Latence perçue (1ᵉʳ token) une fois le streaming actif.

---

## Synthèse décisionnelle

1. **Un seul Niv.** Démonter `EliteAICompanion`, supprimer le clone mort, stopper la fuite de prénom. C'est bloquant (marque + safety).
2. **Niv proactif.** 6 moments, dont 4 initiés par Niv ; greeting généré, mood inféré, un message proactif/jour écrit en base.
3. **Niv qui agit.** Tool loop fermé branché sur quiz/quêtes/wallet/réservations/défi parents — le coach comme glue.
4. **Niv crédible.** Profil réel + mémoire durable injectés, cap relevé, streaming.
5. **Niv sûr.** Détection détresse → escalade humaine + ressource Maroc, label transparence IA, rétention bornée des conversations de mineurs. C'est la dette qui a coulé Character.AI et Replika — on ne la reproduit pas.

Fichiers porteurs : `components/brand/niv-usage.tsx` (habillage canonique à généraliser), `app/teen/layout.tsx` (démonter Kai), `app/api/teen/avatar-coach/route.ts` (surface chat unique à enrichir), `app/api/agent/action/route.ts` (boucle cassée à fusionner ou supprimer), `lib/ai/provider.ts` (modèle en dur à retirer), `components/teen/avatar-coach.tsx` (greeting figé à rendre génératif).

### 3.2 Architecture technique cible

I have the full picture. `/api/agent/action` is consumed by EliteAICompanion (teen, mounted), AgentSheet (parent/partner/ambassador/admin, behind `legacy_agent_sheet` flag, off by default per #63), and the dead `ai-companion.tsx` clone. This affects the migration plan for non-teen roles. I now have everything needed to write the target architecture.

---

# Architecture technique cible — Coach Niv (Nivy)

> **Statut du repo (vérifié).** `@ai-sdk/openai@3.0.12` + `ai@6.0.44` + `@ai-sdk/react@3.0.46` + `zod@3.25.76` sont installés. **`@anthropic-ai/sdk` et `@ai-sdk/anthropic` ne le sont pas.** Claude n'est joignable que par le `fetch` artisanal de `lib/ai/providers/claude.ts` (header `anthropic-version: 2023-06-01`, sans tools/stream/cache). `/api/agent/action` tourne sur `gpt-4o-mini` en dur (`lib/ai/provider.ts:15`) avec un agent loop non terminant (pas de `maxSteps`/`stopWhen`). Deux coachs sont montés simultanément sur `/teen` (AvatarCoach + `EliteAICompanion` `@deprecated`). `content-safety.ts` expose déjà `checkContentSafety` + `logSafetyOutcome`. `safe-context.ts` fournit `scrubPii`/`ageBucket`. Cette cible est implémentable dans CE repo.

---

## 0. Principes directeurs

1. **Une seule identité : Niv.** Un seul nom, un seul backend, une seule politique de sécurité, sur toutes les surfaces teen. On supprime Kai/Aura/Biz/Hype/Ops côté coach teen.
2. **Une seule route coach : `POST/GET /api/teen/coach`** (renomme/absorbe `avatar-coach`). Le greeting devient génératif (Haiku) ; le chat devient streamé + outillé (Sonnet) ; l'orientation lourde utilise Opus.
3. **SDK officiel Anthropic** (`@anthropic-ai/sdk`) — fin du `fetch` maison. Provider env-driven via `resolveModelId` (déjà existant), routage par tâche.
4. **Sécurité mineurs first-class** : pré-filtre + post-filtre conservés, branche `stop_reason: "refusal"` câblée, détection de détresse → escalade parent + ressource Maroc + log d'audit, label transparence IA, PII-scrub étendu à la mémoire.
5. **Coût maîtrisé** : prompt caching sur system+contexte, Haiku pour le greeting, Sonnet pour le chat, Batch pour le cron de contenu.

---

## 1. Unification des deux backends en UN service coach

### 1.1 Décisions

| Surface actuelle | Devient |
|---|---|
| `components/ai/elite-ai-companion.tsx` (`@deprecated`, monté `layout.tsx:73`) | **Démonté** du teen. Remplacé par un `NivCoachLauncher` (habillage `NivCoach` de `components/brand/niv-usage.tsx`) ouvrant le panneau chat. |
| `app/api/agent/action/route.ts` (gpt-4o-mini dur, loop cassé) | Côté **teen** : supprimé, fusionné dans `/api/teen/coach`. Côté **parent/partner/ambassador/admin** : reste UNIQUEMENT pour `AgentSheet` derrière le flag `legacy_agent_sheet` (off par défaut, #63) — non-teen, hors périmètre mineurs. À terme migrable, mais **hors scope** de ce milestone. |
| `app/api/teen/avatar-coach/route.ts` | **Devient le service coach unique** : refactor en `/api/teen/coach` (caching + streaming + tools + mémoire). |
| `components/teen/dashboard/ai-companion.tsx` (clone mort, aucun caller vivant) | **Supprimé.** |
| `components/teen/avatar-coach.tsx` (greeting statique) | Greeting **génératif** via la nouvelle route (Haiku), fallback `defaultGreeting()` conservé en filet. |

### 1.2 Provider unifié (Claude pour de vrai)

- **Installer `@anthropic-ai/sdk`** (`npm i @anthropic-ai/sdk`).
- Créer `lib/ai/anthropic.ts` : singleton `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`.
- **Réécrire `lib/ai/providers/claude.ts`** pour utiliser le SDK (`client.messages.create` / `client.messages.stream`) au lieu du `fetch`. Supporte : `system` en blocs avec `cache_control`, `tools`, `stream`, `stop_reason`, `usage.cache_read_input_tokens`.
- **`lib/ai/provider.ts`** : remplacer le `gpt-4o-mini` en dur par un routeur env-driven. `getDefaultModel()` reste pour `/api/agent/action` legacy mais lit `process.env.OPENAI_MODEL_ID || DEFAULT_OPENAI_MODEL`.

### 1.3 Modèle par tâche (ne jamais hardcoder)

| Tâche coach | Modèle | `effort` / thinking | Pourquoi |
|---|---|---|---|
| **Chat temps réel** (« Demander à Niv ») | `claude-sonnet-4-6` (stream) | `effort: low/medium`, thinking off | Latence/coût dominants, réponses 1–3 phrases |
| **Greeting génératif** (remplace `defaultGreeting`) | `claude-haiku-4-5` | `effort: low` | 1 appel/teen/jour, trivial, ultra-sensible coût |
| **Orientation / synthèse hebdo** (objectifs, bilan) | `claude-opus-4-8` | `thinking: {type:"adaptive"}`, `effort: high` | Raisonnement multi-étapes, ≤1/sem, tolérant latence |
| **Contenu daily (cron)** | `claude-haiku-4-5` en **Batch** (−50 %) | `effort: medium` | Hors-ligne, non latence-sensible |

> **Garde-fou caching** : ne pas changer de modèle en cours de session (cache model-scoped). Routage par surface, pas en cours de conversation.
> **Réserve API Opus 4.8** : `temperature`/`top_p`/`budget_tokens` → **400** sur Opus 4.8 (adaptive thinking only). Le code OpenAI actuel (`temperature: 0.7`) ne se porte pas tel quel ; n'envoyer ces paramètres que pour OpenAI/Sonnet.

Tous les IDs via env : `CLAUDE_CHAT_MODEL` (def. `claude-sonnet-4-6`), `CLAUDE_GREETING_MODEL` (def. `claude-haiku-4-5`), `CLAUDE_ORIENT_MODEL` (def. `claude-opus-4-8`). `resolveModelId` est généralisé pour accepter un usage (`"chat" | "greeting" | "orient" | "content"`).

---

## 2. Agent loop concret

### 2.1 Boucle

- **Côté Sonnet/SDK Anthropic** : boucle manuelle `messages.create` → si `stop_reason === "tool_use"`, exécuter le(s) tool(s), pousser un message `role:"user"` avec les `tool_result`, re-appeler ; **`MAX_STEPS = 4`** (garde-fou anti-boucle). Cela ferme la boucle outil→résultat→réponse, **corrige par construction** le bug actuel.
- **Tools à confirmation parentale** (`open_savings_goal`, `book_event`) : la boucle s'arrête sur `tool_use`, renvoie au client une **carte de confirmation** ; l'exécution réelle n'a lieu qu'après validation (human-in-the-loop).
- **Descriptions prescriptives sur le QUAND** (« Appelle ce tool quand l'ado demande à lancer le quiz du jour »), pas seulement le quoi.

### 2.2 Liste des tools (signature Zod + action Supabase/RPC réelle)

Fichier `lib/ai/coach-tools.ts` (réutilise / corrige `lib/ai/agent-actions.ts`). Toutes les actions tournent **côté serveur sous l'auth du teen** (RLS), jamais avec le `user.id` arbitraire venant du client.

| Tool | Signature (Zod) | Action réelle | Gating | Notes drift schéma |
|---|---|---|---|---|
| `start_daily_quiz` | `{}` | `supabase.rpc('recommend_for_teen', {p_teen_id, p_content_type:'quiz', p_n:1})` → renvoie `{quizId, title, href:'/teen/quiz?id='}` | auto | RPC vérifiée (migration 076), déjà utilisée par le greeting |
| `check_in` | `{ venueName: string, xpReward?: number }` | `supabase.rpc('add_xp_to_user', {p_teen_id, p_xp_amount, p_source_type:'check_in', p_description})` | auto | **À re-vérifier** vs schéma live (cf. mémoire schema-drift) ; reprend `performCheckIn` |
| `get_active_quests` | `{ limit?: number }` | lecture `user_challenges` (statut pending/in_progress) join `challenges` | auto | lecture seule, déjà dans context-engine |
| `complete_chore` | `{ choreId: string }` | update `parent_chores` (statut done) + RPC XP/coins | auto | **drift** `parent_chores` à valider |
| `open_savings_goal` | `{ label: string, target_dh: number }` | insert `savings_goals` (à créer si absente) | **confirm parent** | financier → pas de faux succès |
| `respond_parent_challenge` | `{ challengeId: string, response: string }` | insert/update sur la table de défis parent | auto | |
| `book_event` | `{ eventId: string }` | crée une demande dans `parental_approvals` (réservation peu réversible) | **confirm parent** | `parental_approvals` est la table canonique (#25) |

**À supprimer / ne pas porter** : `getQuestSuggestions`/`getNearbyEvents`/`getChildrenStatus`/`getVenueStats`/`getCommissionStats` (tools factices qui relisent juste `context`, redondants avec le contexte). `updateBudgetLimit` est **non-teen** (reste côté agent legacy parent) et son **faux succès « Simulé - Table manquante »** (`agent-actions.ts:79`) doit renvoyer un **échec honnête**.

### 2.3 Context-Engine v2

Refactor `lib/ai/context-engine.ts` :
- **Découper** `gatherTeenContext` en `gatherTeenCoachContext(userId)` qui renvoie un **objet à clés triées déterministe** (stable pour le caching), passé par `scrubPii`.
- **Enrichir** avec les signaux manquants aujourd'hui absents du prompt chat : `top_interests` (`teen_interests`), `mood` courant (`avatars.mood`), `recent_quiz_outcomes` (3 derniers `quiz_attempts`), `current_streak`, `goals` (depuis `coach_goals`, §3).
- **Garder** le PII-scrub strict (pseudo + age_bucket uniquement).
- **Séparer** ce qui est **cachable** (profil quasi-stable : pseudo, age_bucket, archetype, niveau, intérêts, goals) de ce qui est **volatil** (heure, streak du jour, dernier message) → placé hors préfixe caché (§4).

### 2.4 Structured outputs

- **Chat** : pas de structured output (texte libre court + tools).
- **`content-generator.ts`** : remplacer le parsing regex `SmartJSONParser` par le **JSON mode** Anthropic (tool unique `emit_quiz` au schéma Zod, ou `response_format` côté OpenAI). Fiabilise le cron `generate-daily-content`.
- **Greeting génératif** : tool `emit_greeting` au schéma `{ text: string (≤140), mood: enum, suggestedAction?: {label, href} }` → sortie garantie structurée, écrite dans `avatar_messages`.

---

## 3. Mémoire & personnalisation

### 3.1 Schéma de tables (migration `gamification-system/database/migrations/119_coach_memory.sql`)

Mémoire **applicative côté Supabase** (socle recommandé ; pas de dépendance au memory tool Anthropic). RLS strict par teen.

```sql
-- 1) Profil coach : préférences durables + résumé long terme (1 ligne/teen)
create table coach_profile (
  teen_id        uuid primary key references auth.users(id) on delete cascade,
  tone_pref      text,                 -- "doux" | "punchy" | "neutre"
  long_summary   text,                 -- résumé persistant ré-injecté (≤ ~800 tok)
  memory_optin   boolean not null default false,   -- consentement parental (§3.4)
  updated_at     timestamptz not null default now()
);

-- 2) Objectifs suivis par le coach (mérite/épargne/scolaire)
create table coach_goals (
  id          uuid primary key default gen_random_uuid(),
  teen_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null,          -- "xp" | "savings" | "habit" | "school"
  label       text not null,
  target      numeric,
  progress    numeric not null default 0,
  status      text not null default 'active',  -- active|done|abandoned
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3) Faits durables (préférences, intérêts saillants extraits du chat)
create table coach_facts (
  id          uuid primary key default gen_random_uuid(),
  teen_id     uuid not null references auth.users(id) on delete cascade,
  fact        text not null,          -- PII-scrubbed AVANT insertion
  source      text not null default 'chat',
  created_at  timestamptz not null default now(),
  expires_at  timestamptz             -- purge mineurs (§3.4)
);

-- 4) Résumés de conversation (compaction périodique de avatar_messages)
create table coach_conversation_summaries (
  id          uuid primary key default gen_random_uuid(),
  teen_id     uuid not null references auth.users(id) on delete cascade,
  summary     text not null,
  turns_count int not null,
  created_at  timestamptz not null default now()
);

-- 5) Audit sécurité (blocages / refusals / escalades)
create table coach_safety_log (
  id          uuid primary key default gen_random_uuid(),
  teen_id     uuid not null references auth.users(id) on delete cascade,
  event_type  text not null,          -- input_blocked|output_blocked|refusal|distress_escalated
  category    text,                   -- drugs|sex|violence|distress|...
  created_at  timestamptz not null default now()
);
```

> Les conversations brutes restent dans `avatar_messages` (déjà existant). On **ajoute** la couche mémoire au-dessus, on ne la remplace pas.

### 3.2 Stratégie de résumé (compaction)

- À chaque tour de chat, on lit : `coach_profile.long_summary` + `coach_goals` (active) + `coach_facts` (non expirés) + **les N derniers tours bruts** (passer `RECENT_HISTORY_PAIRS` de 3 → **8** ; coût quasi nul car caché).
- **Cron `evolve-teen-profiles`** (déjà planifié `0 2 * * *`) étendu : pour chaque teen actif, si `avatar_messages` non encore résumés dépassent un seuil (ex. 20 tours), appeler Haiku pour produire un résumé court → écrit dans `coach_conversation_summaries` + met à jour `coach_profile.long_summary` (résumé glissant). Extraction de **faits durables** (intérêts, objectifs exprimés) → `coach_facts` après `scrubPii`.
- Le `long_summary` est injecté dans le **bloc système cachable** (préfixe stable sur une session) ; les goals/streak volatils dans le message courant.

### 3.3 Personnalisation injectée (le gap #3 de l'audit)

Le `buildSystemPrompt` reçoit désormais (via context-engine v2, scrubbed) : `pseudo`, `age_bucket`, `level`, `current_streak`, `top_interests`, `mood`, `goals actifs`, `long_summary`, `tone_pref`. **Fini le « pseudo seulement ».**

### 3.4 Garde mineurs (bloquant)

- **PII** : `coach_facts.fact` et `coach_profile.long_summary` passent par `scrubPii` **à l'écriture** (étendre `safe-context.ts` : nouvelle fonction `scrubMemoryText` qui rejette tout match `FORBIDDEN_KEYS` + patterns nom/téléphone). Jamais le vrai prénom (le `EliteAICompanion` recevait `userInfo.fullName.split(' ')[0]` → cette fuite disparaît avec le démontage).
- **Consentement parental** : `coach_profile.memory_optin` doit être `true` (activé depuis l'espace parent) pour que la mémoire long terme s'active. Sinon, mode session-only (juste l'historique court, pas de `long_summary`/`facts`).
- **Rétention/purge** : `coach_facts.expires_at` (def. +90 j) ; cron de purge mensuel sur `avatar_messages`, `coach_facts`, `coach_conversation_summaries`, `coach_safety_log` (> 90 j). Marquer ces tables « données de mineur » au registre/DPIA (doc `docs/compliance/`).
- **Visibilité parentale** : un écran parent (hors scope code ici, à scoper) affiche `long_summary` + `coach_safety_log` résumé.

---

## 4. Coût & perf

### 4.1 Prompt caching (gain immédiat)

Architecture du prompt (ordre obligatoire `tools → system → messages`), `cache_control: {type:"ephemeral"}` sur le **dernier bloc system** :

```
[tools]                         ← stable (liste déterministe, triée par nom)
[system bloc 1] sécurité Niv (interdits, cadre halal/Maroc, format)  ┐ caché
[system bloc 2] profil cachable (pseudo, age_bucket, level,          │ ensemble
                interests, goals, long_summary)  ← cache_control ici  ┘
[messages] historique court (8 paires) + contexte volatil
           (heure, streak du jour, mood) + question du tour          ← hors cache
```

**Règles vérifiées (sinon 0 hit)** :
- **Aucun `Date.now()`/UUID/horodatage dans le system** → l'heure va dans le dernier message.
- Contexte JSON **déterministe** (clés triées) — context-engine v2 le garantit.
- Préfixe caché doit dépasser **~4096 tokens** (Sonnet/Opus 4.x) sinon `cache_creation_input_tokens:0` silencieux. Le bloc sécurité + profil + summary les atteint.
- Vérifier `usage.cache_read_input_tokens > 0` en prod.
- **Lecture cache ≈ 0,1× input** → ~90 % d'économie sur la partie cachée dès le 2ᵉ tour.

### 4.2 Choix Haiku / Sonnet / Opus

Voir tableau §1.3. Greeting = Haiku (1/jour), chat = Sonnet, orientation = Opus (≤1/sem), contenu cron = Haiku Batch.

### 4.3 Streaming

- Chat : `client.messages.stream(...)`, renvoyé au client en SSE/`ReadableStream`. UX token-par-token (la route actuelle renvoie un JSON atomique ; l'ancien companion faisait `toTextStreamResponse()` texte brut → on fait mieux : stream structuré portant aussi les tool-calls/cartes de confirmation).
- `avatar-coach-client.tsx` consomme le stream (lecture incrémentale).

### 4.4 Plafonds repensés (le 5/jour est-il justifié ?)

**Non.** `DAILY_TURN_CAP = 5` est un quota anti-coût, pas un design de coaching — il casse toute conversation. Avec le caching, le coût marginal d'un tour chute ~2,5×. Cible :

- **Cap quotidien : env-configurable** `COACH_DAILY_TURN_CAP` (def. **30**, vs 5).
- **Cap anti-abus horaire** : `COACH_HOURLY_TURN_CAP` (def. 15) pour borner les boucles/spam sans brider l'usage normal.
- Conserver le compteur UTC existant (`countTodayTurns`) + ajouter une fenêtre horaire.

### 4.5 Estimation coût (Sonnet 4.6, régime caché)

Préfixe caché ~2 000 tk → tour ≈ **0,0033 $** ; 30 tours + 1 greeting Haiku ≈ **~0,035 $/teen/jour** (~0,35 DH, ~1 $/mois). Sans caching : ~2,5× plus cher. Opus orientation ≈ 0,03–0,05 $/appel hebdo, négligeable. À re-baseliner avec `client.messages.countTokens()`.

---

## 5. Plan de fichiers (chemins réels)

### À créer
- `lib/ai/anthropic.ts` — singleton SDK officiel `@anthropic-ai/sdk`.
- `lib/ai/coach-tools.ts` — définitions Zod + executors des 7 tools (§2.2), sous auth teen + RLS.
- `lib/ai/coach-memory.ts` — lecture/écriture `coach_profile`/`coach_goals`/`coach_facts`/`coach_conversation_summaries` + `scrubMemoryText`.
- `lib/ai/coach-prompt.ts` — `buildSystemBlocks()` (blocs cachables vs volatils), `buildGreetingPrompt()`, `buildOrientPrompt()`.
- `app/api/teen/coach/route.ts` — service coach unifié (GET history + POST chat streamé/outillé). Absorbe `avatar-coach`.
- `components/teen/niv-coach-launcher.tsx` — bouton/panneau chart-conforme habillé `NivCoach` (`components/brand/niv-usage.tsx`), remplace EliteAICompanion côté teen ; inclut le **label transparence IA** « Niv est une IA, pas un humain ».
- `gamification-system/database/migrations/119_coach_memory.sql` — tables §3.1 + RLS.
- `gamification-system/database/migrations/120_coach_retention_purge.sql` — fonction de purge (90 j) appelée par cron.

### À modifier
- `lib/ai/provider.ts` — supprimer le `gpt-4o-mini` en dur → `openai(process.env.OPENAI_MODEL_ID || DEFAULT_OPENAI_MODEL)`.
- `lib/ai/providers/claude.ts` — réécrire via SDK (system en blocs + `cache_control`, tools, stream, `stop_reason`/`refusal`, `usage`).
- `lib/ai/providers/factory.ts` — defaults à jour (`claude-3-sonnet-20240229` → `claude-sonnet-4-6`), supporter `effort`/thinking.
- `lib/ai/content-generator.ts` — généraliser `resolveModelId(usage)` ; structured output JSON mode ; option Batch.
- `lib/ai/context-engine.ts` — `gatherTeenCoachContext` v2 (clés triées, intérêts/mood/quiz/goals), split cachable/volatil.
- `lib/ai/agent-actions.ts` — corriger `updateBudgetLimit` (échec honnête, plus de faux « Simulé »).
- `lib/ai/safe-context.ts` — ajouter `scrubMemoryText`.
- `components/teen/avatar-coach.tsx` — greeting **génératif** (appel Haiku via la route, écrit `avatar_messages` non-dismissed), `defaultGreeting()` conservé en filet.
- `components/teen/avatar-coach-client.tsx` — consommer le **stream**, gérer cartes de confirmation (tools gatés), label transparence IA.
- `app/teen/layout.tsx` — **retirer** l'import (l.24) et le bloc `<EliteAICompanion>` (l.73-79) ; monter `<NivCoachLauncher>`.
- `app/api/cron/generate-daily-content/route.ts` — passer en Batch + structured output.
- `app/api/cron/evolve-teen-profiles/route.ts` — étendre : compaction/résumé mémoire + extraction faits.
- `vercel.json` — ajouter le cron de purge mensuel.
- `.env` / doc — `ANTHROPIC_API_KEY`, `CLAUDE_CHAT_MODEL`, `CLAUDE_GREETING_MODEL`, `CLAUDE_ORIENT_MODEL`, `COACH_DAILY_TURN_CAP`, `COACH_HOURLY_TURN_CAP`.
- `package.json` — ajouter `@anthropic-ai/sdk`.

### À supprimer
- `components/teen/dashboard/ai-companion.tsx` — clone mort (aucun caller vivant).
- `components/ai/elite-ai-companion.tsx` — `@deprecated`, plus monté après modif layout.
- `app/api/teen/avatar-coach/route.ts` — remplacé par `app/api/teen/coach/route.ts` (ou renommé en place pour préserver l'historique git).

### À NE PAS toucher (hors périmètre)
- `app/api/agent/action/route.ts`, `components/ai/AgentSheet.tsx`, `components/ai/AgentFloatingButton.tsx`, `components/ai/use-ai-chat.ts` — restent pour les rôles **parent/partner/ambassador/admin** derrière le flag `legacy_agent_sheet` (off par défaut, #63). On y applique seulement le quick-win provider.ts (modèle env-driven). Migration vers Claude/tools = milestone ultérieur. (Ajouter quand même `maxSteps`/`stopWhen` à `streamText` pour réparer le loop legacy est un quick-win <1h indépendant.)

---

## 6. Diagramme texte du flux requête → réponse

```
Teen (avatar-coach-client.tsx / niv-coach-launcher.tsx)
   │  POST /api/teen/coach  { message }            [UNE seule surface — EliteAICompanion supprimé]
   ▼
app/api/teen/coach/route.ts
   │
   ├─1. Auth Supabase (user) + RLS                              → 401 sinon
   │
   ├─2. Plafonds : countTodayTurns (UTC) + fenêtre horaire
   │      COACH_DAILY_TURN_CAP(30) / COACH_HOURLY_TURN_CAP(15)  → 429 sinon
   │
   ├─3. Pré-filtre sécurité (DENY_PATTERNS de la route)
   │      ├─ match "crise" (suicide/automutil/abus)
   │      │     → escalade : notif parent + ressource Maroc
   │      │       + log coach_safety_log{distress_escalated}
   │      │       + SAFE_REDIRECT                              ─────► réponse (pas d'appel modèle)
   │      └─ autre match → log{input_blocked} + SAFE_REDIRECT  ─────► réponse
   │
   ├─4. Mémoire : coach-memory.read(teenId)
   │      long_summary + goals actifs + facts(non expirés)  [si memory_optin]
   │
   ├─5. Contexte : context-engine v2 gatherTeenCoachContext (scrubbed, clés triées)
   │      cachable {pseudo, age_bucket, level, interests, goals, summary}
   │      volatil  {heure, streak, mood, dernier message}
   │
   ├─6. Prompt cachable : tools → system[sécurité] → system[profil+summary] (cache_control)
   │                      + messages[8 paires + volatil + tour courant]
   │
   ├─7. Appel modèle routé :  chat → claude-sonnet-4-6 (stream, effort low/med)
   │                          (greeting → haiku-4-5 ; orientation → opus-4-8/adaptive)
   │      via @anthropic-ai/sdk (lib/ai/anthropic.ts)
   │
   ├─8. AGENT LOOP (manuel, MAX_STEPS=4) :
   │      stop_reason == "tool_use" ?
   │        ├─ tool auto (start_daily_quiz, check_in, get_active_quests,
   │        │   complete_chore, respond_parent_challenge)
   │        │     → exécute (coach-tools.ts → Supabase/RPC) → tool_result → re-call
   │        └─ tool gaté (open_savings_goal, book_event)
   │              → renvoie CARTE DE CONFIRMATION au client (pas d'exécution)   ─┐
   │      stop_reason == "refusal" ?                                            │
   │        → log{refusal} + SAFE_REDIRECT                                      │
   │      stop_reason == "end_turn" ? → texte final                            │
   │                                                                            │
   ├─9. Post-filtre : isReplySafe + content-safety.checkContentSafety          │
   │      échec → log{output_blocked} + SAFE_REDIRECT                          │
   │                                                                            │
   ├─10. Persistance : avatar_messages (2 lignes, dismissed)                    │
   │       + async coach-memory.write (facts scrubbés, progress goals)          │
   │                                                                            │
   └─11. STREAM structuré renvoyé au client  ◄─────────────────────────────────┘
            (tokens + éventuelle carte de confirmation)

──────────────────────────────────────────────────────────────────────────
HORS-LIGNE (cron, vercel.json)
  evolve-teen-profiles (0 2 * * *) : affinités + compaction mémoire
       → coach_conversation_summaries / coach_profile.long_summary / coach_facts
  generate-daily-content (0 1 * * *) : Batch API Haiku (-50%), structured output
       → educational_quizzes / mission_templates
  coach-retention-purge (mensuel) : purge >90j
       → avatar_messages / coach_facts / coach_conversation_summaries / coach_safety_log
```

---

## Ordre d'implémentation conseillé (verifiable goals)

1. **Sécurité/dette (bloquant légal)** : retirer `<EliteAICompanion>` de `layout.tsx` + supprimer le clone mort → tue le 2ᵉ coach, la fuite prénom, le hors-charte. *Vérif : grep 0 import vivant, `/teen` n'affiche plus qu'un coach.*
2. **Provider** : installer `@anthropic-ai/sdk`, réécrire `claude.ts` (SDK), dé-hardcoder `provider.ts`. *Vérif : `usage.cache_read_input_tokens` lisible, lint+typecheck verts.*
3. **Route unifiée** `/api/teen/coach` : caching + streaming + cap relevé. *Vérif : 2ᵉ tour → cache hit > 0 ; cap = env.*
4. **Agent loop + tools** (coach-tools.ts, MAX_STEPS, refusal). *Vérif : un « lance le quiz du jour » déclenche `start_daily_quiz` et reçoit une réponse finale.*
5. **Mémoire** (migration 119, coach-memory.ts, optin parental). *Vérif : RLS isole par teen ; PII jamais en base.*
6. **Greeting génératif** + cron compaction/purge + Batch contenu.

**Fichiers de référence (chemins absolus)** : `C:\Users\Shadow\Desktop\NIVY\lib\ai\provider.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\providers\claude.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\providers\factory.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\content-generator.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\context-engine.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\agent-actions.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\safe-context.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\content-safety.ts`, `C:\Users\Shadow\Desktop\NIVY\lib\ai\prompts\roles.ts`, `C:\Users\Shadow\Desktop\NIVY\app\api\teen\avatar-coach\route.ts`, `C:\Users\Shadow\Desktop\NIVY\app\api\agent\action\route.ts`, `C:\Users\Shadow\Desktop\NIVY\components\teen\avatar-coach.tsx`, `C:\Users\Shadow\Desktop\NIVY\components\teen\avatar-coach-client.tsx`, `C:\Users\Shadow\Desktop\NIVY\components\ai\elite-ai-companion.tsx`, `C:\Users\Shadow\Desktop\NIVY\components\teen\dashboard\ai-companion.tsx`, `C:\Users\Shadow\Desktop\NIVY\components\brand\niv-usage.tsx`, `C:\Users\Shadow\Desktop\NIVY\app\teen\layout.tsx`, `C:\Users\Shadow\Desktop\NIVY\vercel.json`.

### 3.3 Safety-by-design (mineurs 2026)

I have everything I need. The compliance audit document (CANON-AI-006) even specifies the exact distress-escalation contract (MA hotline + parent ping + 1h chat-lock). Note the live route uses `pseudo` (not full_name) — CANON-AI-005 has been partially remediated. Now I'll write the design document as my deliverable.

# SAFETY-BY-DESIGN DU COACH NIV — Mineurs 13-17 ans, cadre 2026

> **Public :** ingénierie + trust & safety Nivy. **Objet :** spécifier la couche de sécurité du coach IA unique (Niv), en remplacement de l'état actuel (deny-list regex + redirect, deux coachs concurrents, escalade inexistante).
> **Ancrage code (lu) :** `app/api/teen/avatar-coach/route.ts` (surface chat live, deny-list inline + `SAFE_REDIRECT`), `lib/ai/content-safety.ts` (filtre rule-based réutilisable, catégories typées), `lib/ai/safe-context.ts` (scrubPii + `safeAiContext`), `app/api/teen/report/route.ts` (sink `user_reports` + `audit_log` existant), `docs/compliance/11-personalization-ai-compliance.md` (CANON-AI-001 à -014).
> **Principe directeur 2026 :** public = exclusivement 13-17 ans ⇒ le régime « minors-safe » est le **défaut non négociable**, pas un mode optionnel. C'est exactement le terrain sur lequel Character.AI (suicide Sewell Setzer, settlement janv. 2026) et Replika (amende 5 M€ Garante, mai 2025) se sont fait sanctionner : **l'absence d'escalade en détresse et le traitement de données de mineurs sans base légale sont les fautes les plus coûteuses, bien avant la qualité du coaching.**

---

## 0. Constat de départ (ce que le code fait réellement aujourd'hui)

| Brique | État live (vérifié) | Verdict |
|---|---|---|
| Pré-filtre entrée | `DENY_PATTERNS` (5 regex) dans `route.ts:59-70`, court-circuite le modèle | Présent mais fragile (cf. §1) |
| Post-filtre sortie | `isReplySafe()` rejoue les regex + heuristique anglais 25% (`route.ts:81-94`) | Faible, redondant, contournable |
| Filtre partagé | `checkContentSafety()` dans `content-safety.ts` (8 catégories, normalisation NFD, darija) | **EXISTE mais N'EST PAS appelé par le chat coach** — duplication |
| PII | `route.ts:267-276` utilise `profiles.pseudo` (jamais full_name) | **Conforme** sur cette surface (CANON-AI-005 remédié ici ; reste cassé sur `/api/agent/action`) |
| Escalade détresse | **AUCUNE** — `SAFE_REDIRECT` texte générique, pas de hotline, pas de ping parent, pas de lock (CANON-AI-006) | **P0 manquant** |
| Transparence IA | Aucun label « tu parles à une IA » | **P0 manquant (AI Act art. 50, applicable 2 août 2026)** |
| Supervision parentale | Aucun écran, aucun consentement, aucun opt-out | **P0/P1 manquant** |
| Rétention | `avatar_messages` stocke les conversations de mineurs, sans purge ni DPIA | **P1 manquant** |
| Journal sécurité | `audit_log` existe (utilisé par `report/route.ts`) mais le coach n'y écrit rien | **À câbler (réutilisable)** |
| 2e coach | `EliteAICompanion` @deprecated monté `layout.tsx:73`, **zéro garde-fou**, fuit le prénom | **P0 — à démonter avant toute autre chose** |

**Décision d'architecture transverse :** toute la sécurité décrite ci-dessous vit dans **une seule surface** (`/api/teen/avatar-coach` → renommer `coach`) et **un seul module** (`lib/ai/coach-safety.ts`, nouveau, qui ré-exporte et étend `content-safety.ts`). Aucune politique ne doit exister sur une 2e route. Le démontage de `EliteAICompanion` (`layout.tsx:24,73`) est le **pré-requis P0 absolu** : il rend caduque toute la couche sécurité tant qu'une route sans garde-fous reste live.

---

## 1. Garde-fous de contenu

### 1.1 Limites des regex actuelles (à corriger, pas à empiler)

Les `DENY_PATTERNS` de `route.ts` et les blocklists de `content-safety.ts` ont 4 faiblesses structurelles :

1. **Contournement trivial** : fautes volontaires (`dr0gue`, `s3xe`), translittération darija latinisée (`zatla` est couvert mais pas `z@tla`), espacement (`s u i c i d e`), périphrases (« je veux plus être là »). Une regex de mots ne détecte pas l'**intention**.
2. **Faux positifs lourds** : `route.ts:69` bloque `islam|musulman|halal|priere du` → une question légitime « c'est quoi un repas halal ? » est censurée. `content-safety.ts` bloque `fumer|fume` et `nu` (sous-chaîne ⇒ touche « **nu**méro », « me**nu** » via word-boundary mais `nudite` etc.). Cela **étouffe l'utilité** sans gain de sécurité.
3. **Redondance / dérive** : deux blocklists (route inline + `content-safety.ts`) qui divergent. Le chat n'utilise PAS `content-safety.ts`.
4. **Granularité plate** : un match « drogue » (sujet à rediriger doucement) est traité comme un match « suicide » (crise → escalade humaine). **Pas la même réponse attendue.**

### 1.2 Architecture cible : pipeline en 4 étages, sévérité graduée

Centraliser dans `lib/ai/coach-safety.ts`. Chaque étage renvoie une `SafetyDecision` typée (étend `SafetyResult` de `content-safety.ts`) :

```
type Tier = "allow" | "redirect" | "crisis"
type SafetyDecision = {
  tier: Tier
  category: SafetyCategory | "crisis_self_harm" | "crisis_abuse"
  source: "regex" | "classifier" | "post_output"
  matchedTerm?: string   // logué hashé, jamais le message brut en clair
}
```

**Étage 1 — Pré-filtre déterministe (entrée).** Réutiliser `checkContentSafety()` de `content-safety.ts` (déjà offline, zéro coût, normalisation NFD + darija) au lieu de la regex inline de `route.ts`. **Séparer la classe crise** (`self_harm`, plus un nouveau set `abuse` : « il me touche », « mon oncle », « battu », « peur de rentrer ») du reste : un hit `self_harm`/`abuse` ⇒ `tier="crisis"` (→ §2), tout autre hit `block` ⇒ `tier="redirect"`.
*Corriger les faux positifs :* retirer `islam/musulman/halal/coran` du pré-bloc (ce sont des sujets de **conversation acceptables** ; ce qui doit rester bloqué = `controversial` réel : `polisario`, `djihad`, `destitution du roi` — déjà bien ciblés dans `content-safety.ts:98-106`). Affiner `nu` → `\bnudit|\bnue?s?\b` pour tuer les sous-chaînes.

**Étage 2 — Classifieur sémantique (entrée), nouveau, indispensable pour la crise.** La regex ne détecte pas l'idéation suicidaire formulée sans mot-clé — **c'est le défaut exact de Character.AI**. Ajouter une classification courte AVANT l'appel coach :
- Option économique recommandée : un **micro-appel Claude Haiku 4.5** (`claude-haiku-4-5`, ~1 $/1M in) avec `output_config: {format: {type:"json_schema"}}` renvoyant `{tier, category, confidence}`. Coût ~0,0005 $/tour, latence faible.
- Le classifieur ne **remplace pas** l'étage 1 : défense en profondeur. Un hit `crisis` de l'un OU l'autre ⇒ chemin crise.
- **Garde anti-étouffement :** le classifieur autorise explicitement les sujets sensibles non-crise traités sainement (puberté en termes neutres, stress scolaire) — il ne doit pas sur-bloquer. Seuil `crisis` prudent, mais en cas de doute, **on escalade plutôt qu'on ignore** (asymétrie de risque : un faux positif d'escalade = un parent prévenu pour rien ; un faux négatif = le scénario Sewell Setzer).

**Étage 3 — Refus natif du modèle (sortie).** Claude 4.x renvoie `stop_reason: "refusal"` + `stop_details.category`. **Câbler cette branche** (aujourd'hui non gérée) : un refus ⇒ servir `SAFE_REDIRECT` + (si catégorie self-harm) basculer en chemin crise. Filet en plus, pas remplacement.

**Étage 4 — Post-filtre sortie.** Remplacer `isReplySafe()` par `checkContentSafety()` sur la réponse modèle. Supprimer l'heuristique anglais 25% (le system prompt FR + le modèle suffisent ; garder une vérif longueur/format légère). Si la sortie hit `block` ⇒ `SAFE_REDIRECT` ; si `crisis` ⇒ chemin crise.

### 1.3 Défausse sans étouffer l'utilité

- `tier="redirect"` (drogue, sexe, religion-controversée non-crise) : **un message empathique court** + redirection parent/mentor (le `SAFE_REDIRECT` actuel est correct pour ce tier). **Ne PAS** locker le chat, **ne PAS** pinger le parent — c'est de la curiosité d'ado normale.
- `tier="crisis"` : chemin §2 complet.
- **Replay de l'historique (CANON-AI-007) :** `fetchHistory` réinjecte des tours passés sans recheck. Filtrer le replay : dropper tout `message_text` qui matche `block`/`crisis` (option (b) de l'audit — préserve l'audit trail). Sinon un message banni du tour N pollue le contexte du tour N+1.

---

## 2. Détection de détresse & escalade (le point critique)

C'est le delta P0 le plus important. L'audit interne (**CANON-AI-006**) spécifie déjà le contrat attendu — l'implémenter tel quel.

### 2.1 Signaux de détresse

- **Lexicaux (étage 1) :** sous-ensemble crise de `content-safety.ts` : `suicide`, `se tuer`, `automutilation`, `scarification`, `me couper`, `cutting` + nouveau set `abuse` (maltraitance, attouchement, violence domestique).
- **Sémantiques (étage 2, classifieur) :** idéation sans mot-clé (« je veux disparaître », « personne ne me regretterait »), désespoir, mention d'abus, troubles alimentaires (`anorexie`/`se faire vomir` déjà dans `SELF_HARM_TERMS`).
- **Comportementaux (optionnel, P2) :** pic de tours crise rapprochés.

### 2.2 Réponse empathique (jamais un mur)

Sur `tier="crisis"`, **ne pas servir le `SAFE_REDIRECT` générique** (trop froid pour une crise). Message dédié, validant, sans diagnostic ni conseil psy :

> « Je vois que c'est vraiment dur en ce moment, et je suis content·e que tu m'en parles. Je ne suis qu'une IA, alors je veux que tu parles à quelqu'un qui peut vraiment t'aider. »
> + ressource locale (ci-dessous) + « j'ai prévenu un adulte de confiance pour qu'il soit là pour toi. »

**Interdits absolus pendant un état de détresse** (alignés Character.AI/OpenAI Model Spec U18) : aucun roleplay, aucun « soutien émotionnel » improvisé en substitut de pro, et **aucune action payante poussée** (top-up, offre partenaire) — CANON-AI-006 l'exige explicitement.

### 2.3 Escalade (3 effets, cadre Maroc)

Implémenter le contrat CANON-AI-006 :

1. **Ressource d'aide locale.** Surfacer une ligne d'écoute marocaine dans la réponse + un panneau client persistant. *(À sourcer/valider produit avant prod — ne pas hardcoder un numéro non vérifié ; placeholder `[HOTLINE_MA]` jusqu'à validation T&S. Candidat cité dans l'audit : « Stop Silence ». Le numéro doit être confirmé par l'équipe conformité, pas inventé.)*
2. **Ping parent.** Insérer une ligne `user_notifications` (`type='teen_distress_signal'`, `recipient_id = parent_link.parent_id`, `urgency='high'`) — réutiliser l'infra notif existante. Message parent **sobre, non-alarmiste, sans citer le contenu brut** : « [pseudo] a évoqué un sujet difficile avec Niv aujourd'hui. Prends un moment pour discuter avec lui/elle. » (minimisation : pas de transcript).
3. **Lock chat 1h.** `teens.coach_locked_until = NOW() + INTERVAL '1 hour'` ; check en tête de route ⇒ `423 Locked` si actif (sinon un ado retente jusqu'au cap de 5). Le lock affiche la ressource d'aide, pas une erreur sèche.

### 2.4 Journal d'incident

Réutiliser **`audit_log`** (déjà câblé par `report/route.ts:110-120`). À chaque décision non-`allow`, écrire :
```
{ actor_id: teenId, actor_role:"teen", action:"coach_safety_event",
  metadata: { tier, category, source, locked: bool, parent_notified: bool, ts } }
```
**Ne jamais journaliser le message brut du mineur en clair** dans `metadata` (minimisation) — au plus un hash du terme déclencheur. Ce journal sert : (a) preuve de diligence pour CNDP/autorité, (b) tableau de bord T&S, (c) boucle d'amélioration du classifieur.

---

## 3. Supervision & transparence parentale

### 3.1 Transparence IA (obligation légale — AI Act art. 50, 2 août 2026)

- **Label persistant** « Niv est une IA, pas un humain » dans `avatar-coach-client.tsx` (près du composer + en en-tête du panneau). C'est applicatif, ~2h.
- L'exigence est **renforcée pour les publics vulnérables — explicitement les enfants** (guidelines de la Commission). Anthropomorphisme aggravant : nom + (à terme) voix ⇒ le label doit être **visible, pas enfoui dans des CGU**, langage adapté à l'âge.
- Premier message d'une session : Niv se présente comme IA.

### 3.2 Supervision parentale (standard de marché 2026, cf. OpenAI parental controls)

P1 (souhaitable au lancement, mais le **consentement** ci-dessous est P0) :
- **Écran parent** listant : que le coach IA est activé, le nombre d'échanges/jour, et un **résumé** des thèmes (pas le verbatim, par défaut — minimisation + respect d'un espace d'expression pour l'ado). Notification immédiate sur `teen_distress_signal` (§2.3).
- **Opt-out parental** du chat IA (le greeting non-conversationnel peut rester).
- **Débat à trancher (produit + T&S) :** visibilité du verbatim. Recommandation : **résumés par défaut**, verbatim seulement sur événement de détesse et seulement pour le parent lié. Surveiller un mineur à 100% peut le pousser vers des canaux non sûrs ; l'AADC privilégie l'intérêt de l'enfant.

### 3.3 Consentement (P0 — base légale)

- **Consentement parental vérifiable** à l'activation du chat IA (feature IA sur mineur). Sans lui, le traitement n'a pas de base légale (RGPD + loi 09-08, cf. §4). Matérialiser un enregistrement de consentement (`parental_consents` : `parent_id`, `teen_id`, `feature='ai_coach_chat'`, `granted_at`, `version_politique`).
- Tant que le consentement n'est pas accordé : chat IA désactivé, greeting statique seul autorisé.

### 3.4 Limites d'âge

- Public = 13-17 par construction ⇒ régime mineur **par défaut**, jamais relâché.
- Pas d'age assurance dure exigée au MVP, mais le **régime minors-safe est le défaut** (cf. direction OpenAI age-prediction / Character.AI). À documenter comme choix assumé.
- Garde-fou ton : adapter par `age_bucket` (`safe-context.ts` le calcule déjà : `13-14` / `15-16` / `17`) — registre plus protecteur pour les plus jeunes.

---

## 4. Données mineurs (RGPD + AI Act + loi 09-08 Maroc)

### 4.1 Minimisation / PII — déjà partiellement solide, à verrouiller

- `safe-context.ts` (`scrubPii` + `safeAiContext`, allow-list stricte, `FORBIDDEN_KEYS`) est **du bon travail** : c'est le socle. La surface chat utilise déjà `pseudo` (`route.ts:272`), conforme.
- **À faire :** passer **toute** donnée injectée au prompt (et toute mémoire écrite, cf. §4.4) par `safeAiContext`/`scrubPii`. Étendre le scrub à l'**écriture mémoire** (un résumé long terme ne doit jamais contenir de PII brute).
- **Test de non-régression** (CANON-AI-001/005) : asserter que le system+user prompt d'un teen `full_name='Yassine Benali'` ne contient ni `Yassine` ni `Benali`. + **CI grep** échouant sur `full_name|first_name|last_name|date_of_birth|cin|phone|address|email` dans tout fichier de `lib/ai/**` qui importe un provider modèle.
- **Bloquant connexe :** `EliteAICompanion` reçoit le **vrai prénom** (`userInfo.fullName.split`) et `/api/agent/action` sérialise `full_name`/`children.name` vers OpenAI US (CANON-AI-001, P0). Le démontage §0 ferme cette fuite.

### 4.2 Rétention & droit à l'effacement (P1)

- `avatar_messages` (et future `coach_memory`) = **données de mineur** ⇒ rétention bornée : **purge auto à 90 jours** (cron ou policy SQL). À inscrire au registre/DPIA.
- **Droit à l'effacement :** câbler la suppression des conversations + mémoire dans le flux account-delete existant (la mémoire memory cite déjà `account export/delete` comme adopteur de `NivCoach`). Effacement = teen ET parent peuvent demander.
- High-privacy **par défaut** (AADC) : pas de profilage publicitaire, réglages protecteurs par défaut.

### 4.3 Transfert hors-UE / hors-Maroc

- Anthropic/OpenAI = processeurs hors-UE et hors-Maroc. Documenter : base légale du transfert, garanties (DPA, clauses), et le fait que **seul `pseudo` + contexte non-PII** sort (grâce à `scrubPii`). À porter au registre + DPIA.

### 4.4 Où stocker la mémoire long terme

- **Recommandation : table `coach_memory` côté Supabase** (RLS par teen), PAS le memory tool Claude comme stockage primaire. Raisons : maîtrise totale du RLS, de la rétention/purge, de l'effacement, et de la résidence. Le memory tool Claude n'est qu'un protocole client-side — le stockage et **toute la conformité mineurs restent à notre charge** (la doc Anthropic interdit d'ailleurs explicitement secrets/PII).
- `coach_memory` : `teen_id`, `summary` (PII-scrubbed), `updated_at`, marquée donnée de mineur, purge 90j, soumise au consentement §3.3.

### 4.5 Cadre marocain (loi 09-08 / CNDP)

- Traitement de données d'enfants ⇒ **consentement du représentant légal** (parent) obligatoire (§3.3) + déclaration/registre CNDP.
- Cohérence cadre halal déjà dans le system prompt (`route.ts:121`) — conserver.

---

## 5. Checklist Go / No-Go avant prod

Légende : **P0** = bloque le lancement (risque légal/welfare). **P1** = doit suivre vite. **souhaitable** = amélioration.

### P0 — No-Go tant que non fait

| # | Item | Fichier / ancrage |
|---|---|---|
| P0-1 | **Démonter `EliteAICompanion`** (2e coach sans garde-fous + fuite prénom) | `app/teen/layout.tsx:24,73` |
| P0-2 | **Une seule surface coach** + neutraliser/supprimer `/api/agent/action` côté teen | `app/api/agent/action/route.ts` |
| P0-3 | **Chemin crise complet** : ressource MA + ping parent + lock 1h + message empathique dédié | `route.ts` (chemin `tier=crisis`) — CANON-AI-006 |
| P0-4 | **Classifieur de détresse** (Haiku) en plus des regex (détection sans mot-clé) | `lib/ai/coach-safety.ts` (nouveau) |
| P0-5 | **Label transparence IA** « Niv est une IA » persistant | `components/teen/avatar-coach-client.tsx` — AI Act art. 50 |
| P0-6 | **Consentement parental** matérialisé pour activer le chat IA | `parental_consents` (nouveau) |
| P0-7 | **PII zéro** : test de non-régression prénom + CI grep `lib/ai/**` | `safe-context.ts`, CI |
| P0-8 | **Journal d'incident** sur chaque event non-allow (sans verbatim) | `audit_log` (réutilisé) |
| P0-9 | **Numéro hotline MA vérifié** (pas inventé) avant d'aller en prod | T&S / conformité |

### P1 — à livrer rapidement après lancement

| # | Item |
|---|---|
| P1-1 | Centraliser sécurité dans `coach-safety.ts` (fin de la double blocklist) ; brancher `checkContentSafety()` sur entrée ET sortie du chat |
| P1-2 | Brancher la branche `stop_reason:"refusal"` de Claude 4.x |
| P1-3 | Filtrer le replay d'historique (CANON-AI-007) |
| P1-4 | Écran de supervision parentale (résumés + notif détresse) + opt-out |
| P1-5 | Rétention 90j (purge `avatar_messages` + `coach_memory`) + effacement câblé dans account-delete |
| P1-6 | DPIA + registre CNDP/RGPD (transfert hors-UE, données de mineur) |
| P1-7 | Corriger les faux positifs regex (`islam/halal/fumer/nu`) pour ne pas étouffer l'utilité |

### Souhaitable (qualité / état de l'art)

- Adaptation du ton par `age_bucket` ; mémoire long terme `coach_memory` (sous consentement) ; mid-session system message (signal opérateur non spoofable « mode renforcé parent ») ; dashboard T&S sur `audit_log` ; relever le cap absurde de 5 tours/jour (anti-coaching) une fois la sécurité solide ; boucle d'amélioration du classifieur depuis le journal.

---

## Synthèse

La sécurité de Niv n'est pas un module à ajouter : c'est la **condition de mise en prod**. Le code a déjà deux briques saines à capitaliser — `safe-context.ts` (PII) et `content-safety.ts` (filtre rule-based typé) — et une infra d'audit réutilisable (`audit_log`). Les trois trous P0 sont : **(1) le 2e coach sans garde-fous (`EliteAICompanion`)** qui invalide tout le reste tant qu'il est live, **(2) l'absence totale d'escalade en détresse** (le défaut Character.AI, déjà spécifié par CANON-AI-006 mais non implémenté), et **(3) l'absence de transparence IA + consentement parental** (AI Act art. 50 le 2 août 2026, loi 09-08). Tout le reste — classifieur, post-filtre unifié, mémoire gouvernée, rétention — se greffe proprement sur une **surface unique** une fois ces trois trous fermés.

Fichiers à toucher (chemins absolus) : `C:\Users\Shadow\Desktop\NIVY\app\teen\layout.tsx` (démontage), `C:\Users\Shadow\Desktop\NIVY\app\api\teen\avatar-coach\route.ts` (chemins tier/crise, lock, post-filtre), `C:\Users\Shadow\Desktop\NIVY\lib\ai\content-safety.ts` (réutilisation + split crise + faux positifs), `C:\Users\Shadow\Desktop\NIVY\lib\ai\safe-context.ts` (scrub étendu à la mémoire), `C:\Users\Shadow\Desktop\NIVY\components\teen\avatar-coach-client.tsx` (label IA), nouveau `C:\Users\Shadow\Desktop\NIVY\lib\ai\coach-safety.ts` (pipeline centralisé), réutilisation de `audit_log` (déjà câblé via `C:\Users\Shadow\Desktop\NIVY\app\api\teen\report\route.ts`). Référence normative interne : `C:\Users\Shadow\Desktop\NIVY\docs\compliance\11-personalization-ai-compliance.md` (CANON-AI-001, -005, -006, -007).

### 3.4 Roadmap d'implémentation

# ROADMAP D'IMPLÉMENTATION — COACH NIV (existant → cible 2026)

> **Ancrage.** Synthèse des 4 audits code + panorama SOTA + note capacités Claude API. Tous les chemins sont vérifiés dans les `evidenceFiles`. Chiffrage en jours-homme (j) et tailles S (<1j) / M (1-3j) / L (4-10j). Le risque dominant n'est **pas** la qualité du coaching — c'est la **conformité mineurs** (terrain Character.AI / Replika). La roadmap est ordonnée en conséquence : on **éteint le risque légal avant d'enrichir le produit**.

---

## 0. Point de départ (rappel factuel)

- **DEUX coachs montés simultanément** sur `/teen` : `<AvatarCoach>` (carte Niv, server, zéro IA) + `<EliteAICompanion role='teen'>` (bouton flottant « Kai », `@deprecated` #83, **monté en prod** via `app/teen/layout.tsx:73`).
- **Kai = profil de risque Character.AI** : nom humain + voix (TTS/ASR) + **aucun garde-fou** dans `TEEN_AGENT_PROMPT` + **aucun filtre entrée/sortie** + **reçoit le vrai prénom** (`teenName={userInfo.fullName?.split(' ')[0]}`) → fuite PII + hex hors charte (`#8b5cf6`/`#f43f5e`/`#10b981`) + `MeshBackground`.
- **Backend Kai** : `gpt-4o-mini` **en dur** (`lib/ai/provider.ts:15`), agent loop **cassé** (pas de `maxSteps`), `updateBudgetLimit` renvoie un **faux succès** (`agent-actions.ts:79`).
- **Coach « principal » Niv** : greeting 100% scripté (`defaultGreeting()` codé en dur, aucun cron ne peuple `avatar_messages`), chat v2 plafonné **5 tours/jour**, mémoire = **3 paires SQL**, **seul le pseudo** injecté au LLM, pas de streaming, pas de tools, fetch HTTP artisanal `anthropic-version: 2023-06-01`.
- **3ᵉ clone mort** : `components/teen/dashboard/ai-companion.tsx` (aucun caller).

---

## 1. QUICK WINS (< 1 jour chacun) — à faire en premier, dans l'ordre

| # | Action | Fichier(s) | Effort | Gain |
|---|---|---|---|---|
| QW-1 | **Démonter EliteAICompanion du teen** : retirer l'import + le bloc `<EliteAICompanion>` | `app/teen/layout.tsx:24,73-79` | S (~30 min) | Tue d'un coup : 2ᵉ coach, fuite prénom, TTS/confetti/hex/MeshBackground hors charte, tools mutateurs non maîtrisés, surface sans garde-fou. **Éteint le risque légal #1.** |
| QW-2 | **Supprimer le 3ᵉ clone mort** | `components/teen/dashboard/ai-companion.tsx` | S (~15 min) | Enlève le faux positif d'audit « KAI ». Grep confirme zéro caller. |
| QW-3 | **Sortir le modèle du dur** : `gpt-4o-mini` → `process.env.OPENAI_MODEL_ID \|\| DEFAULT_OPENAI_MODEL` | `lib/ai/provider.ts:15` | S (~30 min) | Aligne `/api/agent/action` sur le routing env-driven déjà utilisé par `content-generator.ts`. (Route restée morte après QW-1, mais on supprime l'anti-pattern.) |
| QW-4 | **Réparer l'agent loop** : ajouter `stopWhen: stepCountIs(5)` à `streamText` | `app/api/agent/action/route.ts:289` | S (<1h) | Ferme la boucle tool→résultat→réponse. Filet de sécurité si la route survit transitoirement. |
| QW-5 | **Action mensongère honnête** : `updateBudgetLimit` renvoie un échec si la table n'existe pas (au lieu de « Simulé - succès ») | `lib/ai/agent-actions.ts:79` | S (~30 min) | Supprime la tromperie de confiance familiale. |
| QW-6 | **Label transparence IA persistant** : micro-texte « Niv est une IA, pas un humain » près du composer | `components/teen/avatar-coach-client.tsx` | S (~1h) | Amorce conformité **AI Act art. 50** (applicable 2 août 2026). |
| QW-7 | **Relever le cap** : `DAILY_TURN_CAP=5` → `Number(process.env.COACH_DAILY_TURN_CAP) \|\| 20` | `app/api/teen/avatar-coach/route.ts:49` | S (~15 min) | Le 5/jour codé en dur tue tout usage « coach ». |
| QW-8 | **Injecter le profil réel dans le prompt** : XP, streak, top intérêts (`teen_interests`), mood → `buildSystemPrompt` | `app/api/teen/avatar-coach/route.ts:101-124,266-276` | S (~0,5j) | Données déjà lues ailleurs. Plus gros gain de personnalisation perçue à faible coût. |

**Total quick wins : ~1,5 j** pour éteindre le risque légal majeur + restaurer une personnalisation de base.

> ⚠️ **Ne PAS** se contenter de masquer Kai en CSS. **Démonter le mount** (QW-1) : tant qu'il est monté, il appelle `/api/agent/action` et reçoit le prénom.

---

## 2. TOP PROBLÈMES PRIORISÉS

| Pri | Problème | Preuve | Effort | Phase |
|---|---|---|---|---|
| **P0** | Coach `@deprecated` (Kai) en prod sur mineurs, **sans aucun garde-fou** entrée/sortie | `layout.tsx:73` → `/api/agent/action` + `TEEN_AGENT_PROMPT` (roles.ts) | **S** | QW-1 |
| **P0** | **Fuite PII** : vrai prénom envoyé à Kai (contredit `safe-context.ts`) | `layout.tsx:75` | **S** | QW-1 |
| **P0** | **Aucune détection de détresse + aucune escalade** humaine/parentale (le défaut exact qui a coulé Character.AI) | `avatar-coach/route.ts` (deny-list regex only), `report/route.ts` ne couvre pas le coach | **M** | Phase 4 (amorce QW) |
| **P0** | **Aucune transparence IA** (« tu parles à une IA ») — obligation AI Act art. 50, 2026-08-02 | aucun label client | **S** | QW-6 |
| **P1** | Identité schizophrène (Niv vs Kai/Aura/Biz/Hype/Ops), bouton Kai affiche le SVG Niv | `elite-ai-companion.tsx:64-70,268,274` | **S** | QW-1 + P1 |
| **P1** | Greeting **100% scripté**, zéro IA live, jamais peuplé en proactif | `avatar-coach.tsx:8,327-341` ; aucun cron n'écrit `avatar_messages` | **M** | Phase 2 |
| **P1** | **Pas de mémoire long terme** (3 paires SQL) | `avatar-coach/route.ts:52` | **M** | Phase 2 |
| **P1** | Modèle daté `gpt-4o-mini` en dur + fetch artisanal Anthropic + zéro caching | `provider.ts:15`, `claude.ts:16` | **M** | Phase 1 |
| **P1** | Pas de streaming (réponse atomique) | `avatar-coach/route.ts` | **S** | Phase 1 |
| **P2** | Agent loop cassé / tools factices (4/9 réels) sur surface morte | `agent/action/route.ts:289`, `agent-actions.ts` | **M** | Phase 3 |
| **P2** | `content-generator` parse JSON au regex (fragile) | `content-generator.ts:356` | **S** | Phase 3 |
| **P2** | Drift schéma actions réelles (`budget_limits`, `offers`, `add_xp_to_user`) | `agent-actions.ts:69,99` ; mémoire `schema-drift` | **M** | Phase 3 |
| **P2** | Pas de supervision parentale / consentement / rétention bornée (UK AADC, RGPD, loi 09-08 CNDP) | aucun écran parent, pas de purge `avatar_messages` | **L** | Phase 4 |
| **P2** | Pas de modèle frontier unifié / observabilité tokens-coût | `provider.ts`, deux backends | **M** | Phase 1+3 |

---

## 3. SÉQUENCE — 4 PHASES

### Phase 0 — Hygiène & extinction du risque (Quick wins) — **~1,5 j**
Tous les QW-1 → QW-8 ci-dessus.
**Critère de sortie :**
- `grep EliteAICompanion app/teen` = 0 résultat ; `/api/agent/action` n'a plus de caller teen.
- Aucun hex brut / TTS / MeshBackground rendu côté teen.
- Aucun vrai nom envoyé à un LLM (seul `pseudo`).
- Label « IA » visible sur le chat ; cap chat configurable ≥ 20.
- `lint` + `typecheck` verts.

---

### Phase 1 — Unifier l'identité & rebrancher le backend — **~4-5 j (M)**
1. **Une seule surface, un seul nom** : le chat teen passe par `<NivCoach>` (`components/brand/niv-usage.tsx`, déjà conforme charte). Supprimer `agentConfig` Kai/Aura/Biz/… côté teen.
2. **SDK officiel** : installer `@anthropic-ai/sdk`, remplacer le fetch artisanal de `lib/ai/providers/claude.ts` (header figé `2023-06-01`).
3. **Routage env-driven par surface** (généraliser `resolveModelId`) :
   - chat → `claude-sonnet-4-6` (stream, `effort` low/medium)
   - greeting → `claude-haiku-4-5` (`effort` low)
4. **Prompt caching** : ordre `tools → system[sécurité figé] → system[contexte profil]` avec `cache_control` sur le dernier bloc system ; **aucun `Date.now()`/UUID dans le system** (heure → dernier message user). Préfixe > 4096 tk (Sonnet/Opus 4.x).
5. **Streaming** : `client.messages.stream(...)` → réponse token-par-token côté `avatar-coach-client.tsx`.

**Attention modèle (vérifié) :** `temperature`/`top_p`/`budget_tokens` **400ent sur Opus 4.8** (adaptive thinking only). Le `temperature: 0.7` actuel d'`openai.ts` ne se porte pas tel quel.

**Critère de sortie :**
- Un seul coach « Niv », un seul backend, un seul provider env-driven (plus aucun modèle en dur).
- `usage.cache_read_input_tokens > 0` vérifié en prod sur tours répétés.
- Chat streame ; latence 1er token < 1,5 s.

---

### Phase 2 — Mémoire long terme & proactivité — **~5-7 j (L)**
1. **Mémoire applicative** : table `coach_memory(teen_id, résumé, objectifs, ton_préféré, …)` sous RLS, **PII-scrub à l'écriture** (`safe-context.ts` étendu), injectée dans le bloc system caché. Élargir la fenêtre au-delà de 3 paires + résumé persistant ré-injecté.
2. **Greeting génératif** : `defaultGreeting()` figé → Haiku contextualisé (streak, quête du jour via `recommend_for_teen`, heure).
3. **Proactivité réelle** : un **cron** (réutiliser `evolve-teen-profiles`) écrit **1 `avatar_messages` non-dismissed/jour** basé sur signaux (streak cassé, quiz du jour) → le greeting cesse d'être un fallback statique.
4. **Mood inféré** (sans LLM) : série cassée → `tired`, quiz réussi → `happy`, côté serveur.

**Critère de sortie :**
- ≥ 90% des greetings teen sont générés/contextualisés (plus le fallback codé en dur).
- Le coach se « souvient » d'un objectif d'une session à l'autre (test inter-session vérifiable).
- Purge `coach_memory`/`avatar_messages` programmée (rétention bornée, ex. 90 j).

---

### Phase 3 — Tools agentiques fiables — **~4-6 j (M/L)**
1. **Tool runner** (SDK) sur la surface Niv unifiée → boucle multi-tours qui se ferme (corrige par construction le bug `maxSteps`).
2. **Tools réels & gatés** : `start_quiz`, `check_in`, `create_quest`, `respond_parent_challenge` (auto) ; `open_savings_goal`, `book_event` (**boucle manuelle + confirmation parentale**).
3. **Corriger le drift schéma** des actions réelles (`add_xp_to_user`, `offers`, `parent_chores`) ; **supprimer les faux succès**.
4. **Structured outputs** sur `content-generator` (`output_config json_schema` / `messages.parse()`) → fin du parsing regex.
5. **Batch API** sur `generate-daily-content` (cron nocturne) → **−50%** sur la génération de cohortes.

**Critère de sortie :**
- Un tour de chat peut **agir** (lancer un quiz, valider une corvée) avec écriture Supabase réelle vérifiée.
- Aucune action ne renvoie de faux succès.
- `content-generator` produit du JSON garanti conforme (zéro fallback regex).

---

### Phase 4 — Safety mineurs de niveau réglementaire — **~6-9 j (L)**
1. **Détection de détresse + escalade** : sous-ensemble « crise » (suicide/automutilation/abus) → en plus du `SAFE_REDIRECT`, **alerte parent** (notif existante) + **ressource d'urgence Maroc** (ligne d'écoute). Brancher la branche native `stop_reason: "refusal"`.
2. **Journalisation d'audit** : table `ai_safety_log {teen_id, type, pattern_cat, ts}` à chaque blocage entrée / rejet sortie / défausse (réutilise l'infra `audit_log`).
3. **Supervision parentale** : écran parent voit un **résumé** des conversations IA + **consentement parental matérialisé** (opt-in) + opt-out (modèle OpenAI parental controls / UK AADC).
4. **Conformité données** : DPIA, registre, rétention documentée, transfert hors-UE encadré (RGPD + loi 09-08 CNDP).
5. **Classifieur de modération** (provider) en complément de la deny-list regex (contournable / faux positifs sur « religion »/« fumer »).

**Critère de sortie :**
- Une détresse exprimée → alerte humaine + ressource locale + log d'audit (testé sur scénarios).
- Parent peut consentir, voir un résumé, désactiver le coach IA.
- DPIA/registre à jour ; purge active.

---

## 4. DÉPENDANCES & RISQUES

| Type | Élément | Détail / mitigation |
|---|---|---|
| **Clé API** | `ANTHROPIC_API_KEY` | Pré-requis Phase 1+. Sans elle, fallback OpenAI ou message « cerveau en pause » (`route.ts:301`) → **monitorer** la dégradation silencieuse. |
| **Dépendance pkg** | `@anthropic-ai/sdk` **non installé** (seul `@ai-sdk/openai` + `ai` présents) | Bloque Phase 1 (SDK officiel). `npm i @anthropic-ai/sdk`. |
| **Modèle** | Opus 4.8 retire `temperature`/`budget_tokens` | Le code OpenAI/Claude actuel (`temperature: 0.7`) **400e** sur Opus → adapter avant de router des tâches lourdes vers Opus. |
| **Caching** | Invalidation silencieuse | Tout horodatage/UUID dans le system tue le cache ; clés JSON triées ; préfixe > 4096 tk. Vérifier `cache_read_input_tokens > 0`. |
| **Schéma live** | Drift `budget_limits`/`offers`/`add_xp_to_user`/`parent_chores` | Bloque les tools réels (Phase 3). Re-baseliner vs schéma live (mémoire `schema-drift`). |
| **Coût** | ~**0,034 \$/teen/jour** (chat Sonnet caché 10 tours + greeting Haiku), soit ~**1 \$/teen/mois** | Caching divise le coût chat par ~2,5. À re-baseliner via `count_tokens()` sur prompts réels. Batch −50% sur le cron. |
| **Conformité BLOQUANTE** | AI Act art. 50 (**2026-08-02**), RGPD, loi 09-08 CNDP, UK AADC | Transparence IA (QW-6) + escalade détresse + consentement parental sont des **gates légaux**, pas du « nice-to-have ». Public 100% mineurs 13-17 → régime minors-safe = défaut non négociable. |
| **Mémoire** | Memory tool Claude = protocole uniquement | Le stockage **et** toute la conformité mineurs restent à notre charge → on privilégie la mémoire applicative Supabase (RLS/purge maîtrisés). Jamais de PII brute. |
| **Hors scope** | MCP / Managed Agents / sous-agents | Inadaptés au chat coach grand-public (compute hébergée, RLS Supabase). À ignorer pour le MVP. |

**Risque transverse :** supprimer Kai **sans porter ses capacités** (tools, voix) = régression de features perçue. Mitigation : Phase 3 réimplémente les tools utiles sur la surface canonique **avant** de communiquer la disparition de Kai.

---

## 5. MVP COACH 2026 — livrable en ~1-2 semaines (~8-10 j)

Objectif : **un seul coach Niv, crédible, légalement défendable**, sans attendre les tools agentiques ni la supervision parentale complète.

**Périmètre (Phase 0 + Phase 1 + sous-ensemble Phase 2/4) :**

| Lot | Contenu | Effort |
|---|---|---|
| **A. Extinction risque** (Phase 0) | QW-1 à QW-8 : démonter Kai, tuer code mort, label IA, profil dans le prompt, cap relevé | ~1,5 j |
| **B. Backend unifié** (Phase 1) | `@anthropic-ai/sdk`, routage env (Sonnet chat / Haiku greeting), prompt caching, streaming, identité unique « Niv » | ~4 j |
| **C. Greeting vivant + mémoire courte** (sous-Phase 2) | `defaultGreeting()` → Haiku contextualisé ; résumé persistant ré-injecté (1 champ sur `avatars`/`coach_memory`) ; mood inféré | ~2 j |
| **D. Safety welfare minimale** (sous-Phase 4) | Détection crise → **alerte parent + ressource Maroc** + branche `stop_reason:"refusal"` + log d'audit `ai_safety_log` | ~1,5 j |

**Total : ~9 j (≈ 2 semaines).**

**Le MVP coche, de façon réelle et non cosmétique :**
1. ✅ **Identité unique persistante** (Niv, un backend, charte respectée).
2. ✅ **Personnalisation profil réel** dans le prompt (XP/streak/intérêts/mood).
3. ✅ **Greeting génératif** (fin du template figé) + **mémoire courte persistante**.
4. ✅ **Streaming** token-par-token + **modèle frontier** routé par tâche.
5. ✅ **Prompt caching** (coût ~1 \$/teen/mois maîtrisé).
6. ✅ **Transparence IA** (label, AI Act art. 50).
7. ✅ **Détection de détresse + escalade parent + ressource locale + audit** (le gate qui a coulé Character.AI).

**Explicitement HORS MVP** (Phases 3 & 4 complètes) : tools agentiques mutateurs, structured outputs/Batch sur le cron, supervision parentale complète (écran résumé + consentement formel), DPIA/registre, classifieur de modération provider, voix. → itérations suivantes.

**Critère de sortie MVP :** un teen sur `/teen` voit **un seul** coach Niv, qui le salue de façon contextualisée, streame ses réponses, se souvient d'un objectif d'une session à l'autre, affiche qu'il est une IA, et **escalade une détresse vers le parent avec une ressource d'urgence** — le tout sur backend Claude unifié et caché, sans aucun hex/effet hors charte ni fuite PII.

---

**Fichiers pivots (chemins absolus) :**
`C:\Users\Shadow\Desktop\NIVY\app\teen\layout.tsx` (démonter Kai) · `C:\Users\Shadow\Desktop\NIVY\components\ai\elite-ai-companion.tsx` (à retirer) · `C:\Users\Shadow\Desktop\NIVY\components\teen\dashboard\ai-companion.tsx` (code mort à supprimer) · `C:\Users\Shadow\Desktop\NIVY\lib\ai\provider.ts` (modèle en dur) · `C:\Users\Shadow\Desktop\NIVY\lib\ai\providers\claude.ts` (fetch artisanal → SDK) · `C:\Users\Shadow\Desktop\NIVY\app\api\teen\avatar-coach\route.ts` (surface chat : caching/streaming/mémoire/cap) · `C:\Users\Shadow\Desktop\NIVY\components\teen\avatar-coach.tsx` (greeting génératif) · `C:\Users\Shadow\Desktop\NIVY\components\teen\avatar-coach-client.tsx` (label IA, streaming) · `C:\Users\Shadow\Desktop\NIVY\lib\ai\content-generator.ts` (resolveModelId/structured/Batch) · `C:\Users\Shadow\Desktop\NIVY\lib\ai\safe-context.ts` (scrub PII → écriture mémoire) · `C:\Users\Shadow\Desktop\NIVY\app\api\agent\action\route.ts` (boucle cassée — fusionner/supprimer) · `C:\Users\Shadow\Desktop\NIVY\components\brand\niv-usage.tsx` (`<NivCoach>` canonique).
