# Cartographie du flux teen wallet

- **Date :** 2026-07-13
- **Scope :** UI wallet (`app/teen/wallet/page.tsx`, `app/teen/wallet/wallet-hub-client.tsx`, `components/dashboard/teen/header.tsx`), endpoint données (`app/api/teen/wallet/route.ts`), tables/visions de solde (`user_coins`, `user_coins_spendable`, `teen_full_profile`, `user_progression`), RPCs de mouvement (`add_coins_to_user` mig 000, `top_up_teen` mig 179, `lock_to_goal`/`release_from_goal` mig 054, `spend_teen_coins` mig 061/124, `_debit_teen_coins` mig 179, `_cashback_pct` mig 175, `complete_mentor_session` mig 059).
- **Type :** Cartographie lecture seule. Aucune modification de code.
- **Référence canonique :** `docs/canon/economy-payments.locked.md` §1, §29.

---

## 1. Sources de lecture du solde

Le système présente **quatre** représentations du solde d'un ado, avec des sémantiques et des lecteurs différents. Incohérences avérées (voir §6).

| Source | Type | Valeur portée | Lecteurs (code) | Notes |
|--------|------|---------------|-----------------|-------|
| `user_coins.balance` | **Table** (source de vérité, mig 000:170-182) | Solde brut (integer ≥ 0). PK `teen_id`. | `app/api/teen/wallet/route.ts:22-26` ; `lib/server/teen-dashboard.ts:208-214` (fallback `coins_balance`) ; `lib/hooks/teen-dashboard.ts:147` ; `app/api/teen/spend/route.ts:73` ; `app/api/teen/tokens/route.ts:38,110` ; `app/onboarding/complete/page.tsx:65` ; `app/teen/quests/page.tsx:27` ; `app/api/admin/refunds/route.ts:196,206,214` ; `app/admin/utilisateurs/[id]/page.tsx:62` ; RPCs (via `FOR UPDATE`) | **Canon (§1).** Solde réel. Tous les RPCs money-write (`spend_teen_coins`, `top_up_teen`, `lock_to_goal`, `_debit_teen_coins`) y écrivent. |
| `user_coins_spendable` | **Vue** (mig 054:173-189, security_invoker post-mig 110:38) | `total = balance` ; `locked_in_goals = SUM(current_saved_coins) WHERE status='active'` ; `spendable = total - locked` | `app/teen/wallet/page.tsx:40-43` (onglet Épargne + header wallet) ; `app/teen/savings/page.tsx:36` ; `app/api/teen/savings/goals/route.ts:42` ; `components/teen/goal-withdraw-button.tsx:7` (commentaire) | Source unique de l'affichage « disponible ». Calcul dérivé, recalculé à chaque lecture. |
| `teen_full_profile.coins_balance` | **Vue dénormalisée** (mig 151 ; colonne miroir de `user_coins.balance`) | Dernier solde connu (potentiellement **stale** — la vue n'est pas matérialisée mais dénormalisée au sens où elle joint plusieurs tables) | `lib/server/teen-dashboard.ts:177,214` (fallback quand `user_coins` lookup échoue) ; `lib/auth/get-user-role.ts:114` (`coins: teenData.coins_balance`) ; `app/api/teen/avatar-coach/route.ts:297,302,306` ; `app/teen/coins/coins-client.tsx:65` (legacy/mock) | **Utilisé comme fallback partout où la SSR a besoin d'une valeur rapide.** Drift possible vs `user_coins.balance` (le dashboard le signale explicitement : `teen-dashboard.ts:206-207` « teen_full_profile mirror may be stale »). |
| `user_progression.coins` | **Table legacy** (mig 000:249) | Miroir censé suivre `user_coins.balance` | **Aucun lecteur actif** dans `app/`, `lib/`, `components/` (grep vide). Mis à jour uniquement par `add_coins_to_user` (000:462-464) et `add_xp_to_user` (000:374 — uniquement les colonnes XP, pas coins). | **Mort.** Canon §5.2 le flaggue à supprimer. Le `add_coins_to_user` (000:412-475) qui l'écrit est lui-même déprécié (canon §5.2 — « race-prone, bypasses audit invariants »). |

**Synthèse :** `user_coins.balance` est la source de vérité, mais `teen_full_profile.coins_balance` est utilisé comme raccourci à plusieurs endroits (header, onboarding, avatar-coach) — risque d'affichage stale documenté §6.

---

## 2. Points de refresh client

| Composant | Trigger de refresh | Endpoint | Stratégie / risque de donnée périmée |
|-----------|--------------------|----------|---------------------------------------|
| `components/dashboard/teen/header.tsx:57-86` | (a) Montage (`useEffect` ligne 70) ; (b) `window focus` (lignes 74, 78) ; (c) `visibilitychange → visible` (lignes 72-73, 75-79) ; (d) **changement d'XP** via `useGamificationContext` (`xp?.total_xp`, lignes 83-86) → resynchronise car cashback possible après un spend | `GET /api/teen/wallet` (header.tsx:60) → lit `user_coins.balance` directement (route.ts:22-26) | **Stale risk :** aucune polling périodique. Entre deux focus/visibilité, le header peut afficher un solde obsolète pendant plusieurs minutes (ex. spend dans une autre page sans changement d'XP). Le trigger (d) ne se déclenche que si l'XP bouge — un `top_up_teen` (crédit coins pur, pas d'XP) ne rafraîchit PAS le header tant que l'utilisateur ne revient pas au premier plan. |
| `app/teen/wallet/wallet-hub-client.tsx:165-180` (`CoinsTab`) | Montage unique (`useEffect` ligne 165, deps `[teenId]`) | `GET /api/teen/wallet` (ligne 168) → `data.transactions` (les 10 dernières `coin_transactions`) | **Pas de re-fetch.** La liste des transactions est figée après le premier chargement. Un spend effectué dans un autre onglet n'apparaît pas tant que l'utilisateur ne rechange pas d'onglet/recharge la page. Le solde du header (`walletData.coins`, passé par la page SSR) n'est pas non plus rafraîchi côté client dans le `CoinsTab`. |
| `app/teen/wallet/page.tsx` (SSR) | Chargement de page (server component) | Lecture directe Supabase : `user_coins_spendable` (page.tsx:40-43), `savings_goals` (page.tsx:44-48), `getTeenDashboardData()` qui lit `user_coins.balance` (teen-dashboard.ts:208) | Rafraîchi uniquement au navigation/refresh. La page sert un snapshot SSR au `WalletHubClient`. |

**Gaps constatés :**
- Aucun mécanisme de **temps réel** (pas de Supabase Realtime subscription sur `user_coins` ou `coin_transactions`). Tout repose sur le re-fetch manuel au focus.
- Le header dépend de la variation d'XP pour resynchroniser — un flux coins-only (top-up parental, lock épargne, marketplace sale) ne déclenche pas le refresh du header.
- Aucun endpoint `/api/teen/wallet` dédié à l'onglet Épargne — `wallet-hub-client.tsx` ne re-fetch jamais `user_coins_spendable` ; le verrouillage/déverrouillage d'objectif sur `/teen/savings` ne se reflète dans l'onglet Épargne du wallet qu'au rechargement de `/teen/wallet`.

---

## 3. Transitions d'état des coins (`coin_transactions.transaction_type`)

Pour chaque type, émetteur RPC, `source_type`/`source_id`, et conformité aux invariants canon §29.3 (cashback appairé) et §29.4 (escrow appairé).

| `transaction_type` | RPC émetteur | `source_type` / `source_id` | Cashback XP appairé (§29.3) ? | Escrow appairé (§29.4) ? |
|--------------------|--------------|------------------------------|-------------------------------|--------------------------|
| **`topup`** | `top_up_teen` (3-arg mig 179:235 ; 5-arg 179:354) | `source_type='parent_topup'` ; `source_id = payment_transactions.id` | Non (crédit, pas spend — conforme). | ✅ `escrow_ledger(direction='top_up', related_payment_id)` (179:213-219, 179:333-340). |
| **`spend`** (canon central) | `spend_teen_coins` (mig 061:114, 124:146) ; `_debit_teen_coins` (mig 179:481) | `source_type = 'partner' \| 'reward'` ; `source_id = partner_id \| reward_id` | ✅ `add_xp_to_user('cashback','spend', coin_tx_id)` (061:140-147, 124:172-179, 179:507-514). Taux via `cashback_rules` → `default_cashback_pct` → 10. | ✅ `escrow_ledger(direction='spend', related_spend_id)` (061:128-138, 124:160-170, 179:494-505). |
| **`spend`** (mentor session — BYPASS) | `complete_mentor_session` (mig 059:165-172) | `source_type='mentor_session'` ; `source_id = p_session_id` | ❌ **Aucun** (059 n'appelle pas `add_xp_to_user` pour cashback — grep vide). **Violation §29.3.** | ❌ **Aucun** `escrow_ledger` insert (059 ne touche pas `escrow_ledger` — grep vide). **Violation §29.4.** |
| **`spend`** (ride — mig 061 rewrite) | `complete_ride` (mig 061:264-272) | `source_type='ride'` ; `source_id = p_ride_id` | ✅ `add_xp_to_user('cashback','ride', coin_tx_id)` (061:287-294). | ✅ `escrow_ledger(direction='spend', related_spend_id)` (061:275-284). |
| **`spend`** (marketplace escrow) | `buy_listing` (legacy) / via `spend_teen_coins` (mig 143:108) | `source_type='partner'` (partner_id = seller) ; `source_id = listing_id` | ✅ via `spend_teen_coins`. | ✅ via `spend_teen_coins`. |
| **`earn`** (marketplace sale — côté vendeur) | `confirm_receipt` (mig 061:476-478) | `source_type='marketplace_sale'` ; `source_id = p_transaction_id` | ✅ `xp_transactions('marketplace_cashback')` côté acheteur (061:495-497) — mais via insert direct, pas `add_xp_to_user`. | ⚠️ `confirm_receipt` n'écrit pas d'`escrow_ledger` pour le crédit vendeur (grep vide dans 061:467-487). Le `spend` initial (acheteur) oui, via `spend_teen_coins`. |
| **`earn`** (bonus onboarding) | `add_coins_to_user` (mig 000:458) ; `init_user_gamification` (000:590-592, 100 coins bonus) | `source_type` variable | Non (crédit bonus). | ❌ Aucun. `add_coins_to_user` est déprécié (canon §5.2). |
| **`refund`** (marketplace dispute) | `resolve_dispute` (mig 061:578-612) | `source_type='marketplace_dispute'` ; `source_id = v_tx.id` | Non appelé explicitement (le cashback initial de l'acheteur n'est pas reversé dans `resolve_dispute` — 061 ne touche pas `xp_transactions` sur refund). ⚠️ **Violation §29.3 reversal (canon FORBIDDEN #8).** | ✅ `escrow_ledger(direction='refund')` (061:586-592). |
| **`refund`** (food order reject) | `partner_reject_food_order` (mig 061:703-735) | `source_type='food_order_refund'` ; `source_id = v_order.id` | ✅ Reversal via `xp_transactions('cashback_reversal')` (061:728-734) — mais écriture directe, pas helper canon `revoke_xp_cashback` (canon §7 : RPC manquant). | ✅ `escrow_ledger(direction='refund')` (061:711-718). |
| **`bonus`** | (Référencé dans le schéma commenté mig 000:221 `'earn', 'spend', 'bonus', 'refund'`) | — | Aucun RPC actif n'écrit `'bonus'` (grep vide sur `'bonus'` dans les migrations). | N/A. Type déclaré mais non émis. |

**Constats clés :**
- **`complete_mentor_session` (mig 059) est un outlier** : il débite `user_coins` directement (059:158-163), écrit une ligne `coin_transactions('spend','mentor_session')` (059:165-172), mais **omet l'escrow_ledger ET le cashback**. Double violation §29.3 + §29.4. N'utilise pas `spend_teen_coins`. À corriger (canon §7 liste `complete_mentor_session` comme MISSING/P1, mais la version 059 existe et est défectueuse).
- **`add_coins_to_user` (mig 000:412-475)** écrit `user_coins` SANS `FOR UPDATE` (000:431-433 select puis 000:449 update séparés) → race-prone. N'écrit pas d'escrow_ledger. Déprécié (canon §5.2).
- **`confirm_receipt`** écrit le cashback acheteur via insert direct dans `xp_transactions` (061:489-498) plutôt que via `add_xp_to_user` — incohérence d'implémentation (le cashback spend passe par `add_xp_to_user`, le cashback marketplace non).

---

## 4. Flux épargne (savings goals)

Représentation textuelle des transitions lock/release et de leur effet sur `spendable`.

```
                        user_coins.balance (TOTAL brut)
                                  │
                                  ▼
            ┌────────────────────────────────────────────┐
            │  user_coins_spendable (vue, mig 054:173)    │
            │  spendable = balance - SUM(current_saved    │
            │              WHERE status='active')         │
            └────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┴──────────────────────────┐
        ▼                                                    ▼
  [LOCK]  lock_to_goal(p_teen_id, p_goal_id, p_amount)   [SPEND]
  mig 054:196-273                                          spend_teen_coins vérifie
   • FOR UPDATE sur user_coins (054:232)                   v_spendable = balance - v_locked
   • recalcule v_locked (tous goals actifs, 054:237)       refuse si spend < p_amount (061:78)
   • refuse si p_amount > v_spendable (054:242)            ✅ Respecte le spendable
   • UPDATE savings_goals.current_saved_coins += p_amount
   • INSERT savings_contributions(source='teen_lock')      [PARENT MATCH] _savings_match_trigger
   • auto-achieve si target atteint (054:258-262)          mig 054:503-570
        │                                                   • déclenché sur INSERT savings_contributions
        ▼                                                     WHERE source='teen_lock' (054:516)
   balance_user_coins INCHANGÉ                              • calcule match = floor(amount * pct)
   (le lock ne débite pas, il réserve)                     • appelle top_up_teen 3-arg (054:550) ⚠️ voir Audit F2
                                                           • UPDATE savings_goals.current_saved_coins += match
        │                                                   • INSERT savings_contributions(source='parent_match')
        ▼
  [RELEASE]  release_from_goal(p_goal_id, p_reason)
  mig 054:280-325
   • FOR UPDATE sur savings_goals (054:293)
   • refuse si déjà 'achieved' (054:302)
   • status := 'cancelled' | 'expired' (054:306-309)
   • current_saved_coins := 0 (054:313) ← remet les coins dans le spendable
   • pas de mouvement user_coins (les coins n'ont jamais quitté balance)
   • pas de coin_transactions / escrow_ledger pour la release
     (cohérent : pas de mouvement de coins, juste un changement de verrou)
```

**Constats :**
- `lock_to_goal` **ne débite pas** `user_coins.balance` — il incrémente `savings_goals.current_saved_coins`, ce qui fait baisser le `spendable` calculé par la vue. Les coins restent sur le compte de l'ado mais deviennent indisponibles à la dépense.
- `release_from_goal` remet `current_saved_coins` à 0 → les coins redeviennent spendable automatiquement via la vue. Pas de mouvement de coins à tracer.
- `spend_teen_coins` (061:73-81, 124:105-113, `_debit_teen_coins` 179:417-425) **respecte** le spendable : il recalcule `v_locked` et refuse si `v_spendable < p_amount`. ✅ Invariant tenu sur le chemin canonique.
- **Gap :** `complete_mentor_session` (059:143-156) et `complete_ride` (061:237-239) vérifient `balance < amount` **sans** soustraire `v_locked` — ils peuvent donc dépenser des coins verrouillés en épargne. `complete_ride` (061:237) fait `IF v_balance < v_amount_coins THEN insufficient` sans notion de spendable. Incohérence : le verrou épargne n'est pas universellement respecté.

---

## 5. Flux cashback XP appairé (canon §29.3)

Séquence de déclenchement après un `spend` via le chemin canonique (`spend_teen_coins` / `_debit_teen_coins`) :

```
1. spend_teen_coins(p_teen_id, p_amount_coins, p_partner_id, p_reward_id, p_idempotency_key)
   mig 124:52 (et _debit_teen_coins mig 179:374)
        │
        ▼
2. [Idempotence] Si p_idempotency_key présent → SELECT coin_transactions
   WHERE client_idempotency_key = ... → si trouvé, replay (return stored result)
   mig 124:88-98 (et 179:400-410)
        │
        ▼
3. [Verrou] SELECT balance FROM user_coins WHERE teen_id = ... FOR UPDATE
   mig 124:100 (et 179:412)  ← verrou ligne posé ICI
        │
        ▼
4. [Spendable] v_locked = SUM(current_saved_coins WHERE status='active')
   v_spendable = balance - locked
   si spendable < amount → RETURN 'insufficient_balance'
   mig 124:105-113 (et 179:417-425)
        │
        ▼
5. [F49 cap dépense] (_debit_teen_coins uniquement, 179:427-449)
   v_spend_cap_dh = MIN(parental_limits.max_monthly_spend_dh) sur parents liés actifs
   v_spent_mtd = SUM(-amount) / 100 WHERE transaction_type='spend' ce mois (Casablanca)
   si spent_mtd + amount/100 > cap → RETURN 'exceeds_monthly_spend_cap'
        │
        ▼
6. [Résolution cashback %]
   SELECT cashback_pct FROM cashback_rules
     WHERE is_active AND (partner_id IS NULL OR = p_partner_id)
     AND active_from <= now() < active_until
     ORDER BY partner_id NULLS LAST LIMIT 1            ← règle partenaire > règle globale
   si NULL → xp_payment_settings.default_cashback_pct (10)
   si NULL → fallback dur 10
   mig 124:115-130 (et 179:451-466)
   NOTE : helper canon _cashback_pct(partner_id) (mig 175:49) existe mais
          n'est PAS appelé par _debit_teen_coins (logique dupliquée inline).
        │
        ▼
7. v_cashback_xp = FLOOR(p_amount_coins * cashback_pct / 100)
   mig 124:132 (et 179:468)
        │
        ▼
8. [Débit] UPDATE user_coins SET balance -= amount ... RETURNING balance
   mig 124:134-139 (et 179:470-475)
        │
        ▼
9. [Ledger coin] INSERT coin_transactions(-amount, 'spend', source_type, source_id,
   balance_after, client_idempotency_key) RETURNING id
   mig 124:142-151 (et 179:477-486)
        │
        ▼
10. [Escrow appairé] INSERT escrow_ledger(direction='spend', related_spend_id=coin_tx_id)
    mig 124:159-170 (et 179:494-505)
        │
        ▼
11. [Cashback XP] SI v_cashback_xp > 0 :
    add_xp_to_user(p_teen_id, v_cashback_xp, 'cashback','spend', coin_tx_id, ...)
    mig 124:172-179 (et 179:507-514)
    → écrit user_xp.total_xp += cashback_xp + xp_transactions(source_type='cashback')
        │
        ▼
12. [Partner txn] SI p_partner_id IS NOT NULL :
    INSERT partner_transactions(cashback_xp, status='succeeded')
    mig 124:181-190 (et 179:516-525)
        │
        ▼
13. RETURN jsonb{success, new_balance, spendable, xp_earned, cashback_pct, spend_id}
    mig 124:192-199 (et 179:527-534)
```

**Atomicité :** toute la séquence (étapes 3 à 12) est dans un seul bloc `SECURITY DEFINER` avec `EXCEPTION WHEN unique_violation` (124:200-210, replay idempotent) et `WHEN OTHERS` (124:211-213, rollback). Le cashback est donc **atomique avec le spend** — si l'`add_xp_to_user` échoue, le spend tout entier est annulé. ✅ Conforme §29.3.

**Constats :**
- Le cashback est correctement appairé et atomique sur le chemin `spend_teen_coins`/`_debit_teen_coins`.
- Le helper canon `_cashback_pct` (mig 175:49-68) reproduit **exactement** la sémantique inline de `_debit_teen_coins` (cf. commentaire 175:46-48) — mais **n'est pas encore consommé** par `_debit_teen_coins`, `spend_teen_coins`, `confirm_receipt`, ni `complete_ride`. La logique est dupliquée à 4 endroits. Risque de dérive si une 5e résolution change (ex. ajout d'un cap par partenaire).
- **`complete_mentor_session` (059) ne déclenche AUCUN cashback** → l'ado dépense des coins mentor sans recevoir l'XP de cashback attendu. C'est à la fois une violation d'invariant (§29.3) et une perte de valeur utilisateur.

---

## 6. Incohérences détectées + risques de donnée périmée

| # | Incohérence | Détail | Impact |
|---|-------------|--------|--------|
| I1 | **Solde affiché depuis deux sources** | `user_coins.balance` (header via `/api/teen/wallet`, dashboard SSR) vs `teen_full_profile.coins_balance` (fallback `get-user-role.ts:114`, avatar-coach:297, coins-client legacy). Le dashboard commente explicitement « teen_full_profile mirror may be stale » (teen-dashboard.ts:206-207). | Un ado peut voir un solde différent selon la surface. Ex. : après un top-up, le header (qui refresh au focus) peut afficher 500 ⊙ tandis que avatar-coach affiche encore 0 ⊙ (stale). |
| I2 | **Header non rafraîchi sur flux coins-only** | `header.tsx:83-86` ne resync que sur variation d'XP. Un top-up parental (coins pur, pas d'XP) ou un lock épargne ne déclenche pas le refresh. | Le header peut afficher un solde périmé jusqu'au prochain focus/changement d'onglet. |
| I3 | **`complete_mentor_session` (059) out of canon** | Débit direct `user_coins` sans `spend_teen_coins`, sans escrow_ledger, sans cashback. | Double violation §29.3 + §29.4. L'ado perd le cashback XP. Les mouvements mentor ne sont pas tracés dans escrow_ledger. |
| I4 | **`add_coins_to_user` (000) race-prone et sans audit** | `SELECT balance` puis `UPDATE balance = current + amount` sans `FOR UPDATE` (000:431-455). N'écrit pas d'escrow_ledger. | Toujours exécutable (grant non révoqué). Concurrence = double-crédit possible. Canon §5.2 demande DROP/REVOKE. |
| I5 | **Cashback résolu inline à 4 endroits** | `_debit_teen_coins`, `spend_teen_coins`, `confirm_receipt`, `complete_ride` chacun duplique le ladder `cashback_rules → default → 10`. Le helper `_cashback_pct` (175) existe mais n'est pas appelé. | Risque de divergence si un 5e taux est ajouté (ex. cap par jour). Maintenance fragile. |
| I6 | **`user_progression.coins` mort mais écrit** | `add_coins_to_user` (000:462-464) et `init_user_gamification` (000:599-602) écrivent `user_progression.coins` mais aucun lecteur n'existe. | Table fantôme qui peut désynchroniser un futur lecteur croyant lire le solde. Canon §5.2 demande le drop. |
| I7 | **Spendable non respecté par `complete_ride` et `complete_mentor_session`** | `complete_ride` (061:237) et `complete_mentor_session` (059:149) vérifient `balance < amount` sans soustraire `v_locked` épargne. | Un ado peut dépenser des coins réservés en épargne via un trajet ride ou une session mentor. Contournement du verrou parental/épargne. |
| I8 | **`confirm_receipt` cashback hors `add_xp_to_user`** | Le cashback marketplace acheteur est inséré directement dans `xp_transactions` (061:489-498), pas via `add_xp_to_user`. | Pas de mise à jour de niveaucohérente (`current_level` non recalculé via la boucle de `add_xp_to_user` 000:343-358). Drift niveau possible. |
| I9 | **`bonus` type déclaré mais jamais émis** | Schéma mig 000:221 mentionne `'bonus'` mais aucun RPC n'écrit ce type (grep vide). | Type mort. Si un futur flux veut créditer un bonus, l'invariant §29.4 (escrow appairé) devra être pensé. |
| I10 | **Onglet Épargne du wallet non rafraîchi** | `wallet-hub-client.tsx:583` (SavingsTab) reçoit `walletData.savings` du SSR, jamais re-fetch. | Lock/release sur `/teen/savings` ne se reflète pas dans l'onglet wallet sans reload. |

---

## 7. Recommandations

### P0 — Cohérence monétaire

- **R7.1 (couvre I3, I7)** — Réécrire `complete_mentor_session` (059) pour qu'il délègue à `spend_teen_coins` (ou `_debit_teen_coins`) : cela restaure d'un coup le respect du spendable, l'escrow appairé et le cashback. Idem pour `complete_ride` (déjà partiellement réécrit en 061 mais le check spendable manque — ajouter la soustraction `v_locked`).
- **R7.2 (couvre I4, I6)** — `DROP FUNCTION add_coins_to_user` et `REVOKE EXECUTE` ; supprimer la colonne `user_progression.coins` (ou toute la table si elle n'a plus de lecteur). Canon §5.2.
- **R7.3 (couvre I5)** — Remplacer les 4 résolutions cashback inline par un appel au helper canon `_cashback_pct(p_partner_id)` (mig 175). Single source of truth.

### P1 — Cohérence d'affichage

- **R7.4 (couvre I1)** — Standardiser : toutes les surfaces client ne doivent lire que `user_coins.balance` (via `/api/teen/wallet` ou `user_coins_spendable`). Retirer les lectures `teen_full_profile.coins_balance` de `get-user-role.ts:114` et `avatar-coach/route.ts:297` (fallback à `user_coins` à la place).
- **R7.5 (couvre I2)** — Ajouter un refresh du header sur signal « spend succeeded » (ex. événement custom ou callback après `purchaseReward`), pas seulement sur variation d'XP. Alternative : polling léger (ex. 30s) limité au header.
- **R7.6 (couvre I10)** — Re-fetch `user_coins_spendable` dans `SavingsTab` au montage de l'onglet (et/ou via `router.events.routeChangeComplete`), pour refléter les locks/releases récents.

### P2 — Défense en profondeur

- **R7.7 (couvre I8)** — Uniformiser le cashback marketplace : `confirm_receipt` doit appeler `add_xp_to_user` (recalcul du niveau) plutôt qu'insérer directement dans `xp_transactions`.
- **R7.8 (couvre I9)** — Décider formellement : soit supprimer la mention `'bonus'` du commentaire schéma (000:221), soit le câbler via un RPC dédié (`award_bonus_coins`) avec escrow appairé.
- **R7.9** — Documenter dans le canon que `lock_to_goal`/`release_from_goal` ne génèrent **pas** de `coin_transactions` (les coins ne bougent pas, seul le verrou change) — pour éviter qu'un futur contributeur n'ajoute par erreur des lignes ledger fantômes.

---

*Fin de la cartographie. Document généré le 2026-07-13 — lecture seule, aucune modification de code effectuée.*
