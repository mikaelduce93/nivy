# Runbook 02 — Vérification de l'entité légale (SARL enregistrée)

> **Sub-agent**: Ops-C
> **Contexte**: Wave δ G1 (commit `968cd3a`) a remplacé "Teens Party Morocco SARL" par "Nivy SARL" dans `app/legal/mentions-legales/page.tsx` et la marque consommateur sur d'autres pages légales. **Cette substitution n'est valide que si la SARL a effectivement été renommée à l'OMPIC / au RC.** Sinon, les mentions légales sont juridiquement fausses.

---

## 1. Pourquoi c'est critique

En droit marocain (Code de commerce, art. 27 + Loi 17-95 sur les SAS/SARL), **la dénomination sociale figurant sur les documents commerciaux doit être strictement identique à celle inscrite au Registre du Commerce (RC)**. Les mentions légales et CGV/CGU sont des "documents commerciaux" au sens de la loi.

**Conséquences d'un mismatch entre la marque affichée et la SARL enregistrée :**

- **Mentions légales invalides** : sanction CNDP possible (jusqu'à 300 000 MAD pour défaut d'identification du responsable de traitement).
- **CGV inopposables** : un client qui conteste un achat peut invoquer la nullité du contrat car le vendeur n'est pas correctement identifié (Cour d'appel Casablanca, jurisprudence constante).
- **Risque fiscal** : l'administration fiscale (DGI) peut requalifier la facturation si le nom commercial sur les factures ne correspond pas à la dénomination sociale ICE.
- **Risque bancaire** : la banque (titulaire du compte au nom de la SARL enregistrée) peut refuser des virements ou prélèvements émis "au nom de Nivy" si Nivy n'est pas une entité enregistrée.
- **Risque AML / e-monnaie** : le partenaire e-monnaie agréé BAM exige une concordance stricte entre le bénéficiaire technique (compte) et la raison sociale dans le KYB.

**Marque consommateur ≠ entité légale.** Il est tout à fait courant qu'une SARL "Teens Party Morocco SARL" exploite une marque commerciale "Nivy" — à condition que :

1. La marque "Nivy" soit déposée à l'OMPIC au nom de la SARL (ou licenciée à elle).
2. Les mentions légales mentionnent **les deux** : `Nivy® est une marque exploitée par Teens Party Morocco SARL`.

C'est cette approche qui sera codifiée dans `app/legal/_brand-source.ts` (voir runbook `03`).

---

## 2. Trois chemins de vérification

### Chemin 1 — Rapide & gratuit (5 min)

**OMPIC en ligne** : https://search.ompic.ma

1. Aller sur https://search.ompic.ma → onglet **"Recherche d'entreprise"**.
2. Chercher d'abord **"Teens Party Morocco"** (la dénomination historique présumée).
3. Si le résultat existe : noter le numéro RC, l'ICE, le siège social, la date d'immatriculation. **C'est le nom légal actuel.**
4. Chercher ensuite **"Nivy"** : si rien n'apparaît, la SARL n'a pas été renommée.

**Limites** : la base OMPIC en ligne est mise à jour avec un délai de quelques semaines après les modifications statutaires. Une recherche infructueuse n'est donc pas définitive.

**Output attendu** : capture d'écran du résultat OMPIC + valeurs `RC` / `ICE` / `siège` à reporter dans `app/legal/_brand-source.ts`.

### Chemin 2 — Fiable (30 min, 0 DH)

**Appeler le comptable / fiduciaire** qui tient les comptes de la SARL.

Le comptable a **obligatoirement** :

- L'extrait K-bis marocain (modèle 7) le plus récent.
- Les statuts à jour (avec mentions des éventuelles AG extraordinaires modificatives).
- L'attestation ICE.

**Question à poser** :
> "Quelle est la dénomination sociale exacte inscrite au RC actuellement ? A-t-on déposé un PV d'AG modifiant la dénomination en 'Nivy SARL' au tribunal de commerce ? Si oui, à quelle date la modification a-t-elle été publiée au Bulletin Officiel ?"

**Output attendu** : copie scannée de l'extrait RC daté de moins de 3 mois.

### Chemin 3 — Définitif (½ journée, ~50 MAD)

**Extrait RC en personne au tribunal de commerce** (Casablanca, ou ville d'immatriculation) :

1. Se rendre au greffe du tribunal de commerce compétent avec une CIN.
2. Demander un **"extrait analytique du registre du commerce"** (modèle 7) — délivré sous 20 minutes au guichet pour ~50 MAD en timbres fiscaux.
3. Vérifier : dénomination, capital, RC, ICE, gérant, siège, objet social, date des dernières modifications statutaires.

**C'est la source de vérité juridique opposable.** Toute autre source (OMPIC en ligne, attestations comptables) en découle.

---

## 3. Arbre de décision

```
                ┌──────────────────────────────────┐
                │ Quelle dénomination figure       │
                │ sur l'extrait RC actuel ?        │
                └──────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
 "Teens Party          "Nivy SARL"           Autre nom
  Morocco SARL"                              (ex. ancienne
                                              raison sociale)
        │                     │                     │
        ▼                     ▼                     ▼
 ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
 │ Action :     │      │ Action :     │      │ Action :     │
 │ exécuter     │      │ AUCUNE.      │      │ ouvrir epic  │
 │ runbook 03   │      │ Le commit    │      │ "Renommage   │
 │ (revert) +   │      │ 968cd3a est  │      │ légal SARL"  │
 │ ajouter le   │      │ correct.     │      │ (runbook 04) │
 │ brand-source │      │ Documenter   │      │ + revert     │
 │ TS constant. │      │ le RC + ICE  │      │ temporaire   │
 │              │      │ dans         │      │ (runbook 03) │
 │              │      │ _brand-      │      │ pour aligner │
 │              │      │ source.ts.   │      │ le frontend  │
 │              │      │              │      │ sur le nom   │
 │              │      │              │      │ existant.    │
 └──────────────┘      └──────────────┘      └──────────────┘
```

---

## 4. Champs à renseigner dans `app/legal/_brand-source.ts`

Une fois la vérification faite (peu importe le chemin), reporter ces valeurs **canoniques** dans le fichier source de vérité :

| Champ                  | Source                | Exemple                                  |
| ---------------------- | --------------------- | ---------------------------------------- |
| `LEGAL_ENTITY_NAME`    | Extrait RC, champ 1   | `Teens Party Morocco SARL` ou `Nivy SARL`|
| `LEGAL_ENTITY_FORM`    | Extrait RC, champ 2   | `Société à Responsabilité Limitée`       |
| `LEGAL_RC_NUMBER`      | Extrait RC, champ 3   | `123456` (Casablanca)                    |
| `LEGAL_ICE_NUMBER`     | Attestation ICE       | `001234567000089`                        |
| `LEGAL_CAPITAL_MAD`    | Statuts, art. capital | `100000`                                 |
| `LEGAL_HEADQUARTERS`   | Extrait RC, champ siège | `12 rue X, Casablanca`                |
| `LEGAL_DIRECTOR_NAME`  | Extrait RC, gérant    | `M. ...`                                 |
| `CONSUMER_BRAND_NAME`  | Marque commerciale    | `Nivy`                                   |
| `CONSUMER_BRAND_TLD`   | DNS                   | `nivy.ma`                                |

> **Tip** : pour rendre le mismatch impossible à l'avenir, importer ces constantes dans **toutes** les pages légales (mentions, CGV, CGU, confidentialité) au lieu de hardcoder.

---

## 5. Estimation de temps fondateur

| Chemin                          | Temps fondateur | Coût  | Fiabilité          |
| ------------------------------- | --------------- | ----- | ------------------ |
| 1 — OMPIC en ligne              | 5-10 min        | 0 DH  | Indicative         |
| 2 — Appel comptable             | 30 min          | 0 DH  | Élevée             |
| 3 — Extrait RC tribunal         | 2-4 h (déplacement) | ~50 DH | Définitive (preuve juridique) |

**Recommandation** : faire **chemin 1** maintenant (5 min) → si la dénomination est ambiguë ou absente, faire **chemin 2** dans la journée → si le comptable n'est pas sûr, faire **chemin 3** dans la semaine.

---

## 6. Suite

- Si revert nécessaire → exécuter `docs/vision/ops-runbooks/03-legal-entity-revert.sh` (mode `--dry-run` d'abord).
- Si renommage formel souhaité → consulter `docs/vision/ops-runbooks/04-legal-entity-rename-epic.md` pour l'estimation effort/coût.
- Dans tous les cas, **créer le fichier `app/legal/_brand-source.ts`** pour structurer la séparation marque / entité légale.

---

**Fin du runbook 02.**
