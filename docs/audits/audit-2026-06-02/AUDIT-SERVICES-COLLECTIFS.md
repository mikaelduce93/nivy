# Audit — Couche collectif/organisateur sur les services Nivy (2026-06-02)

> Audit multi-agents (7 domaines : events, food, transport, anniv+mentors, clubs, briques de
> groupe, paiement+split) sous la lentille : **l'ado crée/organise · actions de groupe · split
> "chacun paie sa part" · déblocage d'avantages par taille de groupe.** Lecture seule.

## 1. Synthèse exécutive

Aujourd'hui, **le collectif n'existe quasiment pas au niveau métier** : tous les services (events,
food, transport, anniversaires, mentors, stages, clubs) sont mono-utilisateur / mono-payeur. Un ado
réserve seul, paie seul ; le parent ne peut qu'opposer son veto après coup (modèle opt-out via
`parental_approvals`). Il existe en revanche **des briques de groupe éparses mais non câblées aux
services** : `crews`/`circles` (gamification : XP, chat, classement), `friend_connections` (1:1), et
un seul cas « groupe + service » à moitié posé — `ride_groups`/`ride_group_members` (leader + sièges)
— mais **sans RPC de finalisation ni de split**. Les enums `payment_method='split'` (food) et
`split_with_parent` (rides) existent mais sont des **stubs** : `place_food_order` débite
`spend_teen_coins` une seule fois sur un seul `teen_id`.

**LA brique manquante centrale est transverse** : pas de primitive **« group action »**
(organisateur + membres + statut + invitations + RSVP) ni de **RPC de split-payment mutualisé**
(débiter N ados atomiquement, chacun sur son wallet). Les fondations financières sont mûres et
appairées (`escrow_ledger`, `spend_teen_coins` idempotent, `coin_transactions`) mais **enfermées en
silos**. L'opportunité : poser **2 primitives génériques** réutilisées par 5+ services, plutôt que
recoder le collectif domaine par domaine.

## 2. Les 3 capacités transverses à construire

### a) Primitive de groupe (« group action »)
- **Existe** : `crews`/`circles` (rôles, statut, `max_members`, invitations 7 j) mais **permanents**
  (gamification/chat) ; `ride_groups`/`ride_group_members` (seul vrai « groupe ↔ service », leader +
  seats, status='forming', sans finalisation) ; `friend_connections` (base des invitations).
- **Gap** : pas de `group_actions` (organizer_id, action_type, resource_id polymorphe, status
  draft/forming/confirmed/completed, deadline, max_size) ni `group_action_invites` (status
  pending/accepted/declined, expires_at) ni d'`organizer` **temporel** (par action ≠ owner de crew).
- **Reco** : **créer `group_actions` + `group_action_invites` génériques**, NE PAS surcharger
  crews/circles. Réutiliser `circle_members` comme roster de candidats et `ride_group_members` comme
  patron d'inscription (avec `parent_approval_id` par membre). Tout ado peut organiser (pas besoin
  d'être owner).

### b) Split payment multi-payeur (« chacun paie sa part »)
- **Existe (fondation solide)** : `spend_teen_coins` (débit atomique `FOR UPDATE`, spendable-aware,
  **idempotent**, appaire escrow + coin_transactions + cashback XP) ; `escrow_ledger` (registre
  appairé spend/refund) ; `coin_transactions` (audit — **RLS trop large : fuite cross-teen, à
  corriger**) ; enums `split`/`split_with_parent` présents.
- **Gap** : pas de `split_ledger` (group_action_id, teen_id, share, status) ni d'orchestrateur
  `split_group_purchase(...)` qui **boucle `spend_teen_coins` N fois atomiquement** (échec global si
  un solde insuffisant) ni `refund_group_split`.
- **Reco** : **UN seul orchestrateur `split_group_purchase` + `split_ledger`**, réutilisé par food /
  rides / events / marketplace / cotisations club. Les RPC services l'**appellent** (ne pas
  réimplémenter le split 4 fois).

### c) Déblocage par taille de groupe (« à partir de N amis → avantage »)
- **Existe** : seulement des fragments — `event_challenges` (`group_check_in` 3+, `big_squad` 5+) →
  **bonus XP** au check-in (pas un bénéfice venue) ; `cashback_rules` (patron de règle configurable) ;
  `vip_tiers.max_crew_size` (avantage par palier).
- **Gap** : **aucun moteur « taille → avantage » mutualisé.** À créer : `group_size_rules`
  (service_type, min_group_size, reward_type discount/bonus_xp/free_item/table, reward_value,
  partner_id) + `group_action_rewards` + RPC `unlock_group_size_rewards(group_action_id)`.
- **Reco** : table de règles **générique cross-service** (clé = `service_type`), évaluée au
  `finalize`/`split`. Levier le plus différenciant, mais **dépend** des deux primitives ci-dessus.

## 3. Matrice par service

| Service | Multi-participant | Ado peut créer | Split paiement | Déblocage par taille | Verdict |
|---|---|---|---|---|---|
| **events** | non | non | partiel (enum) | partiel (XP only) | Le plus loin : ni ownership ado, ni `group_bookings`, ni invitations. Chantier complet, forte valeur. |
| **food** | non | oui (1 `teen_id`) | partiel (stub) | non | Proche : `spend_teen_coins` + escrow prêts ; manque tables groupe + boucle débit. **Meilleur terrain de validation du split.** |
| **transport** | partiel (`ride_groups` câblés, sans UI) | partiel (create/join, pas de finalize) | partiel (solo) | non | **Le plus avancé** : conteneur + membres + parent_approval_id déjà en BD. Manque `finalize_group_ride` + split entre ados. |
| **anniversaires** | non | partiel (via parent) | non | non | Gap majeur vs nature sociale (`guest_count` INT only, pas de liste/RSVP/split). Forte valeur. |
| **mentors** | non | n/a | non | non | 1↔1 (`mentee_user_id` singulier). Group sessions = chantier L, valeur moyenne. |
| **stages** | non | n/a | non | non | Candidature solo. Équipe = valeur faible, à reléguer. |
| **clubs** | non | **non** (catalogue admin) | non | non | Solo + unidirectionnel (rejoindre/check-in/XP). Clubs créés par ado + cotisation split + sessions = chantier large, valeur forte mais en aval. |

## 4. Opportunités priorisées
**Principe : poser les primitives transverses une fois, les services les consomment.**

### P0 — Les 2 primitives transverses (débloquent tout le reste)
1. **`group_actions` + `group_action_invites`** (M) — RPC `create_group_action` + `respond_to_group_invite`. Réutilise `circle_members`, `user_notifications`, `parental_approvals`. Débloque RSVP/invitations pour events, food, transport, anniv, clubs (un seul schéma au lieu de 5).
2. **`split_ledger` + `split_group_purchase`** (M) — boucle `spend_teen_coins` (idempotent, atomique) sur N ados + `refund_group_split`. **Pré-requis sécurité : corriger la RLS `coin_transactions` (fuite cross-teen) avant exposition collective.**

### P1 — Premiers consommateurs + moteur de taille
3. **Transport groupé** (`finalize_group_ride` + split) — M, réutilisation max : `ride_groups` déjà en BD → **chemin le plus court pour valider P0 E2E**. + hub UI `/teen/rides/groups` (L).
4. **Food groupé** (`place_grouped_food_order`) — L (orchestration), débit déjà résolu par P0. Meilleur cas pour le **split par articles**.
5. **`group_size_rules` + `unlock_group_size_rewards`** (M) — déclenché dans `split_group_purchase`, réutilise `cashback_rules`/`add_xp_to_user`. Débloque « -10 % si 3+ », « table à 8 », bonus — sur food/rides/events à la fois.
6. **Events : ownership ado + invitations + `group_bookings`** (M→L) — `events.created_by`, réutilise `group_action_invites`, étend `parental_approvals.action_type`.

### P2 — Valeur moyenne/différée
7. **Anniversaire collectif** (`anniv_order_attendees` + split invités + bonus par taille) — L.
8. **Clubs créés par ado + cotisation split + sessions** — L (fork du modèle `circles`).
9. Parent co-payment de groupe ; mentor group sessions ; savings pool de groupe.

### À reléguer
Internship team applications (valeur faible) ; ride_group_disputes (risque fraude/légal élevé) ; organizer settlement/tips (compliance mineurs).

## 5. Reco d'architecture (séquencement obligatoire)
1. **Primitive de groupe** (`group_actions` + invites) — sémantique partagée par tous les services.
2. **Orchestrateur de split** (`split_ledger` + `split_group_purchase`) au-dessus de
   `spend_teen_coins`/`escrow_ledger` — **corriger d'abord la RLS `coin_transactions`**.
3. **Premier consommateur = transport** (`ride_groups` déjà câblés → validation E2E la plus rapide), puis **food**.
4. **Moteur de déblocage** (`group_size_rules`) branché dans le `finalize`/`split`.
5. **Cascade parentale** : `parental_approvals.action_type` += `group_booking`/`event_creation`/`group_food_split`/`group_join` (modèle opt-out inchangé, on ajoute un `group_action_id` pour tracer).

**Flux cible :**
```
Ado ORGANISATEUR
  └─ create_group_action(action_type, resource_id, invitee_ids)        → group_actions (forming)
        └─ group_action_invites (pending) ──notif──► amis
Amis ──respond_to_group_invite(accept)──► invites.accepted
  [seuil] unlock_group_size_rewards()  → count(accepted) ≥ rule.min → group_action_rewards (réduc/table/XP)
Organisateur FINALISE
  └─ split_group_purchase(total−discount, participants[], shares)
        └─ POUR CHAQUE ado : spend_teen_coins (FOR UPDATE, idempotent)
                 ├─ escrow_ledger (spend)  ├─ coin_transactions (audit)  └─ split_ledger (paid)
        └─ échec ATOMIQUE si un solde insuffisant → tout annulé
  └─ service crée la ressource réelle (N ride_bookings / food_order / group_booking)
PARENT (opt-out, par ado) : parental_approvals → deny → refund_group_split (escrow refund appairé)
```

## 6. Quick wins (≤ 2 j) vs chantiers (L)

**Quick wins (réutilisent l'existant) :**
- **Corriger la RLS `coin_transactions`** (fuite cross-teen) — bug sécu, pré-requis du collectif.
- **`group_size_rules` (schéma + seed)** sur le patron `cashback_rules`.
- **Rôle organisateur** = `group_actions.organizer_id` + RLS « organizer=full / participant=read » (patron `crew_members.role`).
- **Chat de coordination** = `circle_messages.metadata.group_action_id` (pas de nouvelle table).
- **Timeline de groupe** : copier `crew_activity_log` → activités de groupe.

**Vrais chantiers (L) :**
- `split_group_purchase` + `split_ledger` (atomicité N débits, refund, idempotence) — cœur à blinder.
- Hub UI transport `/teen/rides/groups` (créer → inviter → approvals → finaliser).
- Food groupé (state machine + items par ado + débits atomiques).
- Anniversaire collectif ; clubs auto-organisés ; mentor group sessions (`mentee_user_id` singulier → table many-to-many).

**Cadrage honnête :** les enums `split`/`split_with_parent` donnent une **fausse impression
d'avancement — ce sont des stubs**. Seul le transport est réellement à mi-chemin (`ride_groups`
câblés). Le bon investissement = **2 primitives transverses (P0) AVANT tout service**, sinon le split
et l'invitation seront recodés 5 fois.

---

# Addendum — Commerce partenaire (boutiques, resto, lieux) × collectif (2026-06-02)

## A. Réponse directe : qu'est-il arrivé à la boutique partenaire ?

Aujourd'hui, **un ado ne peut PAS entrer dans la boutique d'un partenaire** pour parcourir et
acheter ses offres avec ses coins. Il peut seulement : découvrir des offres personnalisées
(`/teen/offres` → `recommend_for_teen`, clic = redirection externe), lire un annuaire en lecture
seule (`/teen/partenaires`, pas de drill-down), commander de la nourriture (`/teen/food/[partner_id]`
→ `place_food_order`), ou échanger des XP contre des récompenses **internes** (`/teen/wallet?tab=shop`).
Les quatre « shop » qui se chevauchent :
- **Shop XP interne** (`shop_rewards`, `purchase_reward`) — VIVANT, mais XP-only, aucune économie partenaire.
- **Offres partenaires** (`partner_offers`) — surfacées en découverte/redirect uniquement ; **aucun flux d'achat ado** hormis food.
- **Marketplace** (`marketplace_listings`) — VIVANT, mais C2P entre ados, pas commerce partenaire.
- **Boutique par partenaire** (parcourir/acheter les offres d'UN partenaire) — **JAMAIS câblée côté teen**.

Régression vs absence : `/teen/shop/page.tsx` **redirige** vers le shop XP et `/api/teen/shop` renvoie
**410 Gone** (« Legacy shop endpoint removed ») — régression d'un endpoint, mais rien ne prouve qu'une
vraie boutique partenaire ait été complètement câblée. Diagnostic exact : **les primitives existent**
(`partner_offers`, `partner_transactions`, `discount_usage`, RPC `apply_partner_offer`,
`spend_teen_coins`) et **les routes partenaire existent** (`/partner/offers`, `apply-discount`), **mais
le câblage teen→achat manque**. Seul achat partenaire ado-initié réel = `place_food_order`.
`apply_partner_offer` est **partenaire-initié** (le partenaire scanne la VIP card au PDV).

## B. État par axe

| Axe | Ce que l'ado peut faire aujourd'hui | Régression / gap | Verdict |
|---|---|---|---|
| **Boutiques partenaires** | Découvrir offres perso (redirect externe) ; annuaire lecture-seule ; XP→récompenses internes ; se faire scanner sa VIP au PDV (partenaire-initié) | `/teen/shop` redirige ; `/api/teen/shop`=410. Aucune route `/teen/partners/[id]/shop`, aucun `/buy`, **aucune RPC `purchase_partner_offer` ado-initiée** | **Câblage teen→achat MANQUANT** (primitives prêtes) |
| **Resto comme commerce** | Découvrir restos, parcourir menu, **commander SEUL** (`place_food_order`), approbation opt-in | `payment_method='split'` = **STUB** (exige `v_caller=p_teen_id` → 1 seul payeur) ; pas de `food_orders.group_action_id`, pas de discount par taille | **Solo OK, collectif STUB** |
| **Lieux de fête / venues** | Réserver un évènement Nivy gratuit (opt-out) — non lié à un partenaire-lieu | `partners.type='venue'` + `events.venue_id` existent mais **aucun flux ado venue** : pas de `/teen/venues`, pas de `venue_bookings`/slots/RPC | **Jamais câblé** |
| **Rail transactionnel** | Débit solo atomique (`spend_teen_coins`), `partner_transactions`/escrow/cashback, scan VIP v2 OK | **Couche groupe absente** (pas de `group_actions`/`split_ledger`/`split_group_purchase`/`group_size_rules`) | **Solo solide, groupe = 0** |

## C. Modèle cible — commerce partenaire unifié

**Une « boutique partenaire » canonique** : un partenaire expose un catalogue (offres `partner_offers`,
items `menu_items`, créneaux venue) et **l'ado parcourt + transige directement**. Route pivot :
**`/teen/partners/[partner_id]`** avec onglets **Menu** (food existant) · **Offres** (achat/redeem) ·
**Événements/Venue** (créneaux) · **Info**. Cela sort le « resto » du silo food-only et unifie
boutique/resto/lieu sous une seule UX.

**Réutilisable tel quel** : `partner_offers`, `partner_transactions` (CA + commission),
`spend_teen_coins` (débit + escrow + cashback idempotent), `recommend_for_teen`, `parental_approvals`,
`vip_cards`, `partner_qr_secret`+`qr_nonces`, scanner v2.

**Brique MANQUANTE (cœur)** : RPC **`purchase_partner_offer(offer_id, teen_id, idempotency_key)`
ado-initiée**, atomique = débit `spend_teen_coins` + write `partner_transactions` + bump
`current_total_uses` + enforce `max_uses_per_user`/`min_vip_level` + émission d'un **code/QR de
redemption** (offres non-instant). Différence nette : `apply_partner_offer` = réduction au PDV
(partenaire-initié) ; il manque l'**achat réel ado-initié**. Prévoir un état `reserved`/
`pending_partner_approval` pour event/venue/experience (voucher instantané sinon).

## D. Croisement avec le collectif (primitives P0)
- **Achat groupé chez un partenaire** : N ados achètent la même offre via un `group_action` ;
  `split_group_purchase` itère `spend_teen_coins` atomiquement ; chaque débit logué dans
  `partner_transactions`. Chacun paie sa part.
- **Réduction débloquée par taille au PDV** : `group_size_rules(service_type, min_group_size, …,
  partner_id?)`, appliquée **sur le total avant le split** (ex. « 3+ → -10% », « table 8 payée 6 »).
  Levier viral pendant le RSVP (« il manque 2 pour -15% »).
- **Réservation lieu/resto de groupe avec split** : `group_action(action_type='venue_booking'|'food')` ;
  le partenaire voit la résa groupée (`group_action_id`) et scanne un code d'activation (vérif headcount).
- **Dépendance dure** : tout le volet groupe est bloqué tant que `group_actions` + `split_group_purchase`
  ne sont pas posés.

## E. Opportunités priorisées
- **P0 — Boutique partenaire SOLO ado-initiée** (fort, M) : route `/teen/partners/[partner_id]`
  (onglets) + listing `partner_offers` + **RPC `purchase_partner_offer`** (débit/transaction/compteur/
  code). 1ʳᵉ action : `page.tsx` lisant `partner_offers WHERE partner_id` + repointer le `/teen/shop` mort.
- **P0 (transverse) — Primitives groupe** : `group_actions`+`group_action_invites`+`split_ledger`+RPC
  `split_group_purchase` (atomicité N débits). Antécédent dur de tout le commerce de groupe.
- **P1 — Resto repensé + commande groupée** (fort, L) : `food_orders.group_action_id` + branchement
  conditionnel `split_group_purchase` dans `place_food_order` (chemin solo intact) + déblocage par taille.
- **P1 — Moteur `group_size_rules`/`unlock_group_size_rewards`** (fort, M ; patron `cashback_rules`).
- **P2 — Réservation venue partenaire groupée** (moyen, L) : `/teen/venues` + `venue_bookings`/slots +
  `reserve_venue_slot`. Dépend de P0 groupe.
- **P2 — Économie** : XP→redeem chez partenaire (S mais bloqué par l'absence de ledger XP débitable) ;
  cashback centralisé (S : sortir `PARTNER_COMMISSION_RATE=10%` hardcodé vers `cashback_rules`) ;
  marketplace partenaire-vendeur (M).

## F. Quick wins vs chantiers
**Quick wins** : repointer/renommer `/teen/shop` + clarifier les 4 « shop » (« Récompenses XP » ≠
« Boutiques partenaires ») — supprime la confusion à la racine de la « régression » perçue ;
boutique partenaire solo (tables/RPC de débit/reco/approbations **existent** → manque UI listing +
RPC `purchase_partner_offer`, effort M) ; cashback centralisé (S).
**Chantiers (L)** : primitives groupe (P0 transverse) ; resto groupé (refactor `place_food_order`
group-aware + split par article) ; réservation venue groupée (le plus lourd) ; marketplace
partenaire-vendeur.

**Ordre recommandé** : (1) réparer/renommer `/teen/shop` → (2) **boutique partenaire solo
ado-initiée** [répare la régression perçue, valeur la plus visible] → (3) primitives groupe P0 →
(4) resto groupé / venues par-dessus.
