# Cahier des Charges UI/UX Complet - Teens Party Morocco

Ce document est la source de référence UI/UX. Il synthétise le concept, la couverture réelle des écrans, les manques, les états obligatoires, les règles de cohérence, et les critères d'acceptation.

## 1. Sources de vérité
- Roadmap et backlog: `ROADMAP_PRINCIPALE.md`, `TODO_FRONTEND.md`, `TODO_P0_CRITIQUE.md`, `TODO_P2_AMELIORATION.md`.
- Audit: `docs/AUDIT_COMPLET_TACHES_RESTANTES.md`.
- Systèmes clés: `docs/AMBASSADOR_SHOP_SYSTEM.md`, `docs/GAMIFICATION_V2_EVOLUTION.md`, `docs/CONTENT_GENERATION_SYSTEM.md`, `docs/DESIGN-SYSTEM.md`.
- Inventaire réel des pages: `app/**/page.tsx`.

## 2. Légende des statuts
- **Existant**: page présente, flux de base fonctionnel.
- **Partiel**: page présente mais manques fonctionnels critiques (P0/P1/P2).
- **Manquant**: page absente alors que le concept la requiert.

## 3. Inventaire d'écrans par rôle

### 3.1 Public & Acquisition
| Ecran | Route(s) | Statut | Notes |
|---|---|---|---|
| Home | `/` | Existant | Hero, conversion |
| Events liste | `/evenements` | Existant | |
| Event detail | `/evenements/[id]` | Partiel | Prix Pass + hybride manquants (P0) |
| Agenda liste/detail | `/agenda`, `/agenda/[id]` | Existant | |
| Clubs liste | `/clubs` | Existant | |
| Club detail | `/clubs/[slug]` | Partiel | Prix Pass + hybride manquants (P0) |
| Anniversaires | `/anniversaires` | Partiel | Connexion API, packs, paiement (P0) |
| VIP pass hub | `/carte-vip` | Partiel | Souscription incomplète |
| VIP souscription | `/carte-vip/souscrire` | Partiel | Stripe + QR + comparatif (P0) |
| VIP confirmation | `/carte-vip/confirmation` | Partiel | Confirmation Stripe |
| VIP rewards | `/carte-vip/recompenses` | Existant | |
| Reservation flow | `/reservation`, `/reservation/paiement`, `/reservation/confirmation` | Partiel | Paiement hybride complet (P0/P2) |
| Mes reservations | `/mes-reservations`, `/mes-reservations/[id]` | Existant | |
| DJs | `/djs`, `/djs/[id]` | Existant | |
| Influenceurs | `/influenceurs`, `/devenir-influenceur`, `/devenir-influenceur/candidature` | Partiel | Pipeline candidature complet manquant |
| Ambassadeurs public | `/ambassadeurs`, `/ambassadeurs/programme`, `/ambassadeurs/candidature` | Partiel | Pipeline complet manquant |
| Ambassadeur program | `/devenir-ambassadeur`, `/devenir-ambassadeur/programme`, `/devenir-ambassadeur/candidature` | Partiel | Pipeline complet manquant |
| Partenaires public | `/partenaires`, `/devenir-partenaire`, `/devenir-partenaire/inscription`, `/partenaires/inscription`, `/partenaires/merci` | Partiel | KYC/validation manquants |
| Contenu | `/blog`, `/galerie`, `/temoignages`, `/communaute` | Existant | |
| Aide/FAQ | `/aide`, `/aide/faq`, `/faq`, `/support` | Existant | |
| A propos | `/a-propos` | Existant | |
| Securite | `/securite` | Existant | |
| Legal | `/legal/cgu`, `/legal/confidentialite`, `/legal/mentions-legales` | Partiel | `cgv`, cookies manquants |
| Auth | `/auth/*` | Existant | |
| Mon compte | `/mon-compte` | Existant | |
| Profile | `/profile/*` | Existant | |
| Autorisations | `/autorisations/*`, `/authorisations/nouvelle` | Partiel | Routes dupliquees |

### 3.2 Teen (Core Experience)
| Ecran | Route(s) | Statut | Notes |
|---|---|---|---|
| Dashboard | `/teen` | Existant | |
| Events teen | `/teen/events` | Existant | |
| Challenges | `/teen/challenges` | Existant | |
| Achievements | `/teen/achievements` | Existant | |
| Leaderboard | `/teen/leaderboard` | Existant | |
| Shop teen | `/teen/shop`, `/teen/shop/checkout`, `/teen/shop/history` | Partiel | Paiement hybride global |
| XP/Coins | `/teen/coins`, `/teen/xp-value` | Existant | |
| Rewards | `/teen/rewards` | Existant | |
| Streak | `/teen/streak` | Existant | |
| Calendar | `/teen/calendar` | Existant | |
| Games | `/teen/games` | Existant | |
| Social - Friends | `/teen/friends` | Partiel | Features P2 incompletes |
| Social - Circles | `/teen/circles` | Partiel | Realtime/moderation P2 |
| Social - Messages | `/teen/messages` | Existant | |
| Social - Share | `/teen/share` | Existant | |
| Profile | `/teen/profile`, `/teen/profile/edit` | Existant | |
| Aide scolaire | `/teen/aide-scolaire` | Manquant | Prevu P2 |
| Defis physiques | `/teen/defis-physiques` | Manquant | Prevu P2 + preuves video |
| Parcours passion | `/teen/parcours` | Manquant | Prevu P2 |
| Activity feed | `/teen/activity` | Manquant | Social feed complet P2 |
| Map / Radar | `/teen/map` | Manquant | Carte sociale attendue |

### 3.3 Parent (Control & Safety)
| Ecran | Route(s) | Statut | Notes |
|---|---|---|---|
| Dashboard parent | `/parent` | Existant | |
| Teens list/add | `/parent/teens`, `/parent/teens/add` | Partiel | Formulaire enrichi P0 |
| Approvals | `/parent/approvals` | Existant | |
| Live tracking | `/parent/live` | Partiel | Statut temps reel, galerie, timeline |
| Grades | `/parent/grades` | Partiel | Validation notes par enfant manquante |
| Budget | `/parent/budget` | Partiel | Limites, alertes, graphiques |
| History | `/parent/history` | Partiel | Export PDF manquant |
| Topup | `/parent/topup` | Existant | |
| Events | `/parent/events` | Existant | |
| Documents | `/parent/documents` | Manquant | Consentements, e-signature |
| Notifications | `/parent/notifications` | Manquant | Centre de notifications |

### 3.4 Ambassador (Growth Engine)
| Ecran | Route(s) | Statut | Notes |
|---|---|---|---|
| Dashboard | `/ambassador` | Partiel | Tracking conversions manquant |
| Commissions | `/ambassador/commissions` | Partiel | Calcul auto + statut |
| Referrals | `/ambassador/referrals` | Partiel | Attribution/cookies |
| Marketing kit | `/ambassador/marketing` | Partiel | Assets et scripts |
| Boutique rewards | `/ambassador/boutique` | Partiel | Workflow complet + tracking |
| Withdrawals | `/ambassador/withdrawals` | Partiel | Paiements Mobile Money |

### 3.5 Partner (B2B Operations)
| Ecran | Route(s) | Statut | Notes |
|---|---|---|---|
| Dashboard | `/partner/dashboard` | Existant | |
| Offers list/new/edit | `/partner/offers`, `/partner/offers/new`, `/partner/offers/[id]/edit` | Partiel | Validation admin, analytics |
| Events | `/partner/events` | Existant | |
| Transactions | `/partner/transactions` | Partiel | Rapprochement/payout |
| Stats | `/partner/stats` | Existant | |
| Scanner | `/partner/scanner` | Existant | |
| Support | `/partner/support` | Existant | |
| Settings | `/partner/settings` | Existant | |
| KYC/Onboarding | `/partner/kyc` | Manquant | Verification legale |
| Payouts/Factures | `/partner/payouts`, `/partner/invoices` | Manquant | Backoffice finance |

### 3.6 Admin (Control Tower)
| Ecran | Route(s) | Statut | Notes |
|---|---|---|---|
| Dashboard | `/admin` | Existant | |
| Events CRUD | `/admin/evenements/*` | Existant | |
| Clubs CRUD | `/admin/clubs/*` | Existant | |
| Reservations | `/admin/reservations` | Existant | |
| Ambassadeurs | `/admin/ambassadeurs` | Partiel | Moderation avancée |
| Analytics | `/admin/analytics` | Existant | |
| Check-in | `/admin/check-in` | Existant | |
| Anniversaires | `/admin/anniversaires`, `/admin/anniversaires/[id]` | Partiel | CRUD complet P0 |
| Utilisateurs | `/admin/utilisateurs` | Existant | |
| Permissions | `/admin/permissions` | Existant | |
| Logs | `/admin/logs` | Existant | |
| Scripts SQL | `/admin/scripts-sql` | Existant | |
| Gamification setup | `/admin/gamification-setup` | Existant | |
| Proofs moderation | `/admin/proofs` | Manquant | Validation videos |
| Content moderation | `/admin/content` | Manquant | IA content validation |
| Partner admin | `/admin/partners` | Manquant | KYC, approvals |

### 3.7 Gamification Hub (Transversal)
| Ecran | Route(s) | Statut | Notes |
|---|---|---|---|
| Hub | `/gamification` | Existant | |
| Missions | `/gamification/missions` | Existant | |
| Roue | `/gamification/roue` | Existant | |
| Defis | `/gamification/defis` | Existant | |
| Boutique XP | `/gamification/boutique` | Partiel | Prix DH + hybride |
| Crews | `/gamification/crews` | Existant | |
| Leaderboard | `/gamification/leaderboard` | Existant | |
| Collections | `/gamification/collections` | Existant | |
| Aide scolaire | `/gamification/aide-scolaire` | Manquant | P2 |
| Defis physiques | `/gamification/defis-physiques` | Manquant | P2 |
| Parcours | `/gamification/parcours` | Manquant | P2 |

## 4. Flux critiques (de bout en bout)

### 4.1 Reservation event
1. Event detail (`/evenements/[id]`) -> prix DH + XP
2. Reservation (`/reservation`) -> choix billets
3. Paiement hybride (`/reservation/paiement`) -> XP + DH
4. Confirmation (`/reservation/confirmation`) -> QR
5. Check-in (`/admin/check-in` ou partner scanner)
6. XP reward -> feed social (`/teen` / `/teen/activity`)

### 4.2 Defi physique avec preuve
1. Liste defis (`/teen/defis-physiques`) -> detail
2. Upload preuve video (challenge proof uploader)
3. Statut en attente -> notification
4. Moderation admin (`/admin/proofs`)
5. Validation -> XP + badge -> feed social

### 4.3 Ambassadeur conversion
1. Page programme -> candidature
2. Attribution lien (cookie/localStorage)
3. Conversion booking -> enregistrement conversion
4. Commission calcul -> dashboard
5. Withdrawal -> payout -> statut

### 4.4 Parent safety
1. Parent ajoute enfant -> consentements
2. Reservation event + e-signature
3. Check-in -> parent live tracking
4. Check-out -> notification parent

### 4.5 Partner offer -> achat teen
1. Partner cree offre -> validation admin
2. Offre visible shop teen
3. Achat XP/hybride
4. Validation sur place (scanner)
5. Rapprochement transaction -> payout

## 5. Etats UI obligatoires (matrice)

| Ecran critique | Empty | Loading | Error | Success | Blocked | Offline |
|---|---|---|---|---|---|---|
| Event detail | Pas d’events | Skeleton | Event indisponible | Reservation OK | Pass requis | Cache event |
| Paiement hybride | Solde XP 0 | Calculing | Paiement refuse | Paiement confirme | Approval parent | Mode offline |
| Check-in | Aucun scan | Camera loading | QR invalide | Check-in OK | Deja check-in | Offline queue |
| Defi preuve | Pas de preuve | Uploading | Upload echoue | Preuve envoyee | En attente validation | Offline upload |
| Ambassador payout | Aucun gain | Loading | Payout refuse | Payout soumis | KYC manquant | N/A |
| Partner offer | Aucune offre | Loading | Save error | Offre publiee | En attente approbation | Offline draft |
| Parent live | Aucun enfant | Loading | Statut indisponible | Check-in confirme | Consent manquant | Offline fallback |
| Circles chat | Pas de messages | Sync | Realtime down | Message envoye | Modere | Offline draft |

## 6. Regles de coherence UX/UI

1. **Routes**: unifier doublons (`ambassador/` vs `ambassadeurs/`, `authorisations/` vs `autorisations/`). Un seul canonical.
2. **Navigation role-based**: menu principal adapte (Teen/Parent/Partner/Admin) avec entree unique (`/espace` ou `/dashboard`).
3. **Design system**: tokens `primary/secondary/accent`, typographie, spacing, focus visible obligatoire.
4. **Hybrid payment**: afficher prix en DH et XP partout (events, clubs, shop, anniversaires).
5. **Gamification bridge**: relier `/teen` et `/gamification/*` par actions rapides et progression.
6. **Microcopy coherent**: langage ado pour teen, rassurant pour parent, pro pour partner/admin.

## 7. Mapping priorites (P0/P1/P2)
- **P0**: anniversaires connecte, VIP pass, prix pass event/club, formulaire enfant enrichi, admin anniversaires.
- **P1**: parent live, grades validation, budget limits, export PDF.
- **P2**: piliers ecole/sport/crea, aide scolaire, defis physiques, parcours passion, circles/friends complets.
- **Hors TODO**: moderation content IA, proofs admin, i18n/RTL, PWA, KYC partenaires.

## 8. Criteres d’acceptation UX

### 8.1 KPI par role
- **Teen**: retention J7 > 35%, completion mission > 40%, taux partage > 10%.
- **Parent**: taux approbation < 2 min, taux satisfaction > 80%.
- **Ambassador**: conversion > 10%, payout sans erreur > 95%.
- **Partner**: validation offres < 24h, scan < 30s.
- **Admin**: temps moderation preuves < 2 min, erreurs < 1%.

### 8.2 Qualite & accessibilite
- Lighthouse > 90 sur pages critiques
- WCAG AA minimum
- Temps de chargement < 3s sur mobile
- Zero dead links

---

# English Summary (Condensed)

This document is the single UI/UX specification. It maps all screens by role, marks them as Existing/Partial/Missing, defines end‑to‑end flows, mandatory UI states, coherence rules, and acceptance criteria. It is grounded in project docs and the actual route inventory under `app/`.


