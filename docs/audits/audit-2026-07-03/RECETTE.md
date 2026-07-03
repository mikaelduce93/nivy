# Recette finale — audit 2026-07-03 (Wave P0)

Branche `refonte/home-nav-lifestyle`. Base `a5662f4` → HEAD `d2ceeb0`.
Pipeline : Audit (8 zones) → Synthèse (croisée aux 28 issues V12-V16) → Génération équipe P0 → Exécution → Vérification indépendante.

## Tableau attestation (Wave P0)

| Agent | Verifier statut | Fichiers modifiés | Build/tsc | Notes |
|-------|-----------------|-------------------|-----------|-------|
| v12-page-transition-fixer (#317) | **PASS** | components/providers/page-transition-provider.tsx | tsc 0 / build 0 | Opt-out `/auth/redirect` du swap AnimatePresence ; hooks provider inchangés ; système préservé partout ailleurs |
| v12-admin-ringfence (#320) | **PASS** | proxy.ts + 2×loading.tsx | tsc 0 | Garde middleware 404 sur `/admin/scripts-sql` & `/admin/permissions` si `role!=="super_admin"` ; garde page-level intacte |
| v12-parent-dashboard-polish (#318 #319) | **PASS** (PARTIAL initial levé) | app/parent/events, app/parent/live, components/parent/*, components/dashboard/parent/sidebar.tsx, scripts/seed-beta-pivots.ts | tsc 0 | alt sur avatars teens ; badge tier VIP lu depuis pivot d'abonnement réel ; seed désormais committé (levée du PARTIAL) |
| toast-system-unifier | **PASS** | components/ticket-actions.tsx | tsc 0 | Migration useToast(shadcn non monté) → sonner ; toasts de confirmation paiement redeviennent visibles |
| vip-rewards-activator | **PASS** | app/carte-vip/recompenses/page.tsx | tsc 0 / build 0 | Retrait honnête des CTA `disabled` morts (aucun RPC redeem n'existe) + bannière « bientôt » + indicateurs d'affordabilité non-interactifs |
| reservation-drift-fixer | **PASS** | app/api/payments/mobile-money/initiate, app/api/tickets/generate-pdf, app/parent/approvals/page.tsx | tsc 0 / build 0 | Drift `bookings.parent_id`→`user_id`, `teens.full_name`→`first/last_name`, table fantôme `children`→`teens` supprimée ; PDF billet + mobile-money + approvals réparés ; mapping `event_booking` |

**Bilan : 6 / 6 agents PASS.** Build de synthèse autoritaire (orchestrateur, `.next` propre, run unique) : **tsc EXIT 0 / build EXIT 0** avec les 6 fixes combinés.

## Ce qui PASSE maintenant (débloqué par la Wave P0)
- **Connexion** : `/auth/redirect` ne crashe plus (« Rendered more hooks ») — bloqueur beta #317 levé.
- **Sécurité admin** : `/admin/scripts-sql` & `/admin/permissions` renvoient un 404 réel aux non-super-admins (fin du 200 trompeur via loading.tsx) — #320.
- **Dashboard parent** : plus d'erreurs console next/image (alt) ; badge d'abonnement affiche le vrai tier au lieu de « Free » — #318/#319.
- **Confirmation de paiement** : les toasts succès/erreur de `ticket-actions` s'affichent enfin (montés via sonner).
- **Réservation bout-en-bout** : PDF billet (n'était plus 404), initiation mobile-money et affichage des approbations parentales réparés — drift de schéma éliminé sur ces 3 chemins.
- **Carte VIP récompenses** : plus de faux boutons `disabled` — page honnête (informationnelle) au lieu de théâtre cliquable.

## Ce qui RESTE (par priorité) — waves suivantes

### P0 restants (effort M, non traités dans cette wave — recommandé Wave P0.5)
- **[N2] Typer les 3 clients Supabase avec `<Database>`** (`lib/supabase/{server,client,service-role}.ts`). C'est la **cause racine** de toute la classe de bugs drift (parent_id, full_name, children, user_points non typés). Sans ça, chaque futur drift reste invisible à `tsc` malgré `strict:true`. `types/supabase.ts` (12,7k lignes) existe et est quasi inutilisé. **Action à prioriser en tête de Wave P1/V13.**
- **[N4] QR VIP partenaire cassé bout-en-bout** : `app/api/teen/vip-qr/route.ts` (payload `nivy:v1:`) n'a aucun appelant UI et le scanner `app/api/partner/verify-card/route.ts:68` rejette ce format ; l'« apply » passe par le chemin non-atomique `apply-discount` au lieu de l'RPC `apply_partner_offer`. → 1re vente partenaire impossible. Recoupe #328.
- **[N6] Webhook Stripe `⚠️ INACTIF`** (`app/api/webhooks/stripe/dispatcher.ts` commenté) : un paiement Stripe test ne confirme jamais la réservation. Recoupe #342.

### P1 (V13 sécurité/drift + nouvelles)
- Issues **#322 #323 #324 #325** (drift-lint, export check-in `parent_id`, circles moderation, parent_teen_links).
- **[N7]** Deux moteurs missions/défis parallèles (`user_challenges` vs `user_missions`) alimentant `/teen/quests` sans réconciliation.
- **[N8]** Maillage cassé : `/parents` & `/temoignages` orphelins (0 lien entrant, absents du sitemap) ; image 404 `app/page.tsx:205`.
- **[N9]** Wizard onboarding pré-compte parent = cul-de-sac (`components/onboarding/parent-setup-step.tsx:59-77` bypasse `onNext`) ; `sync_onboarding_to_user` sans appelant.
- **[N10]** Docs de référence périmées (`docs/economy.md`, `docs/GAMIFICATION_V2_EVOLUTION.md`, `docs/ARCHITECTURE.md`).

### P2 (V14-V16 + dette)
- E2E : #327 #328 #330 (smoke runbook, scanner, moderation) ; #339-#343 (secrets, Web Vitals, a11y, E2E CI, Sentry).
- Features gated (arbitrages PO) : #332-#337 (sport_clubs, driver, coach/teacher, support, top-up DH, pathways).
- **[N11]** ~1300+ lignes de quiz mort en double + `reservation-form.tsx` + `home-events-section.tsx` + `elite-ai-companion.tsx` (dette de suppression).
- **[N12]** Pas d'endpoint cancel/refund réservation ; `/mes-reservations` lien mort ; moderation admin en boutons `disabled`.
- **[N13]** Métadonnées SEO `/a-propos` & `/temoignages` ; `manifest.ts` theme_color cyan hors charte.

## Commits créés (5, sur refonte/home-nav-lifestyle)
- `ac957da` [V12 #317 #320] fix /auth/redirect hooks crash + HTTP ring-fence admin
- `6ee820d` [V12 #318 #319] parent dashboard: alt avatars + VIP tier badge réel (seed committé)
- `a02144d` [audit-07-03 P0] toast→sonner + VIP rewards honest-removal
- `e8e81e5` [audit-07-03 P0] reservation: fix schema drift (parent_id/full_name/children)
- `d2ceeb0` [audit-07-03] audit reports 8 zones + SYNTHESE + team-agent specs

## Build & tests
- `npx tsc --noEmit` : ✅ EXIT 0 (6 fixes combinés, run autoritaire orchestrateur)
- `npm run build` : ✅ EXIT 0 (`.next` propre, arbre de routes complet émis)
- `npm run test:run` / `test:e2e` : non exécutés dans cette wave (P0 = hotfixes ciblés ; tests E2E ciblés relèvent de V14 #327/#328 et V16 #342). Recommandé en Wave suivante.

## Issues GitHub à fermer/mettre à jour après merge de cette wave
- **#317, #320** → prêts à fermer (fix + vérif indépendante).
- **#318, #319** → prêts à fermer (attention : le seed `scripts/seed-beta-pivots.ts` doit être **exécuté contre la DB beta** pour que l'effet #318 soit visible en prod — le code de lecture du tier est corrigé, la donnée doit être seedée).
- **#323** → partiellement anticipé (les 2 autres sites de drift `parent_id` réservation sont réglés ; l'export check-in reste dans le scope #323).

## Prochaines actions recommandées (ordre)
1. **Exécuter le seed** `scripts/seed-beta-pivots.ts` contre la DB beta (rend #318 visible).
2. **Wave P0.5** : typer les clients Supabase (#N2) — supprime la classe entière de bugs drift à la source, puis réparer QR VIP partenaire (#N4) et réactiver/tester Stripe (#N6/#342).
3. **Wave P1 = V13** : exécuter #322-#325 (désormais attrapables par tsc une fois les clients typés) + maillage (#N8) + wizard parent (#N9) + docs (#N10).
4. Fermer les 14 issues V10 (#277-289) après confirmation que le travail committé les couvre (cf. `_github-issues-map.md`).
