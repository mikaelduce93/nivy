#!/usr/bin/env node
/**
 * check-types-fresh — garde anti-drift de typage Supabase (#360).
 *
 * Cause racine de #360 : `types/supabase.ts` avait ~70 migrations de retard.
 * Comme les clients sont typés `<Database>`, `tsc` validait tout le code contre
 * un typage FICTIF → 1060 requêtes cassées sont passées inaperçues en CI.
 *
 * Ce script régénère le typage depuis la base LIVE et échoue si le fichier
 * committé diverge — forçant `npm run types:generate` + commit après chaque
 * migration. C'est le complément indispensable du `tsc` (qui ne teste que la
 * cohérence code↔types, pas types↔base).
 *
 * Activation :
 *   - nécessite `SUPABASE_ACCESS_TOKEN` (jeton d'accès perso) ;
 *   - projet ciblé via `SUPABASE_PROJECT_ID` (défaut : le projet nivy).
 *   - SANS token → skip non-bloquant (le job reste vert tant que le secret CI
 *     n'est pas configuré ; il enforce dès qu'il l'est).
 *
 * NB formatage : le générateur canonique est la CLI (`npm run types:generate`).
 * Régénérer une fois via la CLI et committer pour stabiliser la comparaison.
 */
import { execSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"

const PROJECT_ID = process.env.SUPABASE_PROJECT_ID || "imchornjvmgmaovhypco"
const COMMITTED = "types/supabase.ts"

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.log(
    "⏭️  check-types-fresh: SUPABASE_ACCESS_TOKEN absent → skip (garde inactive tant que le secret n'est pas configuré).",
  )
  process.exit(0)
}

const norm = (s) => s.replace(/\r\n/g, "\n").replace(/\s+$/gm, "").trim()

let fresh
try {
  fresh = execSync(
    `npx --yes supabase gen types typescript --project-id ${PROJECT_ID} --schema public`,
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 64 * 1024 * 1024 },
  )
} catch (err) {
  console.error("❌ check-types-fresh: échec de la génération depuis la base live.")
  console.error(String(err?.message || err))
  process.exit(2)
}

let committed
try {
  committed = readFileSync(COMMITTED, "utf8")
} catch {
  console.error(`❌ ${COMMITTED} introuvable.`)
  process.exit(2)
}

if (norm(fresh) !== norm(committed)) {
  writeFileSync("types/supabase.fresh.ts", fresh)
  console.error(
    [
      "",
      `❌ ${COMMITTED} est PÉRIMÉ par rapport à la base live.`,
      "   Une migration a changé le schéma sans régénérer le typage — c'est",
      "   exactement le drift de #360 (le code compile contre un typage faux).",
      "",
      "   Correctif :",
      "     npm run types:generate   # régénère depuis la base live",
      "     git add types/supabase.ts && git commit",
      "",
      "   (diff live écrit dans types/supabase.fresh.ts pour inspection)",
      "",
    ].join("\n"),
  )
  process.exit(1)
}

console.log("✓ types/supabase.ts est à jour vs la base live.")
