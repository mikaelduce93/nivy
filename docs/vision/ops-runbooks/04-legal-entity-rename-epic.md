# Runbook 04 — Brief Epic « Renommage légal SARL → Nivy »

> **Statut**: Brief stratégique (1 page). À transformer en epic complet UNIQUEMENT si le fondateur décide de renommer formellement la SARL.
> **Préalable**: avoir exécuté `02-legal-entity-check.md` et confirmé que la dénomination actuelle est différente de "Nivy SARL".

---

## Pourquoi (et pourquoi pas) renommer la SARL

**Pour** :

- Cohérence absolue marque ↔ entité (zéro friction client/banque/partenaire).
- Simplifie KYB partenaires (e-monnaie BAM, restaurants, mentors) — un seul nom.
- Élimine le besoin permanent du caveat « Nivy est une marque exploitée par X SARL ».
- Conditions plus favorables si la levée seed/Series A vise des fonds qui notent la « brand clarity ».

**Contre** :

- Coût et délai (voir tableau).
- Risque opérationnel : pendant 2-3 semaines de transition, double-naming sur factures, bons de commande, contrats en cours.
- Tous les contrats (clients, fournisseurs, employés, bail) nécessitent un avenant ou une notification.
- Nouveau RC + ICE = nouveau set de tampons, nouveaux KBIS, mise à jour bancaire.

**Alternative pragmatique** : conserver l'entité légale historique + déposer **"Nivy"** comme marque commerciale à l'OMPIC (~3 000 DH, 2-4 mois) et utiliser `legalAttribution()` du fichier `_brand-source.ts`. Coût ~10x inférieur, effet juridique équivalent pour la protection de marque.

---

## Procédure de renommage (Maroc, SARL)

### Étape 1 — Décision interne (J0, ~1 h)

- Convoquer une **Assemblée Générale Extraordinaire (AGE)** des associés (préavis 15 jours selon statuts).
- Quorum : 75 % du capital (sauf clause statutaire dérogatoire).
- Objet de l'AGE : modification de l'article des statuts portant dénomination sociale.

### Étape 2 — PV d'AGE + statuts modifiés (J+15, ~3 000 DH)

- Notaire OU avocat : rédige le procès-verbal de l'AGE et les statuts à jour.
- Coût : 2 000 - 5 000 DH selon notaire.
- Output : PV signé par tous les associés + statuts mis à jour, paginés et signés.

### Étape 3 — Enregistrement fiscal (J+20, ~200 DH + droits)

- Dépôt du PV + statuts à la **Direction Générale des Impôts (DGI)**, recette de l'enregistrement.
- Droits d'enregistrement : 200 DH (acte modificatif) + droits proportionnels nuls puisque pas de modification de capital.
- Délai : 30 jours après l'AGE (sinon majoration de 15 % par mois de retard).

### Étape 4 — Modification au Registre du Commerce (J+25, ~150 DH)

- Dépôt au **greffe du tribunal de commerce** (lieu d'immatriculation, p.ex. Casablanca) :
  - PV d'AGE enregistré
  - Statuts mis à jour enregistrés
  - Formulaire modèle 2 (modification)
  - Justificatifs identité gérant
- Frais : ~150 DH timbres + 200 DH publication.
- Délai de traitement : 5-15 jours ouvrés.
- Output : nouvel **extrait analytique du RC** au nom de Nivy SARL.

### Étape 5 — Publications légales (J+25, ~1 500 DH)

- Insertion dans un **journal d'annonces légales** (*Al Bayane*, *L'Économiste*, etc.) : ~800 DH.
- Insertion au **Bulletin Officiel** (Section Annonces légales, judiciaires et administratives) : ~700 DH.
- Délai : 1-2 semaines après dépôt.
- Output : preuve de publication (à conserver dans le dossier juridique).

### Étape 6 — Mise à jour ICE / OMPIC (J+30, gratuit)

- L'attestation ICE est mise à jour automatiquement par l'OMPIC suite à la publication BO.
- Vérifier sur https://search.ompic.ma sous 4-6 semaines.

### Étape 7 — Mises à jour opérationnelles (J+30 à J+45)

| Action                                         | Responsable    | Délai      |
| ---------------------------------------------- | -------------- | ---------- |
| Mise à jour compte bancaire (carte signature)  | Gérant + banque| 1-2 semaines|
| Mise à jour KYB e-monnaie (BAM partner)        | Ops            | 1 semaine  |
| Avenant bail commercial                        | Bailleur       | À négocier |
| Notification clients & partenaires             | Sales / Ops    | 1 semaine  |
| Mise à jour CGV/CGU/mentions légales           | Dev            | 1 jour     |
| Réimpression factures, en-têtes, tampons       | Admin          | 1 semaine  |
| Mise à jour contrats employés (DRH)            | DRH            | 2 semaines |
| Mise à jour CNSS / CNOPS / AMO                 | DRH            | 1 mois     |

---

## Estimation totale

| Poste                          | Coût (DH)     | Délai      |
| ------------------------------ | ------------- | ---------- |
| AGE + statuts (notaire/avocat) | 2 000 - 5 000 | J+15       |
| Enregistrement DGI             | 200           | J+20       |
| Greffe RC                      | ~350          | J+25       |
| Publications légales           | ~1 500        | J+25       |
| Banque / KYB / divers admin    | 1 000 - 3 000 | J+45       |
| **TOTAL**                      | **5 050 - 10 050 DH** | **3-6 semaines (calendaires)** |

**Effort interne** : ~15-25 heures fondateur + ~10 heures DRH/Ops sur la fenêtre.

---

## Décision recommandée

| Situation actuelle                                                         | Recommandation                                                              |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Pré-revenu, < 50 utilisateurs, pas de partenaires payants                   | **Garder l'entité, exploiter Nivy comme marque** (alternative ci-dessus)    |
| Revenu mensuel > 50 k DH, > 5 partenaires, levée < 6 mois                   | **Renommer formellement** (pour clarté investisseurs / banque)              |
| Levée Series A en cours, due diligence active                               | **Renommer formellement, urgence** (faire intervenir l'avocat de la levée)  |

---

**Fin du runbook 04.**
