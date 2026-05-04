# 🧪 TODO TESTS - Toutes les Tâches Tests

**Progression:** 0/60 tâches (0%)

---

## 📋 SECTION P0: CRITIQUE (MVP)

### 1. Tests E2E Parcours Critiques
**Fichier:** `tests/e2e/critical-flows.spec.ts`  
**Référence:** Voir `TODO_P0_CRITIQUE.md` Section 4.1

- [ ] Tâche 4.1.1 à 4.1.10 (voir TODO_P0_CRITIQUE.md)

---

## 📋 SECTION P1: IMPORTANT

### 2. Tests Unitaires Validation
**Fichier:** `tests/unit/validation/`  
**Durée:** 4-5h

- [ ] **Tâche 2.1:** Tests schemas Zod
  - [ ] Créer `tests/unit/validation/schemas.test.ts`
  - [ ] Tester validation email
  - [ ] Tester validation téléphone marocain
  - [ ] Tester validation date (âge 13-17)
  - [ ] Tester validation pseudo
  - [ ] Couverture > 80%

- [ ] **Tâche 2.2:** Tests sanitization
  - [ ] Créer `tests/unit/validation/sanitize.test.ts`
  - [ ] Tester protection XSS
  - [ ] Tester nettoyage HTML
  - [ ] Tester échappement caractères
  - [ ] Couverture > 80%

- [ ] **Tâche 2.3:** Tests edge cases
  - [ ] Tester valeurs limites
  - [ ] Tester valeurs invalides
  - [ ] Tester valeurs null/undefined
  - [ ] Tester formats incorrects

**Sous-total:** 4-5h

---

### 3. Tests Unitaires Utilitaires
**Fichier:** `tests/unit/utils/`  
**Durée:** 3-4h

- [ ] **Tâche 3.1:** Tests fonctions date
  - [ ] Créer `tests/unit/utils/date.test.ts`
  - [ ] Tester formatage dates
  - [ ] Tester calcul âge
  - [ ] Tester comparaisons dates
  - [ ] Couverture > 70%

- [ ] **Tâche 3.2:** Tests fonctions format
  - [ ] Créer `tests/unit/utils/format.test.ts`
  - [ ] Tester formatage prix (DH)
  - [ ] Tester formatage nombres
  - [ ] Tester formatage pourcentages
  - [ ] Couverture > 70%

- [ ] **Tâche 3.3:** Tests fonctions conversion
  - [ ] Tester conversion XP → DH
  - [ ] Tester calcul réductions
  - [ ] Tester calcul totaux
  - [ ] Couverture > 70%

**Sous-total:** 3-4h

---

### 4. Tests Unitaires Hooks React
**Fichier:** `tests/unit/hooks/`  
**Durée:** 3-4h

- [ ] **Tâche 4.1:** Tests use-mobile
  - [ ] Créer `tests/unit/hooks/use-mobile.test.tsx`
  - [ ] Tester détection mobile
  - [ ] Tester changement taille écran
  - [ ] Couverture > 70%

- [ ] **Tâche 4.2:** Tests use-toast
  - [ ] Créer `tests/unit/hooks/use-toast.test.tsx`
  - [ ] Tester affichage toast
  - [ ] Tester fermeture toast
  - [ ] Couverture > 70%

- [ ] **Tâche 4.3:** Tests use-window-size
  - [ ] Créer `tests/unit/hooks/use-window-size.test.tsx`
  - [ ] Tester détection taille fenêtre
  - [ ] Tester changement taille
  - [ ] Couverture > 70%

**Sous-total:** 3-4h

---

### 5. Tests Composants UI
**Fichier:** `tests/unit/components/`  
**Durée:** 6-8h

- [ ] **Tâche 5.1:** Tests Button
  - [ ] Créer `tests/unit/components/Button.test.tsx`
  - [ ] Tester rendu
  - [ ] Tester onClick
  - [ ] Tester variants
  - [ ] Tester disabled
  - [ ] Tests accessibilité

- [ ] **Tâche 5.2:** Tests Input
  - [ ] Créer `tests/unit/components/Input.test.tsx`
  - [ ] Tester rendu
  - [ ] Tester onChange
  - [ ] Tester validation
  - [ ] Tester erreurs
  - [ ] Tests accessibilité

- [ ] **Tâche 5.3:** Tests Card
  - [ ] Créer `tests/unit/components/Card.test.tsx`
  - [ ] Tester rendu
  - [ ] Tester variants
  - [ ] Tests accessibilité

- [ ] **Tâche 5.4:** Tests autres composants critiques
  - [ ] Tests Select
  - [ ] Tests Dialog
  - [ ] Tests Toast
  - [ ] Couverture > 60%

**Sous-total:** 6-8h

---

### 6. Tests E2E Complets
**Fichier:** `tests/e2e/`  
**Durée:** 15-20h

- [ ] **Tâche 6.1:** Tests parcours parent complets
  - [ ] Créer `tests/e2e/parent-flow.spec.ts`
  - [ ] Test: Gestion multi-enfants
  - [ ] Test: Top-up crédits
  - [ ] Test: Approbations
  - [ ] Test: Historique
  - [ ] Test: Budget limits

- [ ] **Tâche 6.2:** Tests parcours teen complets
  - [ ] Créer `tests/e2e/teen-flow.spec.ts`
  - [ ] Test: Gamification complète
  - [ ] Test: Leaderboard
  - [ ] Test: Shop XP
  - [ ] Test: Fortune Wheel
  - [ ] Test: Crews

- [ ] **Tâche 6.3:** Tests parcours ambassador
  - [ ] Créer `tests/e2e/ambassador-flow.spec.ts`
  - [ ] Test: Code parrainage
  - [ ] Test: Partage
  - [ ] Test: Commissions
  - [ ] Test: Retrait

- [ ] **Tâche 6.4:** Tests parcours partner
  - [ ] Créer `tests/e2e/partner-flow.spec.ts`
  - [ ] Test: Création offre
  - [ ] Test: Scanner QR
  - [ ] Test: Statistiques

- [ ] **Tâche 6.5:** Tests parcours admin
  - [ ] Créer `tests/e2e/admin-flow.spec.ts`
  - [ ] Test: Gestion événements
  - [ ] Test: Gestion clubs
  - [ ] Test: Gestion users
  - [ ] Test: Analytics

- [ ] **Tâche 6.6:** Tests paiements
  - [ ] Créer `tests/e2e/payments.spec.ts`
  - [ ] Test: Stripe (success, failed)
  - [ ] Test: CMI
  - [ ] Test: Mobile Money
  - [ ] Test: Paiement hybride XP

- [ ] **Tâche 6.7:** Tests responsive
  - [ ] Créer `tests/e2e/responsive.spec.ts`
  - [ ] Tester toutes pages sur mobile
  - [ ] Tester toutes pages sur tablette
  - [ ] Tester toutes pages sur desktop

- [ ] **Tâche 6.8:** Tests erreurs
  - [ ] Créer `tests/e2e/errors.spec.ts`
  - [ ] Test: Paiement échoué
  - [ ] Test: QR invalide
  - [ ] Test: Pseudo déjà pris
  - [ ] Test: Solde XP insuffisant

**Sous-total:** 15-20h

---

### 7. Tests de Charge
**Fichier:** `tests/load/` (à créer)  
**Durée:** 5-6h

- [ ] **Tâche 7.1:** Setup k6 ou Artillery
  - [ ] Installer outil
  - ] Configurer scripts
  - [ ] Préparer données
  - [ ] Documenter

- [ ] **Tâche 7.2:** Test charge APIs critiques
  - [ ] Test: `/api/bookings/create` (100 req/s)
  - [ ] Test: `/api/check-in/entry` (50 req/s)
  - [ ] Test: `/api/payments/process` (20 req/s)
  - [ ] Identifier goulots

- [ ] **Tâche 7.3:** Test charge DB
  - [ ] Test queries fréquentes
  - [ ] Vérifier temps < 200ms
  - [ ] Identifier queries lentes
  - [ ] Optimiser

- [ ] **Tâche 7.4:** Rapport et recommandations
  - [ ] Générer rapport
  - [ ] Identifier limites
  - [ ] Recommander optimisations
  - [ ] Documenter

**Sous-total:** 5-6h

---

### 8. Tests Accessibilité
**Fichier:** `tests/a11y/` (à créer)  
**Durée:** 4-5h

- [ ] **Tâche 8.1:** Setup axe-core
  - [ ] Installer `@axe-core/playwright`
  - [ ] Configurer tests
  - [ ] Intégrer dans E2E

- [ ] **Tâche 8.2:** Tests accessibilité pages critiques
  - [ ] Test: Page login
  - [ ] Test: Dashboard parent
  - [ ] Test: Dashboard teen
  - [ ] Test: Formulaire réservation
  - [ ] Corriger violations

- [ ] **Tâche 8.3:** Tests navigation clavier
  - [ ] Tester navigation Tab
  - [ ] Tester activation Enter
  - [ ] Tester focus visible
  - [ ] Corriger problèmes

- [ ] **Tâche 8.4:** Tests lecteur d'écran
  - [ ] Tester avec NVDA/JAWS
  - [ ] Vérifier labels ARIA
  - [ ] Vérifier structure sémantique
  - [ ] Corriger problèmes

**Sous-total:** 4-5h

---

### 9. Tests Performance
**Fichier:** `tests/performance/` (à créer)  
**Durée:** 4-5h

- [ ] **Tâche 9.1:** Tests Lighthouse
  - [ ] Automatiser tests Lighthouse
  - [ ] Tester toutes pages critiques
  - [ ] Vérifier score > 90
  - [ ] Corriger problèmes

- [ ] **Tâche 9.2:** Tests temps chargement
  - [ ] Mesurer First Contentful Paint
  - [ ] Mesurer Largest Contentful Paint
  - [ ] Mesurer Time to Interactive
  - [ ] Optimiser si nécessaire

- [ ] **Tâche 9.3:** Tests bundle size
  - [ ] Mesurer taille bundles
  - [ ] Identifier bundles trop gros
  - [ ] Optimiser code splitting
  - [ ] Vérifier améliorations

**Sous-total:** 4-5h

---

### 10. CI/CD Intégration
**Fichier:** `.github/workflows/`  
**Durée:** 3-4h

- [ ] **Tâche 10.1:** GitHub Actions tests unitaires
  - [ ] Créer workflow `test-unit.yml`
  - [ ] Exécuter sur chaque PR
  - [ ] Générer rapport couverture
  - [ ] Bloquer merge si échec

- [ ] **Tâche 10.2:** GitHub Actions tests E2E
  - [ ] Créer workflow `test-e2e.yml`
  - [ ] Exécuter sur chaque PR
  - [ ] Générer rapport
  - [ ] Bloquer merge si échec

- [ ] **Tâche 10.3:** GitHub Actions tests performance
  - [ ] Créer workflow `test-performance.yml`
  - [ ] Exécuter sur main
  - [ ] Générer rapport Lighthouse
  - [ ] Notifier si dégradation

- [ ] **Tâche 10.4:** Notifications
  - [ ] Notifier Slack/Discord si échec
  - [ ] Notifier équipe
  - [ ] Dashboard résultats

**Sous-total:** 3-4h

---

## 📊 RÉCAPITULATIF TESTS

### Total Estimé
- **P0 Critique:** 15-20h
- **P1 Important:** 47-61h

**TOTAL: 62-81h (8-10 jours à plein temps)**

### Progression
- [ ] P0: 0/1 sections (0%)
- [ ] P1: 0/9 sections (0%)

**TOTAL: 0/10 sections complétées (0%)**

### Objectifs Couverture
- **Tests Unitaires:** > 60%
- **Tests E2E:** Tous parcours critiques
- **Tests Performance:** Lighthouse > 90
- **Tests Accessibilité:** 0 violations critiques

---

*Dernière mise à jour: Décembre 2024*









