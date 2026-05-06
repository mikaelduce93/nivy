# ⚡ TODO PERFORMANCE - Optimisations

> **Statut verifie 2026-05-06**: ce backlog peut etre obsolete. Voir `docs/audits/AUDIT_E2E_DOUBLONS_HARDCODE_SCAFFOLD.md` pour l'etat verifie a cette date, et `docs/RELEASE_CHECKLIST.md` pour la checklist active.

**Progression:** 0/30 tâches (0%)

---

## 📋 SECTION P1: IMPORTANT

### 1. Optimisation Images
**Référence:** Voir `TODO_P1_IMPORTANT.md` Section 3.1

- [ ] Tâche 3.1.1 à 3.1.5 (voir TODO_P1_IMPORTANT.md)

### 2. Optimisation Code
**Référence:** Voir `TODO_P1_IMPORTANT.md` Section 3.2

- [ ] Tâche 3.2.1 à 3.2.4 (voir TODO_P1_IMPORTANT.md)

### 3. Lighthouse Score > 90
**Référence:** Voir `TODO_P1_IMPORTANT.md` Section 3.3

- [ ] Tâche 3.3.1 à 3.3.5 (voir TODO_P1_IMPORTANT.md)

---

## 📋 SECTION P2: AMÉLIORATION

### 4. Server Components Optimisation
**Fichier:** Refactoring composants  
**Durée:** 6-8h

- [ ] **Tâche 4.1:** Audit Server vs Client Components
  - [ ] Identifier composants qui devraient être Server
  - [ ] Convertir Client → Server si possible
  - [ ] Réduire bundle JavaScript
  - [ ] Mesurer gains

- [ ] **Tâche 4.2:** Streaming optimisé
  - [ ] Utiliser `loading.tsx` partout
  - [ ] Suspense boundaries stratégiques
  - [ ] Progressive rendering
  - [ ] Améliorer Time to First Byte

- [ ] **Tâche 4.3:** Data Fetching optimisé
  - [ ] Paralléliser fetches avec Promise.all
  - [ ] Cache stratégique (revalidate)
  - [ ] Préchargement données critiques
  - [ ] Optimiser requêtes DB

**Sous-total:** 6-8h

---

### 5. Bundle Size Optimization
**Fichier:** Configuration build  
**Durée:** 4-5h

- [ ] **Tâche 5.1:** Analyser bundles
  - [ ] Utiliser `@next/bundle-analyzer`
  - [ ] Identifier gros bundles
  - [ ] Identifier dépendances inutilisées
  - [ ] Documenter findings

- [ ] **Tâche 5.2:** Réduire dépendances
  - [ ] Supprimer dépendances inutilisées
  - [ ] Remplacer par alternatives légères
  - [ ] Utiliser imports nommés
  - [ ] Mesurer réduction

- [ ] **Tâche 5.3:** Code splitting avancé
  - [ ] Dynamic imports pour composants lourds
  - [ ] Lazy load routes non critiques
  - [ ] Optimiser chunks
  - [ ] Mesurer améliorations

**Sous-total:** 4-5h

---

### 6. Database Query Optimization
**Fichier:** Queries SQL  
**Durée:** 6-8h

- [ ] **Tâche 6.1:** Analyser queries lentes
  - [ ] Activer `pg_stat_statements`
  - [ ] Identifier queries > 200ms
  - [ ] Analyser plans d'exécution
  - [ ] Documenter problèmes

- [ ] **Tâche 6.2:** Optimiser queries fréquentes
  - [ ] Réécrire queries inefficaces
  - [ ] Ajouter index manquants
  - [ ] Utiliser JOIN au lieu de sous-requêtes
  - [ ] Mesurer améliorations

- [ ] **Tâche 6.3:** Réduire nombre queries
  - [ ] Combiner queries similaires
  - [ ] Utiliser batch operations
  - [ ] Cache résultats
  - [ ] Mesurer réduction

- [ ] **Tâche 6.4:** Optimiser N+1 queries
  - [ ] Identifier N+1 patterns
  - [ ] Utiliser eager loading
  - [ ] Utiliser data loaders
  - [ ] Mesurer améliorations

**Sous-total:** 6-8h

---

### 7. CDN Configuration
**Fichier:** Configuration CDN  
**Durée:** 3-4h

- [ ] **Tâche 7.1:** Configurer Vercel Blob
  - [ ] Migrer images vers Blob
  - [ ] Configurer CDN
  - [ ] Mettre à jour URLs
  - [ ] Tester vitesse

- [ ] **Tâche 7.2:** Cache headers optimisés
  - [ ] Configurer cache statique (1 an)
  - [ ] Configurer cache API (5 min)
  - [ ] Headers appropriés
  - [ ] Tester cache

- [ ] **Tâche 7.3:** Compression assets
  - [ ] Gzip/Brotli activé
  - [ ] Compression images
  - [ ] Minification CSS/JS
  - [ ] Mesurer gains

**Sous-total:** 3-4h

---

## 📊 RÉCAPITULATIF PERFORMANCE

### Total Estimé
- **P1 Important:** 9-12h
- **P2 Amélioration:** 19-25h

**TOTAL: 28-37h (3-5 jours à plein temps)**

### Progression
- [ ] P1: 0/3 sections (0%)
- [ ] P2: 0/4 sections (0%)

**TOTAL: 0/7 sections complétées (0%)**

### Objectifs
- **Lighthouse Score:** > 90 toutes pages
- **First Contentful Paint:** < 1.5s
- **Largest Contentful Paint:** < 2.5s
- **Time to Interactive:** < 3.5s
- **Bundle Size:** < 200KB initial

---

*Dernière mise à jour: Décembre 2024*









