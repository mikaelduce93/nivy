# Régénération du typage Supabase — runbook (#360)

## Pourquoi c'est critique

`types/supabase.ts` type les clients Supabase via `<Database>`. **Si ce fichier
est en retard sur le schéma live, `tsc` valide tout le code contre un typage
faux** : des requêtes vers des tables/colonnes qui n'existent plus compilent
sans erreur et échouent en production.

C'est exactement ce qui a produit **#360** : le typage avait ~70 migrations de
retard → **1060 erreurs de drift masquées = 235 requêtes cassées en prod**
(tables droppées, colonnes renommées, RPC au mauvais paramètre…).

## Règle d'or

> **Après CHAQUE migration appliquée en base, régénérer le typage et le committer
> dans le même lot.**

```bash
npm run types:generate        # régénère types/supabase.ts depuis la base live
git add types/supabase.ts
git commit -m "types: régénérés après migration NNN"
```

`types:generate` requiert `SUPABASE_ACCESS_TOKEN` (jeton perso Supabase) dans
l'environnement. Alternative sans CLI : le serveur MCP Supabase
(`generate_typescript_types`) produit le même typage.

## Gardes en place

| Garde | Ce qu'elle vérifie | Où |
|-------|--------------------|-----|
| `npm run typecheck` (`tsc --noEmit`) | cohérence **code ↔ types** | CI (canon-compliance, ci.yml) |
| `npm run types:check` | cohérence **types ↔ base live** (anti-#360) | CI (canon-compliance) — no-op sans `SUPABASE_ACCESS_TOKEN` |
| `npm run lint:drift` | `.from('<table>')` littéral contre l'allowlist `docs/compliance/db-relations.json` | CI |

**Les trois sont complémentaires** : `tsc` seul ne suffit pas (il fait confiance
au typage committé) ; `types:check` est la garde qui aurait bloqué #360.

### Activer `types:check` en CI

1. Créer un jeton d'accès Supabase (dashboard → Account → Access Tokens).
2. L'ajouter en secret repo : `SUPABASE_ACCESS_TOKEN`.
3. Régénérer une fois via la CLI (`npm run types:generate`) et committer pour
   figer le formatage canonique (le générateur MCP et la CLI peuvent différer
   sur des détails de formatage).

Tant que le secret n'est pas configuré, le job `types:check` se skippe (vert).

## Portée des CI

`canon-compliance.yml` (typecheck + drift + canon + types:check) tourne désormais
sur `main`, `develop`, `refonte/**`, `milestone/**` et **tout PR** — avant, il ne
tournait que sur `main`, ce qui laissait les branches de travail accumuler le
drift sans contrôle (co-cause de #360).

## Après une migration : checklist

- [ ] Migration appliquée en base live (MCP `apply_migration` ou CLI).
- [ ] `npm run types:generate` + commit.
- [ ] Nouvelle(s) table(s) ajoutée(s) à `docs/compliance/db-relations.json`
      (allowlist drift-lint) si requêtée(s) en `.from('<table>')`.
- [ ] `npm run typecheck` local vert (ou laisser la CI le faire).
