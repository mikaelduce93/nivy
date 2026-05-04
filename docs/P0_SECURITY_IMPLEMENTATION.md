# P0 SÉCURITÉ - GUIDE D'IMPLÉMENTATION

## Statut Actuel

✅ **TERMINÉ**:
- Row Level Security (RLS) policies pour toutes les tables critiques
- Content Security Policy (CSP) stricte
- Rate Limiting par endpoint
- Protection CSRF avec tokens
- Build production strict (pas de ignore errors)
- Permissions caméra configurées
- Validation d'âge côté serveur
- Anti-fraude ambassadeurs
- Structure table authorizations pour e-signature

⚠️ **RESTE À FAIRE** (nécessite configuration manuelle):
- Exécuter le script SQL `107_add_critical_rls_policies.sql` dans Supabase
- Configurer le cron job pour purge automatique RGPD
- Implémenter l'interface e-signature parentale (UI)
- Implémenter le scanner QR code pour check-in
- Configurer Sentry pour monitoring erreurs
- Tests de pénétration

## Actions Requises

### 1. Exécuter le script SQL

Dans votre dashboard Supabase:
1. Aller dans SQL Editor
2. Copier le contenu de `scripts/107_add_critical_rls_policies.sql`
3. Exécuter le script
4. Vérifier qu'il n'y a pas d'erreurs

### 2. Configurer le Cron Job (purge RGPD)

Option A - Si pg_cron est disponible:
\`\`\`sql
SELECT cron.schedule('purge-documents', '0 2 * * *', 
  'SELECT purge_sensitive_documents()'
);
\`\`\`

Option B - Vercel Cron (recommandé):
1. Créer `/app/api/cron/purge/route.ts`
2. Ajouter dans `vercel.json`:
\`\`\`json
{
  "crons": [{
    "path": "/api/cron/purge",
    "schedule": "0 2 * * *"
  }]
}
\`\`\`

### 3. Tester la sécurité

\`\`\`bash
# Test Rate Limiting
for i in {1..70}; do curl https://your-domain.com/api/test; done

# Test CSRF (devrait échouer sans token)
curl -X POST https://your-domain.com/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"event_id": "test"}'

# Test CSP Headers
curl -I https://your-domain.com | grep Content-Security-Policy
\`\`\`

### 4. Monitoring

Configurer Sentry:
\`\`\`bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
\`\`\`

## Prochaines étapes: P1

Une fois P0 complété, passer à:
- Scanner QR code (check-in/check-out)
- E-signature parentale UI
- Paiements CMI + Mobile Money
- Photo upload optimisé
- Notifications SMS/Email

## Support

Questions: tech@teensparty.ma
