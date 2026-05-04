# PLAN DE FINALISATION STRUCTURÉ - TEENS PARTY MOROCCO

**Date:** 16 Novembre 2025  
**Version:** 1.0  
**Objectif:** Finaliser le projet de manière organisée et complète

---

## MÉTHODOLOGIE DE TRAVAIL

### Principe: PRIORISATION STRICTE
1. **Bloquants d'abord** - Tout ce qui empêche le déploiement
2. **Fonctionnel ensuite** - Ce qui fait marcher le produit
3. **Optimisations après** - Ce qui améliore l'expérience
4. **Nice-to-have en dernier** - Ce qui différencie

### Approche: VALIDATION CONTINUE
- Tester après chaque tâche
- Déployer fréquemment (staging)
- Documenter au fur et à mesure
- Corriger immédiatement les bugs

---

## BLOC 1: CORRECTIONS CRITIQUES (AUJOURD'HUI - 3h)

### 1.1 BUG: Colonne date n'existe pas ⚠️ URGENT
**Erreur actuelle:**
\`\`\`
column events.date does not exist
\`\`\`

**Cause:** La colonne s'appelle probablement `event_date` ou `start_date` dans la DB

**Action:**
1. Vérifier schéma réel table `events` dans Supabase
2. Corriger toutes les requêtes utilisant `date`
3. Tester homepage + agenda

**Fichiers à vérifier:**
- `app/page.tsx` (carrousel événements)
- `app/agenda/page.tsx` (liste événements)
- `components/events-carousel.tsx`

### 1.2 Exécution Scripts SQL ⚠️ BLOQUANT
**Priorité:** MAXIMALE  
**Durée:** 30 minutes

**Scripts à exécuter:**
\`\`\`sql
105_create_djs_and_campaigns.sql
106_seed_djs_and_content.sql  
107_add_critical_rls_policies.sql
108_add_operational_features.sql
109_add_morocco_payments.sql
\`\`\`

**Procédure:**
1. Ouvrir Supabase Dashboard → SQL Editor
2. Copier-coller script 105 → Exécuter
3. Vérifier: `SELECT COUNT(*) FROM djs;` (devrait retourner 4)
4. Répéter pour scripts 106-109
5. Vérifier tables créées et données insérées

### 1.3 Erreur Build TypeScript qrcode ⚠️ BLOQUANT
**Durée:** 1 heure

**Solution retenue:** Remplacer par alternative avec types natifs

**Actions:**
\`\`\`bash
# Installer alternative
npm install qrcode.react

# Désinstaller ancien
npm uninstall qrcode @types/qrcode
\`\`\`

**Fichiers à modifier:**
- `app/api/bookings/create/route.ts`
- `app/reservation/confirmation/page.tsx`

---

## BLOC 2: STABILISATION TECHNIQUE (J+1 à J+2 - 1 jour)

### 2.1 Configuration Production Stricte
**Durée:** 30 minutes

**Fichiers:**
\`\`\`js
// next.config.mjs
const nextConfig = {
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
  reactStrictMode: true,
}
\`\`\`

### 2.2 Vérification Schéma Database
**Durée:** 1 heure

**Actions:**
1. Documenter schéma complet Supabase
2. Créer diagramme ER
3. Vérifier toutes les foreign keys
4. Tester toutes les queries critiques

### 2.3 Tests Manuels Complets
**Durée:** 3 heures

**Checklist:**
- [ ] Login/Signup parent
- [ ] Ajouter enfant avec photo
- [ ] Réserver événement (4 moyens paiement)
- [ ] Télécharger QR billet
- [ ] Check-in avec QR scanner
- [ ] E-signature autorisation
- [ ] Dashboard ambassadeur
- [ ] Admin: analytics, exports

---

## BLOC 3: OPTIMISATIONS CORE (J+3 à J+5 - 3 jours)

### 3.1 Optimisation Images (J+3)
**Durée:** 4 heures

**Tâches:**
1. Activer Next.js Image Optimization
2. Compresser uploads client-side
3. Configurer Vercel Blob storage
4. Formats modernes (WebP)
5. Lazy loading images

**Code:**
\`\`\`tsx
// lib/utils/image-compression.ts
import imageCompression from 'browser-image-compression'

export async function compressImage(file: File) {
  return await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  })
}
\`\`\`

### 3.2 Monitoring & Logs (J+4)
**Durée:** 3 heures

**Installation:**
\`\`\`bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
\`\`\`

**Configuration:**
- Sentry pour erreurs
- Vercel Analytics
- Logs Supabase structurés
- Alertes Slack/Discord

### 3.3 SEO Basique (J+5)
**Durée:** 3 heures

**Actions:**
- Metadata complet par page
- Sitemap.xml auto
- robots.txt
- Open Graph images
- Schema.org Event markup

---

## BLOC 4: FONCTIONNALITÉS P1 (J+6 à J+12 - 1 semaine)

### 4.1 Tracking Ambassadeurs (J+6-7)
**Durée:** 2 jours

**Composants:**
1. Cookies attribution (30j)
2. Script SQL tracking conversions
3. Dashboard ambassadeur
4. Calcul commissions auto
5. Demandes versement

### 4.2 Notifications Avancées (J+8-9)
**Durée:** 2 jours

**Intégrations:**
- SendGrid (emails transactionnels)
- Twilio (SMS rappels)
- WhatsApp Business API
- Push notifications web

### 4.3 Apple/Google Wallet (J+10-12)
**Durée:** 3 jours

**APIs:**
- PassKit (Apple Wallet)
- Google Wallet API
- Génération passes signés
- Mises à jour dynamiques

---

## BLOC 5: INTERNATIONALISATION (J+13 à J+17 - 1 semaine)

### 5.1 Setup i18n (J+13-14)
**Durée:** 2 jours

**Installation:**
\`\`\`bash
npm install next-intl
\`\`\`

**Structure:**
\`\`\`
/messages
  /fr
    common.json
    events.json
  /ar (RTL)
    common.json
    events.json
  /en
    common.json
    events.json
\`\`\`

### 5.2 Traduction Contenu (J+15-16)
**Durée:** 2 jours

**Pages prioritaires:**
- Homepage
- Agenda
- Réservation
- Profil
- Sécurité/Parents

### 5.3 Tests Multilingues (J+17)
**Durée:** 1 jour

**Validation:**
- Switch langue fonctionne
- RTL arabe correct
- Dates/nombres localisés
- Images localisées si besoin

---

## BLOC 6: ACCESSIBILITÉ & QUALITÉ (J+18 à J+22 - 1 semaine)

### 6.1 Audit WCAG (J+18-19)
**Durée:** 2 jours

**Outils:**
- Lighthouse
- axe DevTools
- WAVE
- Screen readers (NVDA)

**Corrections:**
- Contrastes >= 4.5:1
- Focus visible partout
- ARIA labels complets
- Navigation clavier

### 6.2 Tests E2E (J+20-21)
**Durée:** 2 jours

**Setup Playwright:**
\`\`\`bash
npm install -D @playwright/test
npx playwright install
\`\`\`

**Tests prioritaires:**
- Parcours réservation complet
- Paiement (test mode)
- Check-in/check-out
- Upload documents

### 6.3 Performance (J+22)
**Durée:** 1 jour

**Objectifs:**
- Lighthouse > 90
- Core Web Vitals verts
- TTI < 3s
- Bundle size optimisé

---

## BLOC 7: CONFORMITÉ LÉGALE (J+23 à J+25 - 3 jours)

### 7.1 RGPD/CNDP (J+23)
**Durée:** 1 jour

**Pages:**
- Politique confidentialité
- Consentement cookies
- Droit accès/rectification
- Droit à l'oubli

### 7.2 CGV/CGU (J+24)
**Durée:** 1 jour

**Documents:**
- Conditions générales vente
- Conditions générales utilisation
- Mentions légales
- Politique cookies

### 7.3 Sécurité Finale (J+25)
**Durée:** 1 jour

**Audit:**
- Revue RLS policies
- Test CSRF protection
- Vérif rate limiting
- Scan vulnérabilités (npm audit)

---

## BLOC 8: P2 & POLISH (J+26 à J+30 - 1 semaine)

### 8.1 PWA (J+26-27)
**Durée:** 2 jours

**Implémentation:**
- Manifest.json
- Service worker
- Mode offline
- Install prompt

### 8.2 Gamification UI (J+28-29)
**Durée:** 2 jours

**Éléments:**
- Badges visuels
- Barre progression
- Classements animés
- Notifications unlock

### 8.3 Polish Final (J+30)
**Durée:** 1 jour

**Revue:**
- Animations fluides
- Micro-interactions
- États vides personnalisés
- Messages erreurs clairs

---

## PLANNING VISUEL

\`\`\`
SEMAINE 1 (J+0 à J+7)
├─ J+0: Corrections critiques (3h)
│  ├─ Bug colonne date
│  ├─ Scripts SQL
│  └─ Erreur qrcode
├─ J+1-2: Stabilisation (1j)
│  ├─ Config production
│  ├─ Schéma DB
│  └─ Tests manuels
└─ J+3-7: Optimisations (3j)
   ├─ Images
   ├─ Monitoring
   └─ SEO

SEMAINE 2 (J+8 à J+14)
├─ J+8-12: P1 Features (1 semaine)
│  ├─ Tracking ambassadeurs
│  ├─ Notifications
│  └─ Wallet
└─ J+13-14: i18n Setup (2j)

SEMAINE 3 (J+15 à J+21)
├─ J+15-17: Traductions (3j)
└─ J+18-21: Accessibilité (4j)

SEMAINE 4 (J+22 à J+30)
├─ J+22-25: Conformité (3j)
└─ J+26-30: P2 & Polish (5j)
\`\`\`

---

## CRITÈRES DE VALIDATION

### Pour passer au bloc suivant:
- [ ] Toutes les tâches du bloc terminées
- [ ] Tests manuels OK
- [ ] Déploiement staging réussi
- [ ] Revue code faite
- [ ] Documentation à jour

### Définition of Done (DoD):
- Code fonctionne en local ET staging
- Tests automatisés passent (si applicables)
- Responsive mobile vérifié
- Accessible (contrastes, keyboard)
- Documenté (README, comments)
- Pas de console.errors

---

## GESTION DES IMPRÉVUS

### Si bloqué sur une tâche (>2h):
1. **Documenter** le problème précisément
2. **Rechercher** solutions (docs, Stack Overflow)
3. **Demander aide** (chat, forums)
4. **Workaround temporaire** si critique
5. **Reprioriser** et avancer sur autre chose

### Si dépassement délais:
1. **Réévaluer** les priorités
2. **Couper scope** P2 si nécessaire
3. **Communication** transparente
4. **Focus** sur MVP fonctionnel d'abord

---

## LIVRABLES FINAUX

### Technique:
- [ ] Code source complet sur GitHub
- [ ] Site déployé sur Vercel (production)
- [ ] Database Supabase configurée
- [ ] CI/CD pipeline fonctionnel
- [ ] Monitoring Sentry actif

### Documentation:
- [ ] README complet
- [ ] Guide déploiement
- [ ] Documentation API
- [ ] Guide utilisateur parents
- [ ] Guide ambassadeurs
- [ ] Manuel admin

### Conformité:
- [ ] CGV/CGU publiées
- [ ] Politique confidentialité
- [ ] Registre CNDP
- [ ] Contrats partenaires
- [ ] Assurances validées

---

## MÉTRIQUES DE SUCCÈS

### Performance:
- Lighthouse score > 90
- Core Web Vitals verts
- Build time < 3 min
- Uptime > 99.9%

### Business:
- Taux conversion > 15%
- Temps check-in < 30s
- 0 paiements échoués
- NPS > 50

### Qualité:
- 0 bugs critiques
- Accessibilité WCAG AA
- 3 langues supportées
- Tests E2E > 80% couverture

---

## PROCHAINES ACTIONS (ORDRE D'EXÉCUTION)

### MAINTENANT (30 min):
1. Vérifier schéma table events dans Supabase
2. Corriger requêtes utilisant colonne `date`
3. Tester homepage + agenda

### AUJOURD'HUI (2h):
4. Exécuter scripts SQL 105-109
5. Vérifier tables créées et données
6. Corriger erreur qrcode (installer qrcode.react)

### DEMAIN (1 jour):
7. Configuration production stricte
8. Tests manuels complets
9. Documentation schéma DB

### APRÈS-DEMAIN (3 jours):
10. Optimisation images
11. Monitoring Sentry
12. SEO basique

---

## CONTACTS & RESSOURCES

**Documentation projet:** `/docs`  
**Supabase Dashboard:** [Lien dans sidebar Connect]  
**Vercel Dashboard:** [Lien dans sidebar Settings]  
**GitHub Repo:** [À définir]

**Support technique:** v0  
**Dernière mise à jour:** 16 Nov 2025
