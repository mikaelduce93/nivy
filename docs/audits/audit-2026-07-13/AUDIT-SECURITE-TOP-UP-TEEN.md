# Audit sécurité — RPC `top_up_teen`

- **Date:** 2026-07-13
- **Scope:** `gamification-system/database/migrations/179_parental_limits_caps.sql` (helper `_check_topup_caps` + 3-arg et 5-arg overloads), `app/api/parent/topup/route.ts`, `app/api/admin/topups/[id]/confirm/route.ts`, `lib/payments/psp-webhook.ts`, `docs/canon/economy-payments.locked.md` (§29, F6).
- **Type:** Audit lecture seule. Aucune modification de code.
- **Référence transactionnelle :** 1 DH = 100 coins (verrouillé, canon §2.1).

---

## Synthèse

| # | Préoccupation | Sévérité | Statut |
|---|---------------|----------|--------|
| F1 | TOCTOU entre le contrôle de plafond (`_check_topup_caps`) et le crédit du solde | 🔴 Vulnérabilité | Fenêtre de concurrence réelle, verrou manquant |
| F2 | Contournement des plafonds via l'overload 3-arg (`psp_reference=NULL`) | 🔴 Vulnérabilité | Appelée en production par `disburse_allowance` + trigger épargne |
| F3 | Cohérence de la couche d'idempotence (clé client vs provider/ref) | 🟡 À surveiller | Clé client attachée APRÈS le RPC ; recouvrement partiel |
| F4 | Contournement du gate e-signature pour appels service_role | 🟢 OK | Gate enforced via `p_parent_id` quel que soit le caller |
| F5 | Périmètre `SECURITY DEFINER` (privilèges owner) | 🟢 OK | Grant `service_role` only post-mig 112 ; RLS write-deny sur tables money |
| F6 | Auto-relèvement de plafond via `parental_limits` | 🟢 OK | RLS SELECT-only pour `authenticated` ; écritures service_role only |
| F7 | Gestion du timezone au bornage de mois (Africa/Casablanca) | 🟢 OK | Conversion `AT TIME ZONE` correcte |
| F8 | Validation du montant (`p_amount_dh`) | 🟡 À surveiller | Seuil `> 0` seul côté RPC ; max global côté route (PARENT_TOPUP_MAX_DH) |

Légende : 🟢 OK · 🟡 À surveiller · 🔴 Vulnérabilité

---

## Findings détaillés

### F1. TOCTOU entre contrôle de plafond et crédit du solde — 🔴 Vulnérabilité

- **Description :** `_check_topup_caps` (179:67-138) est déclarée `STABLE` et lit les sommes MTD via `SELECT ... SUM(amount_dh) FROM payment_transactions WHERE status='succeeded'` **sans `FOR UPDATE` ni verrou advisory**. Le corps principal du RPC appelle ce helper (179:193 et 179:317) puis, plus loin, insère la ligne `payment_transactions` + crédite `user_coins` (179:200-228 et 179:323-348). Entre l'instant où le helper mesure le MTD et l'instant où la nouvelle ligne devient visible aux autres transactions, deux top-ups concurrents peuvent **tous les deux** lire le MTD antérieur et passer le contrôle.

  Le seul verrou `FOR UPDATE` présent (179:342-348) est sur la ligne `user_coins` lors de l'upsert — il protège l'intégrité du solde mais **n'empêche pas** que chaque transaction valide sa propre ligne `payment_transactions` succeeded, chacune ayant passé le check de plafond contre l'état pré-concurrent.

  Par défaut, Postgres exécute les RPC en `READ COMMITTED`. `_check_topup_caps` étant `STABLE`, son snapshot est posé au début de l'instruction ; deux transactions partant à ~T0 voient toutes deux `mtd = N`, puis insèrent chacune `+M`, aboutissant à `N + 2M` pour le mois.

- **Code concerné :**
  - `179_parental_limits_caps.sql:67-138` — helper `STABLE`, lecture non verrouillée.
  - `179_parental_limits_caps.sql:113-126` — `SELECT SUM(amount_dh) ... WHERE status='succeeded'` sans `FOR UPDATE`.
  - `179_parental_limits_caps.sql:193` / `:317` — appel du helper avant tout verrou ligne.
  - `179_parental_limits_caps.sql:342-348` — `FOR UPDATE` posé **après** le check (trop tard pour la cohérence du plafond).

- **Risque :** Un parent déclenchant deux requêtes parallèles (double-clic, onglets multiples, ou script) peut dépasser le plafond F6 — typiquement **200 DH/opératoir**e n'est pas impacté (chaque montant individuel reste sous le seuil), mais **500 DH/mois/parent** et **5 000 DH/mois/ado** deviennent contournables. Blast radius réel : un parent peut multiplier artificiellement le plafond mensuel (ex. 2 requêtes simultanées de 490 DH quand il reste 490 DH de MTD → crédit ~980 DH, dépassement de ~490 DH). C'est aussi une exposition réglementaire (BAM Circular 6/W/2017, palier faiblement KYC).

- **Recommandation :**
  - **P0** — Poser un verrou advisory transactionnel au début du RPC (avant l'appel à `_check_topup_caps`) : `pg_advisory_xact_lock(hashtext('top_up:' || p_parent_id))` + `hashtext('top_up_teen:' || p_teen_id)`. Cela sérialise les top-ups par parent (et par ado) sans bloquer toute la table.
  - **P0 alternatif** — Promouvoir l'isolation de la transaction appelante en `SERIALIZABLE` côté route (le RPC lui-même ne peut pas forcer l'isolation de l'appelant, mais un `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE` dans un bloc englobant fonctionne).
  - Refaire le `SELECT SUM ... FOR UPDATE` n'aiderait pas seul (les lignes succeeded déjà validées ne sont pas verrouillables d'une manière qui empêcherait l'insertion concurrente). Le verrou advisory est la solution canonique.

---

### F2. Contournement des plafonds via l'overload 3-arg (`psp_reference=NULL`) — 🔴 Vulnérabilité

- **Description :** L'overload 3-arg `top_up_teen(p_parent_id, p_teen_id, p_amount_dh)` (179:141-250) insère systématiquement `psp_provider='manual', psp_reference=NULL` (179:203). La logique d'idempotence du 5-arg (179:281-294) ne se déclenche que `WHEN p_provider_ref IS NOT NULL` — donc le 3-arg **n'a aucun mécanisme de déduplication** : chaque appel insère une nouvelle ligne `payment_transactions` succeeded et crédite `user_coins` à nouveau.

  **Ce n'est pas un code mort.** Le 3-arg est appelé en production par deux chemins vivants :
  1. `disburse_allowance` (`054_allowance_savings.sql:452`) — le cron de versement d'argent de poche, appelé via `/api/cron/disburse-allowances`.
  2. `_savings_match_trigger` (`054_allowance_savings.sql:550`) — trigger de match parental sur verrouillage épargne.

  Ces deux chemins passent donc par la version **sans idempotence**. Le 3-arg applique bien `_check_topup_caps` (179:193), mais (combiné au F1) sans verrou, et surtout : un re-déclenchement du trigger de match (par exemple si une contribution est re-insérée après rollback partiel, ou un retry cron) peut produire des crédits multiples sans dédoublonnage.

  Note de surface d'attaque : post-migration 112 (`112_security_hardening_rpc_rls.sql`), l'overload 3-arg n'est exécutable que par `service_role` (le `REVOKE ... FROM PUBLIC, anon, authenticated` cible par `p.proname = 'top_up_teen'`, toutes signatures confondues). Un utilisateur `authenticated` ne peut donc pas l'invoquer directement. Le risque est un mauvais comportement côté serveur (cron / trigger), pas une injection client.

- **Code concerné :**
  - `179_parental_limits_caps.sql:141-250` — overload 3-arg, `psp_reference=NULL` hardcoded.
  - `054_allowance_savings.sql:452` — appel 3-arg dans `disburse_allowance`.
  - `054_allowance_savings.sql:550` — appel 3-arg dans le trigger de match parental.
  - `093_manual_topup_requests.sql:118-128` — commentaire annonçant la rétrocompatibilité « keep the 3-arg overload ».

- **Risque :**
  - Absence totale d'idempotence sur le chemin allowance + savings match. Un cron qui tourne deux fois (ou un trigger qui se ré-exécute) crédite deux fois.
  - Combiné à F1 (pas de verrou), les plafonds F6 sont contournables même sur le chemin légitime, par concurrence.
  - Le `_savings_match_trigger` avale silencieusement les échecs (`RETURN NEW` sans log, 054:551-553) — un succès partiel laisse la base dans un état incohérent sans trace.

- **Recommandation :**
  - **P0** — Faire transiter `disburse_allowance` et `_savings_match_trigger` par le 5-arg avec un `provider_ref` déterministe (ex. `format('allowance:%s:%s', p_allowance_id, v_scheduled)` et `format('savings_match:%s:%s', NEW.goal_id, NEW.id)`). Le 5-arg dédupliera alors naturellement.
  - **P1** — Soit déprécier formellement le 3-arg (`DROP FUNCTION` + migration des 2 appelants), soit lui ajouter le même check d'idempotence que le 5-arg en gardant `psp_reference=NULL` interdit (rejeter `NULL` côté 3-arg et forcer un ref synthétique).
  - Ajouter un log d'audit (`audit_log` insert) dans le `_savings_match_trigger` quand `top_up_teen` retourne `success=false`.

---

### F3. Cohérence de la couche d'idempotence — 🟡 À surveiller

- **Description :** Deux mécanismes d'idempotence coexistent avec des clés différentes :
  1. **Route** (`app/api/parent/topup/route.ts:145-173`) : déduplication sur `payment_transactions.client_idempotency_key` (UUID fourni par le client) — vérifiée AVANT l'appel RPC.
  2. **RPC** (`179:281-294`) : déduplication sur `(psp_provider, psp_reference)` — vérifiée à l'intérieur du RPC.

  La clé `client_idempotency_key` est attachée à la ligne **après** le retour du RPC (`route.ts:228-236`), via un `UPDATE payment_transactions ... SET client_idempotency_key = ... WHERE id = rpcData.payment_id`. Il existe donc une fenêtre temporelle (entre le COMMIT du RPC et le `UPDATE` d'attachement) durant laquelle :
  - Une requête concurrente avec la **même** `client_idempotency_key` verrait la pré-vérification de la route échouer à trouver la ligne (la clé n'est pas encore posée) → elle appellerait le RPC → qui dédupliquerait via `psp_reference = 'manual:<key>'` → `idempotent_replay=true`. **Ce cas est donc couvert** par le recouvrement des deux mécanismes : le `provider_ref` construit comme `manual:${idempotencyKey}` (route.ts:178) garantit que la même clé client produit le même `psp_reference`.

  Cependant, deux angles morts subsistent :
  - **Clé client nouvelle mais provider/ref déjà existant** : un client malveillant (ou un bug) envoie une nouvelle `client_idempotency_key` mais un `provider_ref` déjà utilisé. La route passe la pré-vérification (clé nouvelle), le RPC déduplique et renvoie `idempotent_replay=true` — pas de double crédit, mais la route ignore ce signal (`route.ts:207-220` ne traite que `rpcData.success`, pas `idempotent_replay`). Le client peut croire à un succès frais.
  - **Échec d'attachement de la clé** (`route.ts:233-235`) : si l'`UPDATE` échoue, le log `console.error` mais la réponse 200 est quand même renvoyée. Les retries futurs avec la même `client_idempotency_key` ne dédupliqueront **pas** côté route (clé absente) — mais dédupliqueront côté RPC via `psp_reference`. Couverture résiduelle OK, mais fragile.

- **Code concerné :**
  - `app/api/parent/topup/route.ts:145-173` (pré-check client_idempotency_key).
  - `app/api/parent/topup/route.ts:178` (`providerRef = manual:${idempotencyKey}`).
  - `app/api/parent/topup/route.ts:228-236` (attachement post-RPC, non fatal).
  - `179_parental_limits_caps.sql:281-294` (dédup RPC).
  - `lib/payments/psp-webhook.ts:161-179` (dédup provider/ref côté webhook).

- **Risque :** Faible en double-crédit réel (recouvrement effectif via `psp_reference`), mais la double source de vérité crée une surface de confusion. Si un futur changement supprime le lien `providerRef = manual:${key}` (par exemple en générant un ref côté PSP), la protection par recouvrement disparaît.

- **Recommandation :**
  - **P1** — Faire écrire `client_idempotency_key` directement par le RPC (ajouter un 6e paramètre `p_idempotency_key text DEFAULT NULL` au 5-arg, inséré en même temps que la ligne). Cela rend l'attachement atomique avec la création de la ligne.
  - **P2** — Surfaces d'erreur : si `rpcData.idempotent_replay === true`, retourner explicitement un 200 `idempotent_replay` côté route (aujourd'hui traité comme un succès frais).

---

### F4. Contournement du gate e-signature pour appels service_role — 🟢 OK

- **Description :** Le gate e-signature (179:183-190 et 179:307-314) effectue `SELECT id FROM e_signatures WHERE parent_id = p_parent_id AND terms_accepted = true`. La vérification d'identité du caller (179:159-161 et 179:269-271) autorise les appels `service_role` (`auth.uid() IS NULL`) à passer le check d'identité parent — c'est intentionnel (les routes serveur déjà authentifiées délèguent au RPC).

  Trace : le gate e-signature est **indépendant** du gate d'identité. Il utilise `p_parent_id` (le paramètre), pas `auth.uid()`. Donc même un appel service_role doit fournir un `p_parent_id` pour lequel une ligne `e_signatures(parent_id=p_parent_id, terms_accepted=true)` existe. Le gate n'est PAS contournable par les appels service_role — sauf si le caller ment sur `p_parent_id`, mais le check de lien `parent_teen_links` (179:171-178 / 179:298-305) empêche alors le crédit (le teen doit être lié au parent déclaré).

- **Code concerné :** `179:183-190`, `179:307-314` (gate), `179:171-178` / `179:298-305` (lien parent-teen).

- **Risque :** Néant sur ce point précis. Le gate est robuste.

- **Recommandation :** Aucune. Bonne pratique confirmée.

---

### F5. Périmètre `SECURITY DEFINER` — 🟢 OK

- **Description :** `top_up_teen` (les deux overloads) et `_check_topup_caps` sont `SECURITY DEFINER` (tournent sous l'owner). Canon §6 FORBIDDEN #10 interdit tout `GRANT EXECUTE` sur un RPC money-write à `PUBLIC`/`anon`/`authenticated` sans gate `auth.uid()` strict.

  Vérification des grants :
  - `093_manual_topup_requests.sql:243` accorde `top_up_teen(5-arg) TO authenticated, service_role`.
  - `112_security_hardening_rpc_rls.sql:42-51` exécute `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated` pour **tous** les `p.proname = 'top_up_teen'` (donc 3-arg ET 5-arg), puis `GRANT ... TO service_role`.

  Post-112, seul `service_role` peut appeler `top_up_teen`. Les routes serveur (`app/api/parent/topup`, `app/api/admin/topups/[id]/confirm`, `lib/payments/psp-webhook`) utilisent toutes `createServiceRoleClient()` — cohérent.

  Tables money (`user_coins`, `coin_transactions`, `escrow_ledger`, `payment_transactions`) : le RPC peut y écrire car il est `SECURITY DEFINER`. Un `authenticated` normal ne le pourrait pas directement (RLS write-deny par absence de policy). Le périmètre est donc correct : l'escalade de privilège passe uniquement par les RPC désignés, eux-mêmes derrière `service_role`.

- **Code concerné :** `112_security_hardening_rpc_rls.sql:42-51`, `093_manual_topup_requests.sql:243`.

- **Risque :** Faible. Le seul vecteur résiduel serait une fuite de la clé `service_role` côté serveur (hors scope RPC).

- **Recommandation :**
  - **P2** — Confirmer que l'owner du schéma (rôle qui exécute les `SECURITY DEFINER`) n'est **pas** un superuser Postgres. Si l'owner est `postgres` (superuser), créer un rôle dédié restreint (`nivy_rpc_owner`) et transférer la propriété des fonctions money-write à ce rôle. Cela limite le blast radius en cas de bug dans le RPC.

---

### F6. Auto-relèvement de plafond via `parental_limits` — 🟢 OK

- **Description :** `_check_topup_caps` (179:83-104) résout les plafonds en lisant `parental_limits` (override par parent/ado) puis `xp_payment_settings` (défaut global) puis un dur. La question : un parent peut-il écrire dans `parental_limits` pour s'auto-relèver son plafond F6 ?

  RLS sur `parental_limits` (179:60-64) :
  - `ENABLE ROW LEVEL SECURITY`.
  - Une seule policy : `parental_limits_parent_read FOR SELECT TO authenticated USING (parent_id = auth.uid())`.
  - **Aucune** policy INSERT/UPDATE/DELETE → deny-default pour `authenticated`. Seul `service_role` bypass (bypass RLS implicite).

  Donc un parent ne peut ni insérer ni modifier une ligne `parental_limits`. Le relèvement F6 exige le process post-KYC côté serveur, conformément au commentaire canon (179:24-25). La `CHECK` constraint `max_single_topup_dh > 0` (179:47) empêche en outre les valeurs négatives.

- **Code concerné :** `179:43-64`.

- **Risque :** Néant. Conception saine.

- **Recommandation :** Aucune. Documenter ce verrou dans le runbook KYC pour éviter qu'un futur contributeur n'ajoute accidentellement une policy UPDATE parentale.

---

### F7. Gestion du timezone au bornage de mois — 🟢 OK

- **Description :** Le MTD utilise `date_trunc('month', (now() AT TIME ZONE 'Africa/Casablanca'))` (179:111) comme borne inférieure, et filtre `WHERE (created_at AT TIME ZONE 'Africa/Casablanca') >= v_month_start` (179:116, 179:126).

  Analyse sémantique :
  - `now()` renvoie `timestamptz` (UTC).
  - `now() AT TIME ZONE 'Africa/Casablanca'` convertit en `timestamp` (sans timezone) exprimé en heure locale Casablanca.
  - `date_trunc('month', ...)` produit le 1er du mois à `00:00:00` **heure locale** (type `timestamp`).
  - `created_at AT TIME ZONE 'Africa/Casablanca'` : `created_at` est `timestamptz` ; `AT TIME ZONE` convertit en `timestamp` local. La comparaison `timestamp >= timestamp` est donc cohérente (les deux en heure locale).

  Cas limite (31 du mois, 23:59 heure Casablanca = 22:59 UTC en hiver, 23:59 UTC pourrait déjà être le 1er en UTC mais pas en local) : comme les deux bornes passent par `AT TIME ZONE 'Africa/Casablanca'`, le bornage reste ancré sur l'heure locale. Aucun risque de mauvais comptage au passage de mois.

  Le Maroc n'observe pas de DST stable (l'heure d'été a été abolie en 2018 puis occasionnellement réintroduite pour le Ramadan) — `Africa/Casablanca` dans la tzdata reflète les règles actuelles. Faible risque opérationnel mais pas un bug.

- **Code concerné :** `179:111`, `179:116`, `179:126` (et `179:439, 179:444` pour le cap de dépense F49, même pattern correct).

- **Risque :** Néant sur la logique de conversion.

- **Recommandation :** Aucune. Bonne pratique (canon lifestyle anchor respectée).

---

### F8. Validation du montant (`p_amount_dh`) — 🟡 À surveiller

- **Description :** Côté RPC (3-arg 179:163-165 et 5-arg 179:273-275), le seul check est `p_amount_dh IS NULL OR p_amount_dh <= 0`. Aucun plafond supérieur serveur au-delà du plafond F6 (200 DH/op). Conséquences :
  - **Précision décimale :** la colonne est `numeric(10,2)` → un montant comme `200.005` est arrondi/tronqué par Postgres sans erreur. La route arrondit à 2 décimales (`route.ts:101`, `Math.round(amountDh * 100) / 100`) — cohérent côté route, mais le RPC seul n'arrondit pas.
  - **NaN / Infinity :** si `p_amount_dh` était passé comme `NaN` (en pratique impossible via le cast numeric du RPC depuis un `text` JSON, Postgres lèverait une erreur), la conversion `::integer` (179:168 / 179:296) échouerait. OK.
  - **Valeur très grande :** `numeric(10,2)` accepte jusqu'à 99 999 999.99 DH. Un montant de 99 999 999.99 DH passerait le `> 0` et serait seulement stoppé par `_check_topup_caps` (cap single 200 DH). Si le cap single était un jour relevé à NULL ou très haut (override parental), rien côté RPC ne borne le montant.
  - **Conversion coins :** `(p_amount_dh * 100)::integer` (179:168 / 179:296) — pour un montant `0.009 DH`, `(0.009 * 100)::integer = 0::integer`, ce qui créditerait 0 coin tout en insérant une ligne succeeded. Le `> 0` est sur `p_amount_dh`, pas sur `v_amount_coins`. Un montant entre 0 et 0.01 DH crédite 0 coin mais crée une ligne de paiement + escrow. Mineur mais incohérent.

  Côté route, un garde-fou existe : `PARENT_TOPUP_MAX_DH` (route.ts:91-99, `lib/payments/topup-packages`) borne le montant côté parent. Mais le chemin admin (`confirm/route.ts`) ne borne pas — il passe `reqRow.amount_dh` tel quel au RPC. Et le webhook PSP passe `event.amountDh` sans borne.

- **Code concerné :** `179:163-165`, `179:168`, `179:273-275`, `179:296` (RPC) ; `route.ts:30,91-101` (route parent) ; `confirm/route.ts:146` (admin, sans borne).

- **Risque :** Faible en exploitation (les caps F6 interceptent), mais la défense en profondeur est inégale selon le chemin d'appel.

- **Recommandation :**
  - **P1** — Ajouter dans le RPC, juste après le check `> 0`, un guard `v_amount_coins <= 0 THEN RETURN ... 'invalid_amount'` pour couvrir la précision sous-coin.
  - **P2** — Borner `p_amount_dh` côté RPC par une constante dure (ex. 10 000 DH) indépendante des overrides, en plus du cap F6.
  - **P2** — Borner côté admin confirm et côté webhook (les deux chemins non-parents n'appliquent pas `PARENT_TOPUP_MAX_DH`).

---

## Bonnes pratiques observées

1. **Atomicité par transaction unique :** tout le crédit (payment_transactions → escrow_ledger → user_coins → coin_transactions) est dans un seul bloc `SECURITY DEFINER`, avec `EXCEPTION WHEN OTHERS THEN` qui déclenche un rollback automatique (179:246-249, 179:367-369). Pas de credit partiel.
2. **Gate e-signature non contournable** par service_role (F4).
3. **RLS deny-default sur `parental_limits`** — un parent ne peut pas s'auto-relèver (F6).
4. **Déduplication provider/ref côté RPC** (5-arg) qui couvre le webhook PSP (retry idempotent, 179:281-294).
5. **Taux 1 DH = 100 coins calculé serveur** (179:168, 179:296), jamais trusté du client — conforme canon §6 FORBIDDEN #3.
6. **parentId issu de la session** côté route (`route.ts:104`), jamais du body.
7. **Recouvrement d'idempotence** entre `client_idempotency_key` (route) et `psp_reference='manual:<key>'` (RPC) — même si l'attachement post-RPC est fragile (F3), la redondance protège effectivement.

---

## Recommandations prioritaires

### P0 — Bloquant (à traiter avant activation du flow DH réel)

- **F1.a** Poser `pg_advisory_xact_lock(hashtext('topup:' || p_parent_id))` au début des deux overloads, avant l'appel à `_check_topup_caps`. Sérialise les top-ups concurrents par parent sans bloquer la table entière.
- **F1.b** Réévaluer `_check_topup_caps` APRÈS la pose du verrou advisory, ou rendre la fonction non-`STABLE` pour qu'elle lise dans le snapshot courant post-verrou.
- **F2.a** Faire transiter `disburse_allowance` (`054:452`) et `_savings_match_trigger` (`054:550`) par le 5-arg avec un `provider_ref` déterministe, pour bénéficier de l'idempotence provider/ref.
- **F2.b** Logger dans `audit_log` tout échec silencieux du trigger de match épargne (`054:551-553`).

### P1 — Important

- **F3.a** Ajouter `p_idempotency_key text DEFAULT NULL` au 5-arg et l'insérer atomiquement avec la ligne `payment_transactions` (supprimer l'`UPDATE` post-RPC de la route).
- **F8.a** Ajouter un guard `v_amount_coins <= 0` côté RPC.
- **F8.b** Borner `p_amount_dh` par une constante dure côté RPC (ex. 10 000 DH), indépendante des overrides.

### P2 — Défense en profondeur

- **F5.a** Transférer la propriété des fonctions money-write à un rôle `nivy_rpc_owner` non-superuser.
- **F3.b** Côté route, distinguer `rpcData.idempotent_replay === true` (réponse 200 explicite) d'un succès frais.
- **F8.c** Borner `amount_dh` côté admin confirm et côté webhook PSP (les chemins non-parents n'appliquent pas `PARENT_TOPUP_MAX_DH`).
- **F2.c** Déprécier formellement le 3-arg (`DROP FUNCTION` après migration des 2 appelants).

---

*Fin de l'audit. Document généré le 2026-07-13 — lecture seule, aucune modification de code effectuée.*
