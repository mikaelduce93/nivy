# Revue de hiérarchie — la règle 1-2-3 (refonte V2 #126)

> Implémentation du chantier audit **§3.7 « Hiérarchie plate : tout au même poids, rien ne ressort »** (`docs/refonte/03-AUDIT-UI-UX-PAR-ECRAN.md`, roadmap #10).
>
> Outillage jumeau : `scripts/hierarchy-lint.mjs` (baseline `docs/compliance/hierarchy-baseline.json`).
> CI : étape *Hierarchy enforce* dans `.github/workflows/canon-compliance.yml`.

Le piège du milestone : un *recolor* superficiel **garde la même grille** (4 stat-cards rondes équipondérées), la même hiérarchie plate, et la pousse de 3.5 à 6 sans vrai travail de structure. Cette doc est la grille de revue qui **bloque ce piège**.

---

## La règle 1-2-3 (3 questions de revue par écran)

### 1 — Quel est LE chiffre hero ?
Exactement **un** `<StatHero>` / `<DarkSurface>` (F2) **unique** par écran : surface sombre ponctuelle (`#1a1530→#0e0c1a`), chiffre **Bricolage géant** (`font-display`, `tabular-nums`, 34–88px), token économique (XP `gold` / Coins ⊙ `coral` / Niveau `teal` / Streak 🔥 `pink`).
- **Jamais zéro** → hiérarchie plate, rien ne ressort.
- **Jamais deux** → compétition visuelle, le regard ne sait plus où aller.

### 2 — Quel est LE CTA ?
Exactement **un** CTA primaire évident : `<Button variant="pink">` (ou `primary`), bordure ink + ombre sticker. Toutes les autres actions passent en **secondaire** (`outline`) ou **ghost**. Un écran avec 4 boutons « pleins » n'a, de fait, aucun CTA.

### 3 — Le reste est-il secondaire ?
Tout ce qui n'est pas le chiffre hero ou le CTA est **du secondaire** : `<StickerCard>` (F1), méta en **JetBrains Mono**, eyebrow mono UPPERCASE. Pas de second `font-black`, pas de second dégradé qui crie.

---

## Ce qu'on bannit (et le remplacement kit)

| Anti-pattern | Pourquoi | Remplacement (kit F) |
|---|---|---|
| **Mur de ≥4 stat-cards équipondérées** (`grid-cols-4` de blocs métriques) | Aucun chiffre ne domine | **1** `<StatHero>` (F2) dominant + `<StickerCard>` (F1) secondaires |
| **Listes/grilles plates** (`rounded border`, tout au même poids) | Pas de rythme | `<StickerCard>` (F1) : bordure 2px ink + ombre décalée |
| **`font-black` comme titre** | Inter gras ≠ signature charte | eyebrow mono UPPERCASE + `<h1 class="font-display">` avec `<em class="italic text-pink">` (F3) |
| **`text-gradient` / `bg-clip-text`** | Glow gen-z banni | titre Bricolage `<em>` rose |
| **`GlassCard` / `EnergyOrb` / `BentoCard` / `Parallax*`** | glass/orb/parallax bannis (§3.2) | `<StickerCard>` / `<StatHero>` / `<MeshBackground>` |

---

## Avant / après (archétypes de référence)

### ✅ `/parent/family-plan` — 7.5/10 (bon)
Eyebrow mono · titre Bricolage `famille` rose · **1** plan vedette qui domine (`<PricingSticker featured>` ombre rose + lift) · features check rond lime · CTA pink unique. → désormais via `<PricingSticker>` (F10). Le regard va droit au plan recommandé.

### ✅ `/teen/avatar` — 8/10 (bon)
Surface sombre ponctuelle avec **1** hero (l'avatar/level), secondaire en cartes sticker. Le niveau domine, le reste respire.

### ❌ `components/parent/dashboard/financial-overview.tsx` — contre-exemple
`<h3 class="text-3xl font-black">` + `grid grid-cols-2` de blocs **équipondérés** (`Dépenses du mois` / `Prévision` en `text-5xl font-black`, **aucun ne domine**) + `EnergyOrb` (primitive bannie) + import `framer-motion` brut. C'est le « cockpit SaaS recoloré ».
**Fix attendu :** choisir LE chiffre qui compte (ex. le solde) → `<StatHero tone="coral">` ; les autres métriques → `<StickerCard>` secondaires ; titre → eyebrow mono + Bricolage `<em>` rose ; retirer `EnergyOrb`.

---

## Outillage

```bash
npm run lint:hierarchy:all       # informationnel : compte par règle (HIER-001/002/003)
npm run lint:hierarchy:baseline  # (re)génère la baseline tolérée
npm run lint:hierarchy           # --enforce (CI) : FAIL sur net-new + régression de count
```

Règles (`scripts/hierarchy-lint.mjs`), scopées `components/**` + `app/**/*-client.tsx` :
- **HIER-001** `font-black` (titre) — **bloque le net-new**.
- **HIER-002** `grid-cols-4` (mur de stat-cards) — signal informationnel/baseline.
- **HIER-003** primitives bannies (`EnergyOrb`/`GlassCard`/`BentoCard`/`Parallax*`).

Mécanique **baseline tolérante** (comme `canon-precommit`) : l'existant (529 occurrences) est capturé, **seul le net-new échoue**. Escape hatch par ligne : `// canon-allow: <raison>`.

> Checklist PR : avant de marquer un écran « repensé », réponds aux 3 questions ci-dessus. Si tu ne peux pas pointer LE chiffre hero et LE CTA, l'écran est encore plat.
