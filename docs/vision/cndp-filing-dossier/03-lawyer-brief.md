# Brief avocat — Dépôt CNDP Nivy

> **Destinataire :** conseil juridique en charge de la conformité données personnelles.
> **Émetteur :** fondateur Nivy.
> **Objet :** mission de revue, validation et soumission du dossier CNDP.
> **Date :** 2026-05-08.
> **Documents joints :** `01-registre-des-traitements.md` et `02-declaration-cndp-form.md` (présent dans `docs/vision/cndp-filing-dossier/`).

---

## 1. Contexte business (5 lignes)

Nivy est une plateforme web (PWA) de gamification et de services lifestyle destinée aux adolescents marocains de 13 à 17 ans et à leurs parents. Elle combine une e-monnaie pré-payée (top-up DH par le parent → coins escrow → dépense chez partenaires), un système d'autorisation parentale per-action, et plusieurs surfaces lifestyle (transport, restauration, place de marché, mentorat, chores). L'infrastructure est hébergée sur Supabase (Frankfurt, UE) et Vercel (UE). Le lancement public V1 est prévu **<<TO_FILL — date cible>>**, conditionné à la finalisation du dossier CNDP. La société porteuse est en cours d'enregistrement / enregistrée sous la forme **<<TO_FILL — SARL ?>>** au RC de **<<TO_FILL — ville>>**.

---

## 2. Statut du filing demandé

Le dossier doit être soumis sous le **régime de l'autorisation préalable** (et non de la simple déclaration), au motif que le traitement :

1. concerne **systématiquement des mineurs de 13 à 17 ans** (Loi 09-08 art. 11 — à confirmer) ;
2. comporte de la **géolocalisation en temps réel de mineurs** (transport) ;
3. comporte du **profilage comportemental** à des fins de personnalisation (analytique) ;
4. comporte des **transferts de données hors Maroc** (Supabase / Vercel UE et Resend US).

**Question 1 au conseil.** Confirmer ou infirmer le régime de l'autorisation préalable plutôt que la simple déclaration. Identifier précisément l'article fondateur de la Loi 09-08 ou de ses décrets d'application qui s'applique.

---

## 3. Documents joints

| # | Document | Statut | Commentaire |
|---|---|---|---|
| 01 | `01-registre-des-traitements.md` | À valider | Registre interne conforme à l'art. 24 (à confirmer). 13 fiches couvrant l'intégralité des flux. |
| 02 | `02-declaration-cndp-form.md` | À valider et compléter | Pré-rempli sur les éléments techniques. **20+ champs `<<TO_FILL>>` à compléter par le fondateur** (état civil société, DPO, dates). |
| Politique de confidentialité publiée | `https://nivy.ma/legal/confidentialite` | À valider | Texte FR rédigé en langue accessible aux adolescents. |
| Audit sécurité pré-lancement | `docs/vision/audit-prelaunch/07-security-compliance.md` | Pour information | Audit interne mai 2026, fournit la base technique des mesures de sécurité déclarées. |

---

## 4. Questions précises au conseil

### 4.1 Régime applicable et qualification

- **Q1.** Confirmer le **régime d'autorisation préalable** (et non simple déclaration) compte tenu des mineurs + géolocalisation + profilage + transferts hors Maroc.
- **Q2.** Identifier les **articles précis de la Loi 09-08** applicables et corriger les références marquées « à confirmer » dans les documents 01 et 02 (notamment art. 11 mineurs, art. 12 base légale, art. 21 droit d'accès, art. 25 sous-traitance, art. 43 transferts hors zone adéquate).
- **Q3.** Confirmer si les **décrets d'application** (notamment décret n° 2-09-165) imposent des formalités spécifiques au-delà du dossier décrit ici.

### 4.2 Validation du registre des traitements

- **Q4.** Le registre comporte 13 fiches. Confirmer que la **granularité** est correcte (ni trop fine, ni trop grossière) au regard de la doctrine CNDP. Suggérer fusions ou éclatements si nécessaire.
- **Q5.** Pour chaque fiche, valider la **base légale** invoquée. En particulier pour T-12 (analytique comportementale de mineurs) : peut-on invoquer le consentement de l'adolescent assisté de son parent, ou faut-il une base spécifique compte tenu du profilage ?
- **Q6.** Valider les **durées de conservation** déclarées, notamment les 10 ans comptables et les 5 ans KYC : confirmer ou corriger en référence au Code de commerce et à la loi anti-blanchiment 43-05 (à confirmer).

### 4.3 Flows de consentement

- **Q7.** Le mécanisme d'**e-signature parentale + téléversement de la CIN** (table `e_signatures`) constitue-t-il un consentement valable au sens de la Loi 09-08 ? Si non, quelles modifications opérer ?
- **Q8.** Les CGU acceptées au moment de la signature parentale couvrent-elles **toutes les finalités du registre**, ou faut-il prévoir des consentements granulaires par finalité (par exemple, opt-in séparé pour la personnalisation comportementale et pour les notifications marketing) ?
- **Q9.** Quelle est la **valeur juridique de la CIN numérisée** comme preuve de l'identité du parent ? Faut-il en plus une vérification active (KBA / biométrie) ou la simple capture suffit-elle pour une plateforme grand public destinée aux mineurs ?

### 4.4 Transferts hors Maroc

- **Q10.** Les transferts vers **Supabase Frankfurt et Vercel UE** sont-ils dispensés de formalité au titre de l'adéquation de l'UE selon la doctrine CNDP, ou faut-il une **autorisation spécifique de transfert** (art. 43 — à confirmer) ?
- **Q11.** Pour le sous-traitant **Resend (États-Unis)** chargé des e-mails transactionnels : valider le mécanisme de transfert (clauses contractuelles types ? Data Privacy Framework ?) ou recommander un sous-traitant UE équivalent (Postmark UE, Mailjet FR, Mailgun UE) si la conformité US est trop lourde.
- **Q12.** Pour **Stripe** (si activé) : confirmer la conformité du transfert vers l'Irlande / les États-Unis.

### 4.5 Question particulière : enregistrement des sessions de mentorat (T-10)

> **CETTE FONCTIONNALITÉ EST EN ATTENTE DE DÉCISION FONDATEUR.**

Le bucket `mentor-recordings` est créé en base mais **aucune fonctionnalité d'enregistrement n'est encore active**. Trois options sont identifiées (voir registre T-10) :

- **Option A** : pas d'enregistrement, modération par signalement uniquement.
- **Option B** : enregistrement audio uniquement, conservation 30 jours, double consentement signé.
- **Option C** : enregistrement audio + vidéo, conservation 90 jours.

**Q13. (la plus importante)** Le conseil estime-t-il que l'option B ou C est défendable devant la CNDP au regard de la Loi 09-08 et du droit à l'image des mineurs ? Quelles garanties supplémentaires seraient exigées ?

**Q14.** Quel est le **droit d'accès** du parent à l'enregistrement de la session à laquelle son enfant a participé (Loi 09-08 art. 21 — à confirmer) ? Le parent peut-il exiger la copie ?

**Q15.** Si l'option A est retenue pour V1, recommander la rédaction d'un **engagement formel** dans le dossier CNDP indiquant qu'aucun enregistrement n'a lieu, et la formulation à utiliser pour ne pas se fermer la porte à une activation future en V2 (qui devrait alors faire l'objet d'une déclaration complémentaire).

### 4.6 DPO

- **Q16.** Recommander : DPO interne (à recruter) ou DPO externalisé (cabinet conseil ou avocat) ? Au vu de la taille initiale de l'équipe Nivy, l'option externalisée semble pragmatique. Quel coût attendre ?
- **Q17.** Le conseil peut-il assumer cette fonction ou recommander un confrère certifié ?

### 4.7 Procédure et délais

- **Q18.** Quel est le **délai d'instruction** prévisible de la CNDP pour une autorisation préalable de cette nature (mineurs + géolocalisation) ? Faut-il anticiper un échange itératif avec la CNDP, et si oui, sur quelle durée moyenne ?
- **Q19.** Peut-on **lancer la plateforme en bêta privée** (cercle restreint) avant l'autorisation finale, ou cela constituerait-il un manquement ?
- **Q20.** Quelle est la **procédure de dépôt** : portail télédéclaration de la CNDP, dépôt papier au siège (Rabat), via avocat ? Quel est le format imposé du dossier ?

### 4.8 Risques et sanctions

- **Q21.** Rappeler les **sanctions encourues** en cas de mise en service sans autorisation (administratives + pénales) afin que le fondateur prenne la mesure du risque.
- **Q22.** Existe-t-il une **procédure de mise en conformité accélérée** si la plateforme a déjà commencé à collecter des données (au cours d'une phase bêta) sans autorisation préalable formellement obtenue ?

---

## 5. Honoraires estimés

Sur la base des retours obtenus auprès du marché marocain et confirmés dans l'audit pré-lancement Nivy (`docs/vision/audit-prelaunch/07-security-compliance.md`) :

- **Constitution complète du dossier d'autorisation préalable + dépôt + suivi** : **15 000 à 30 000 DH HT**, selon la complexité du dossier, le nombre d'allers-retours avec la CNDP, et l'inclusion ou non de la rédaction des CGU et de la politique de confidentialité finale.
- **Mission DPO externalisée annuelle** : à part, à devis (estimation marché 30 000 à 80 000 DH HT / an).

Le fondateur est ouvert à un **forfait au dossier** plutôt qu'une facturation horaire, et apprécierait un devis détaillant la mission en livrables identifiés.

---

## 6. Identification du conseil — instructions de recherche au fondateur

> **Note importante :** ce brief n'inscrit volontairement aucun nom de cabinet ou d'avocat précis. Le marché marocain du droit des données personnelles est concentré et évolue rapidement ; recommander un nom non-vérifié ferait courir un risque de qualité au fondateur. À la place, suivre la procédure ci-dessous.

### 6.1 Profil recherché

- Avocat inscrit au **barreau de Casablanca ou de Rabat** (proximité avec la CNDP basée à Rabat).
- Spécialisation déclarée en : **droit du numérique**, **données personnelles / Loi 09-08**, **e-commerce**, **protection des consommateurs mineurs**.
- Idéalement : expérience documentée d'au moins **un dépôt CNDP réussi pour une plateforme grand public** au cours des 24 derniers mois.
- Apprécié : **certification CNDP** ou équivalent international (CIPP/E, CIPM, CDPSE).
- Capable de produire des livrables en français (et idéalement aussi en arabe).

### 6.2 Sources à consulter

- **Chambre des Avocats de Casablanca** : annuaire officiel, demander la liste des avocats déclarant la spécialité « droit du numérique » ou « propriété intellectuelle ».
- **Chambre des Avocats de Rabat** : idem.
- **LinkedIn** : recherche par mots-clés `data privacy lawyer Morocco`, `CNDP Loi 09-08`, `RGPD Maroc`, `avocat données personnelles Casablanca`. Filtrer sur cabinets à Casablanca ou Rabat.
- **Associations professionnelles** : AMDP (Association Marocaine pour la Protection des Données — si existante, à vérifier), AUSIM.
- **Recommandations entre fondateurs** : YC alumni Maroc, Outlierz Ventures, MITC Capital, MNF Ventures — leurs portfolios ont nécessairement eu à passer le filing CNDP.
- **Cabinets d'audit Big 4** au Maroc (PwC, EY, KPMG, Deloitte) — ils ont des praticiens privacy en interne ou des partenariats avec des cabinets d'avocats.

### 6.3 Critères d'évaluation lors du premier rendez-vous

- Demander **deux références** de dossiers CNDP traités, idéalement vérifiables.
- Demander une **estimation chiffrée** (en DH HT, forfait ou à l'heure) pour la mission complète.
- Demander un **calendrier indicatif** (préparation + dépôt + délai d'instruction).
- Évaluer la **maîtrise technique** : l'avocat doit comprendre les concepts de RLS, de bucket privé, de service-role, de transferts cloud — sans cela il sera difficile de constituer un dossier solide.
- Vérifier la **disponibilité** : est-il en mesure de répondre à une question CNDP dans la semaine ?

### 6.4 Engagement minimal recommandé

Demander un **devis pour deux missions distinctes** :

1. **Mission 1 — dépôt CNDP V1** (prix forfaitaire). Livrables : revue des documents 01 + 02, finalisation, dépôt, suivi jusqu'à l'autorisation.
2. **Mission 2 — DPO externalisé annuel** (prix mensuel ou annuel forfaitaire). Livrables : audits trimestriels, point de contact CNDP, revue de toute évolution majeure du traitement, formation interne annuelle.

---

## 7. Prochaines étapes côté fondateur

1. **Compléter** tous les champs `<<TO_FILL>>` du document 02 (état civil de la société, DPO, dates).
2. **Sélectionner** un avocat selon les critères de la section 6 — viser un premier RDV sous 7 jours.
3. **Produire** les pièces justificatives listées en partie L du document 02 (extrait modèle J, statuts, pièces d'identité).
4. **Décider** sur la fonctionnalité d'enregistrement des sessions de mentorat (T-10 / Q13-Q15) avant le RDV avec l'avocat.
5. **Anticiper** un délai de 6 à 12 semaines entre le dépôt du dossier et l'autorisation effective de la CNDP — caler le lancement public V1 en conséquence.

---

*Fin du brief.*
