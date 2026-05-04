# Configuration Resend (Emails)

Resend est utilisé pour envoyer des emails transactionnels. Il est **optionnel** - l'application fonctionne sans, mais les emails ne seront pas envoyés.

---

## ⚙️ Configuration

### Option 1: Via Variables d'Environnement

Ajouter dans `.env.local` :

```env
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=notifications@teensparty.ma
```

### Option 2: Obtenir une Clé API

1. **Créer un compte Resend:**
   - Aller sur https://resend.com
   - Créer un compte

2. **Créer une API Key:**
   - Dashboard → API Keys
   - "Create API Key"
   - Copier la clé (commence par `re_`)

3. **Ajouter dans `.env.local`:**
   ```env
   RESEND_API_KEY=re_xxxxx
   ```

---

## ✅ Vérification

### Vérifier si Resend est configuré

Le code vérifie automatiquement si Resend est configuré. Si ce n'est pas le cas:
- ✅ L'application fonctionne normalement
- ⚠️ Les emails ne seront pas envoyés
- 📝 Un message d'avertissement est loggé dans la console

### Tester l'envoi d'email

```typescript
import { isResendConfigured } from '@/lib/resend'

if (isResendConfigured()) {
  // Resend est configuré, emails peuvent être envoyés
} else {
  // Resend non configuré, emails désactivés
}
```

---

## 📧 Emails Disponibles

Les emails suivants utilisent Resend:

- ✅ Confirmation de réservation
- ✅ Rappel d'événement
- ✅ Email de bienvenue
- ✅ Confirmation de paiement
- ✅ Demandes d'approbation
- ✅ Notifications d'anniversaire
- ✅ Emails VIP Pass
- ✅ Notifications ambassadeur
- ✅ Notifications partenaire

---

## 🚨 Comportement sans Configuration

Si `RESEND_API_KEY` n'est **pas** configuré:

- ✅ L'application démarre sans erreur
- ✅ Toutes les fonctionnalités fonctionnent
- ⚠️ Les emails ne sont pas envoyés
- 📝 Des warnings sont loggés dans la console

**Exemple de log:**
```
[Resend] Not configured - email not sent. Set RESEND_API_KEY to enable emails.
```

---

## 🔧 Troubleshooting

### Erreur: "Missing API key"

**Cause:** Resend est instancié sans clé API

**Solution:** 
- Ajouter `RESEND_API_KEY` dans `.env.local`
- Redémarrer le serveur

### Emails ne sont pas envoyés

**Vérifier:**
1. `RESEND_API_KEY` est défini dans `.env.local`
2. La clé API est valide
3. Le domaine est vérifié dans Resend (si nécessaire)
4. Vérifier les logs pour les erreurs

### Emails en spam

**Solutions:**
- Vérifier le domaine dans Resend
- Configurer SPF/DKIM records
- Utiliser un domaine vérifié

---

## 📚 Ressources

- [Resend Documentation](https://resend.com/docs)
- [Resend Dashboard](https://resend.com/dashboard)
- [Configuration Email](./env.local.example)

---

**Note:** Resend est optionnel. L'application fonctionne parfaitement sans, mais les emails transactionnels ne seront pas envoyés.

