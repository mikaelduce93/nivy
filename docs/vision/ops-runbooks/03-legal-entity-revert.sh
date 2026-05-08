#!/usr/bin/env bash
# =============================================================================
# Runbook 03 — Revert Nivy SARL → Teens Party Morocco SARL (idempotent)
# =============================================================================
#
# CONTEXTE
#   Wave δ G1 (commit 968cd3a) a remplacé "Teens Party Morocco SARL" par
#   "Nivy SARL" dans les pages légales. Si l'extrait RC montre que l'entité
#   légale enregistrée s'appelle TOUJOURS "Teens Party Morocco SARL", il faut
#   reverter UNIQUEMENT la dénomination sociale (legal entity), tout en
#   conservant "Nivy" comme marque consommateur.
#
# USAGE
#   ./03-legal-entity-revert.sh --dry-run    # affiche le diff sans rien écrire
#   ./03-legal-entity-revert.sh --apply      # applique les modifications
#   ./03-legal-entity-revert.sh --rollback   # restaure depuis backup branch
#
# IDEMPOTENCE
#   Le script vérifie chaque substitution avant de l'appliquer ; relancer
#   plusieurs fois est sans effet supplémentaire (no-op).
#
# REVERSIBILITY
#   Avant toute modification, le script crée une branche git
#   `legal-entity-revert-backup-<timestamp>` afin que le rollback soit trivial.
#
# CONTRAT
#   - Le script NE TOUCHE PAS aux mentions de la marque consommateur "Nivy"
#     (logos, copywriting, slogans). Seule la raison sociale "Nivy SARL" est
#     remplacée par "Teens Party Morocco SARL".
#   - Le script CRÉE `app/legal/_brand-source.ts` pour codifier la séparation
#     entre LEGAL_ENTITY_NAME et CONSUMER_BRAND_NAME.
# =============================================================================

set -euo pipefail

# ----------------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------------

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
LEGAL_DIR="${REPO_ROOT}/app/legal"
BRAND_SOURCE_FILE="${LEGAL_DIR}/_brand-source.ts"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_BRANCH="legal-entity-revert-backup-${TIMESTAMP}"

# Couples (old → new). On reverte SARL Nivy → Teens Party Morocco SARL.
# Attention : l'ordre compte. On cible des chaînes longues d'abord pour éviter
# les substitutions partielles.
OLD_LEGAL="Nivy SARL"
NEW_LEGAL="Teens Party Morocco SARL"

# Fichiers concernés (vérifiés par Ops-C lors de l'audit).
TARGET_FILES=(
  "${LEGAL_DIR}/mentions-legales/page.tsx"
  "${LEGAL_DIR}/confidentialite/page.tsx"
  "${LEGAL_DIR}/cgv/page.tsx"
  "${LEGAL_DIR}/cgu/page.tsx"
)

# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------

color_red()   { printf "\033[0;31m%s\033[0m" "$1"; }
color_green() { printf "\033[0;32m%s\033[0m" "$1"; }
color_yellow(){ printf "\033[0;33m%s\033[0m" "$1"; }
color_cyan()  { printf "\033[0;36m%s\033[0m" "$1"; }

log()   { printf "[%s] %s\n" "$(date +%H:%M:%S)" "$*"; }
warn()  { printf "[%s] %s %s\n" "$(date +%H:%M:%S)" "$(color_yellow '[WARN]')" "$*"; }
err()   { printf "[%s] %s %s\n" "$(date +%H:%M:%S)" "$(color_red '[ERR]')" "$*" >&2; }
ok()    { printf "[%s] %s %s\n" "$(date +%H:%M:%S)" "$(color_green '[OK]')" "$*"; }

usage() {
  cat <<EOF
Usage: $0 [--dry-run|--apply|--rollback]

  --dry-run   Affiche le diff sans modifier les fichiers (DEFAULT).
  --apply     Crée une branche backup, applique les substitutions, génère
              app/legal/_brand-source.ts, puis affiche un résumé.
  --rollback  Restaure les fichiers depuis la branche backup la plus récente.
EOF
  exit 1
}

# Compte les occurrences de la chaîne "Nivy SARL" dans un fichier.
count_occurrences() {
  local file="$1"
  local pattern="$2"
  if [[ ! -f "$file" ]]; then echo 0; return; fi
  grep -cF "$pattern" "$file" 2>/dev/null || echo 0
}

# ----------------------------------------------------------------------------
# Étape 1 — Dry run / preview
# ----------------------------------------------------------------------------

run_dry() {
  log "$(color_cyan 'MODE: --dry-run') (aucune écriture)"
  log "Recherche de '${OLD_LEGAL}' dans les pages légales..."
  echo

  local total_hits=0
  for f in "${TARGET_FILES[@]}"; do
    local rel="${f#${REPO_ROOT}/}"
    if [[ ! -f "$f" ]]; then
      warn "Fichier absent : ${rel} (skip)"
      continue
    fi
    local n=$(count_occurrences "$f" "$OLD_LEGAL")
    if [[ "$n" -eq 0 ]]; then
      log "  ${rel}: $(color_green '0 occurrences') (déjà propre ou jamais modifié)"
    else
      log "  ${rel}: $(color_yellow "$n occurrences à reverter")"
      grep -nF "$OLD_LEGAL" "$f" | sed 's/^/      | /'
    fi
    total_hits=$((total_hits + n))
  done

  echo
  log "Total : $(color_yellow "$total_hits") substitution(s) seraient appliquées."
  if [[ "$total_hits" -eq 0 ]]; then
    ok "Aucune action requise — les pages sont déjà alignées sur l'entité légale historique (ou jamais modifiées)."
  fi

  echo
  log "Brand source file : ${BRAND_SOURCE_FILE#${REPO_ROOT}/}"
  if [[ -f "$BRAND_SOURCE_FILE" ]]; then
    ok "  → existe déjà (no-op)"
  else
    log "  → serait créé (n'existe pas encore)"
  fi
}

# ----------------------------------------------------------------------------
# Étape 2 — Apply
# ----------------------------------------------------------------------------

run_apply() {
  log "$(color_cyan 'MODE: --apply')"

  # Garde-fou : working tree doit être propre OU fondateur a stash.
  if ! git -C "$REPO_ROOT" diff --quiet --ignore-submodules HEAD; then
    warn "Working tree non propre. Veuillez commit ou stash avant d'appliquer."
    warn "  git stash push -m 'pre-legal-revert'  puis relancer le script."
    exit 2
  fi

  # Crée branche backup pour rollback trivial.
  log "Création branche backup : ${BACKUP_BRANCH}"
  git -C "$REPO_ROOT" branch "$BACKUP_BRANCH" HEAD
  ok "Branche backup créée. Rollback : git checkout ${BACKUP_BRANCH} -- app/legal"

  local total_hits=0
  for f in "${TARGET_FILES[@]}"; do
    local rel="${f#${REPO_ROOT}/}"
    if [[ ! -f "$f" ]]; then
      warn "Fichier absent : ${rel} (skip)"
      continue
    fi
    local n=$(count_occurrences "$f" "$OLD_LEGAL")
    if [[ "$n" -eq 0 ]]; then
      log "  ${rel}: déjà propre (skip)"
      continue
    fi
    # Substitution idempotente avec perl (gère mieux les caractères spéciaux que sed -i sur macOS/Linux).
    perl -i -pe "s/\\Q${OLD_LEGAL}\\E/${NEW_LEGAL}/g" "$f"
    ok "  ${rel}: ${n} substitution(s) appliquée(s)"
    total_hits=$((total_hits + n))
  done

  # Génère le brand-source TS si absent.
  if [[ ! -f "$BRAND_SOURCE_FILE" ]]; then
    write_brand_source
    ok "Créé : ${BRAND_SOURCE_FILE#${REPO_ROOT}/}"
  else
    log "Brand source file existe déjà → no-op"
  fi

  echo
  log "Résumé : $(color_green "$total_hits") substitution(s), branche backup '$(color_cyan "$BACKUP_BRANCH")'."
  log "Diff final :"
  git -C "$REPO_ROOT" --no-pager diff --stat -- app/legal | sed 's/^/      | /'

  echo
  ok "Terminé. Étapes suivantes :"
  log "  1. Vérifier visuellement : pnpm dev → /legal/mentions-legales"
  log "  2. Compléter les valeurs RC/ICE/siège dans ${BRAND_SOURCE_FILE#${REPO_ROOT}/}"
  log "  3. Importer LEGAL_ENTITY_NAME depuis ce fichier au lieu de hardcoder"
  log "  4. Commit : git commit -am '[Ops-C] revert legal entity name to registered SARL'"
}

# ----------------------------------------------------------------------------
# Étape 3 — Rollback
# ----------------------------------------------------------------------------

run_rollback() {
  log "$(color_cyan 'MODE: --rollback')"
  local last_backup
  last_backup="$(git -C "$REPO_ROOT" branch --list 'legal-entity-revert-backup-*' | sed 's/^[ *]*//' | sort -r | head -n1)"
  if [[ -z "$last_backup" ]]; then
    err "Aucune branche backup trouvée (motif: legal-entity-revert-backup-*)."
    exit 3
  fi
  log "Branche backup détectée : ${last_backup}"
  git -C "$REPO_ROOT" checkout "$last_backup" -- app/legal
  ok "Restauré app/legal/* depuis ${last_backup}."
  log "Vérifier puis commit : git diff app/legal && git commit -am 'rollback legal entity revert'"
}

# ----------------------------------------------------------------------------
# Étape 4 — Brand source TS (séparation marque / entité)
# ----------------------------------------------------------------------------

write_brand_source() {
  cat > "$BRAND_SOURCE_FILE" <<'TS_EOF'
/**
 * Source de vérité pour la séparation entre l'entité légale enregistrée
 * (au RC + OMPIC) et la marque consommateur affichée publiquement.
 *
 * IMPORTANT : ne JAMAIS hardcoder ces valeurs dans les pages légales.
 * Toujours importer les constantes ci-dessous afin que la divergence
 * entre marque commerciale et raison sociale soit structurellement
 * impossible.
 *
 * Cf. docs/vision/ops-runbooks/02-legal-entity-check.md pour la procédure
 * de vérification et les sources des champs ci-dessous.
 */

// === ENTITÉ LÉGALE (telle qu'inscrite au Registre du Commerce) ===
export const LEGAL_ENTITY_NAME = "Teens Party Morocco SARL"
export const LEGAL_ENTITY_FORM = "Société à Responsabilité Limitée"
export const LEGAL_RC_NUMBER = "[À compléter depuis extrait RC]"
export const LEGAL_ICE_NUMBER = "[À compléter depuis attestation ICE]"
export const LEGAL_CAPITAL_MAD = "[À compléter depuis statuts]"
export const LEGAL_HEADQUARTERS = "[À compléter depuis extrait RC]"
export const LEGAL_DIRECTOR_NAME = "[À compléter depuis extrait RC]"

// === MARQUE CONSOMMATEUR (commerciale, exposée publiquement) ===
export const CONSUMER_BRAND_NAME = "Nivy"
export const CONSUMER_BRAND_TLD = "nivy.ma"

// === Helpers ===

/**
 * Phrase de mention légale combinée à afficher en footer ou sur les pages
 * /legal/* lorsque la marque diffère de l'entité légale.
 */
export function legalAttribution(): string {
  if (LEGAL_ENTITY_NAME.toLowerCase().includes(CONSUMER_BRAND_NAME.toLowerCase())) {
    return LEGAL_ENTITY_NAME
  }
  return `${CONSUMER_BRAND_NAME} est une marque exploitée par ${LEGAL_ENTITY_NAME}`
}
TS_EOF
}

# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------

MODE="${1:-}"
case "$MODE" in
  --dry-run|"") run_dry ;;
  --apply)      run_apply ;;
  --rollback)   run_rollback ;;
  -h|--help)    usage ;;
  *)            err "Mode inconnu : ${MODE}"; usage ;;
esac
