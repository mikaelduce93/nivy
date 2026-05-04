# Statut de Migration - Timeout Réseau

**Dernière mise à jour**: 2025-01-27  
**Progression**: 6/340+ fichiers (2%)

---

## ✅ Fichiers Migrés

### Routes API (4/190)
1. ✅ `app/api/payments/process/route.ts`
2. ✅ `app/api/bookings/create/route.ts`
3. ✅ `app/api/auth/validate-teen/route.ts`
4. ✅ `app/api/auth/register-teen/route.ts`

### Hooks (1/50+)
1. ✅ `lib/hooks/use-pillars.ts`

### Composants Client (1/100+)
1. ✅ `app/teen/xp-value/page.tsx`

---

## ⏳ Prochaines Migrations Prioritaires

### Routes API Critiques (P0)
- [ ] `app/api/payments/hybrid/route.ts`
- [ ] `app/api/payments/mobile-money/initiate/route.ts`
- [ ] `app/api/payments/cmi/**/*.ts`
- [ ] `app/api/payments/cash/create/route.ts`
- [ ] `app/api/payments/xp/route.ts`

### Composants Critiques (P1)
- [ ] `components/payment-method-selector.tsx`
- [ ] `components/check-in-interface.tsx`
- [ ] `app/parent/live/page.tsx`
- [ ] `components/friends/friends-list.tsx`
- [ ] `components/tokens/token-rewards.tsx`

### Hooks (P1)
- [ ] `lib/hooks/use-retry.ts` (déjà utilise fetch, à vérifier)

---

## 📊 Statistiques

**Total fichiers à migrer**: ~340
- Routes API: ~190 fichiers
- Composants: ~100 fichiers
- Hooks: ~50 fichiers

**Fichiers migrés**: 6
**Progression**: 2%

---

## 🔍 Comment Trouver les Fichiers à Migrer

### Rechercher tous les `fetch`
```bash
grep -r "await fetch(" app/ components/ lib/
```

### Rechercher tous les `supabase.from()`
```bash
grep -r "supabase\.from(" app/ components/ lib/
```

### Rechercher tous les `supabase.auth.`
```bash
grep -r "supabase\.auth\." app/ components/ lib/
```

---

## 📝 Checklist de Migration

Pour chaque fichier:

- [ ] Identifier tous les `fetch` et `supabase.*` calls
- [ ] Importer `fetchWithTimeout` ou `withSupabaseTimeout`
- [ ] Wrapper chaque appel avec timeout approprié
- [ ] Tester que le code fonctionne
- [ ] Vérifier gestion d'erreurs
- [ ] Mettre à jour ce fichier

---

**Note**: Migration progressive recommandée. Commencer par les routes critiques (P0), puis composants critiques (P1), puis reste (P2).







