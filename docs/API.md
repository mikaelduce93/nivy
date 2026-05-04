# API Reference

Documentation des routes API de Teens Party Morocco.

## Authentification

Toutes les routes API (sauf `/api/csrf`) nécessitent:
- Un cookie de session Supabase valide
- Un token CSRF pour les mutations (POST, PUT, DELETE)

### Headers Requis

```http
Content-Type: application/json
x-csrf-token: <token>
```

## Endpoints

### CSRF

#### `GET /api/csrf`

Génère un nouveau token CSRF.

**Response:**
```json
{
  "token": "uuid-v4-token"
}
```

**Cookie Set:**
- `csrf-token` (HttpOnly, Secure, SameSite=Strict, 24h)

---

### Bookings (Réservations)

#### `POST /api/bookings/create`

Crée une nouvelle réservation.

**Request (FormData):**
```
eventId: string
childId: string
ticketType: "standard" | "vip"
price: number
```

**Response:** Redirect vers `/reservation/paiement?booking={id}`

**Errors:**
- 401: Non authentifié
- 400: Données invalides
- 500: Erreur serveur

---

### Payments (Paiements)

#### `POST /api/payments/cmi/create`

Initie un paiement par carte CMI.

**Request:**
```json
{
  "bookingId": "uuid",
  "amount": 150,
  "currency": "MAD"
}
```

**Response:**
```json
{
  "redirectUrl": "https://cmi.co.ma/...",
  "transactionId": "string"
}
```

**Rate Limit:** 3 requêtes/minute

---

#### `POST /api/payments/mobile-money/initiate`

Initie un paiement Mobile Money.

**Request:**
```json
{
  "bookingId": "uuid",
  "provider": "inwi" | "orange" | "wave",
  "phone": "+212612345678",
  "amount": 150
}
```

**Response:**
```json
{
  "status": "pending",
  "confirmationCode": "string",
  "expiresAt": "ISO date"
}
```

**Rate Limit:** 3 requêtes/minute

---

#### `POST /api/payments/cash/create`

Crée une réservation avec paiement espèces.

**Request:**
```json
{
  "bookingId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Paiement en espèces enregistré"
}
```

**Rate Limit:** 3 requêtes/minute

---

### Check-in

#### `GET /api/check-in/search`

Recherche un participant pour check-in.

**Query Params:**
```
q: string (booking_reference, nom, ou téléphone)
eventId: string
```

**Response:**
```json
{
  "results": [
    {
      "bookingId": "uuid",
      "bookingReference": "TP123ABC",
      "childName": "string",
      "ticketType": "standard",
      "checkedIn": false
    }
  ]
}
```

---

#### `POST /api/check-in/entry`

Enregistre l'entrée d'un participant.

**Request:**
```json
{
  "ticketId": "uuid",
  "eventId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "timestamp": "ISO date"
}
```

---

#### `POST /api/check-in/exit`

Enregistre la sortie d'un participant.

**Request:**
```json
{
  "ticketId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "timestamp": "ISO date"
}
```

---

### Notifications

#### `POST /api/notifications/mark-read`

Marque une notification comme lue.

**Request:**
```json
{
  "notificationId": "uuid"
}
```

---

#### `POST /api/notifications/mark-all-read`

Marque toutes les notifications comme lues.

---

#### `DELETE /api/notifications/delete`

Supprime une notification.

**Request:**
```json
{
  "notificationId": "uuid"
}
```

---

### Push Notifications

#### `POST /api/notifications/push/subscribe`

Enregistre un abonnement push.

**Request:**
```json
{
  "subscription": {
    "endpoint": "string",
    "keys": {
      "p256dh": "string",
      "auth": "string"
    }
  }
}
```

---

#### `POST /api/notifications/push/unsubscribe`

Désenregistre un abonnement push.

---

#### `POST /api/notifications/push/send` (Admin)

Envoie une notification push à un utilisateur.

**Request:**
```json
{
  "userId": "uuid",
  "title": "string",
  "body": "string",
  "data": {}
}
```

---

### Autorisations

#### `POST /api/authorizations/create`

Crée une autorisation parentale.

**Request:**
```json
{
  "childId": "uuid",
  "eventId": "uuid",
  "type": "sortie" | "photo" | "activite",
  "signature": "base64"
}
```

---

#### `POST /api/authorizations/revoke`

Révoque une autorisation.

**Request:**
```json
{
  "authorizationId": "uuid"
}
```

---

### Clubs

#### `POST /api/clubs/pause`

Met en pause un abonnement club.

**Request:**
```json
{
  "subscriptionId": "uuid"
}
```

---

#### `POST /api/clubs/resume`

Reprend un abonnement club en pause.

---

#### `POST /api/clubs/cancel`

Annule un abonnement club.

---

### Admin

#### `POST /api/admin/ambassadors/approve`

Approuve une candidature ambassadeur.

**Request:**
```json
{
  "applicationId": "uuid"
}
```

**Authorization:** Admin only

---

#### `POST /api/admin/ambassadors/reject`

Rejette une candidature ambassadeur.

**Request:**
```json
{
  "applicationId": "uuid",
  "reason": "string"
}
```

---

#### `GET /api/admin/analytics/export`

Exporte les données analytics.

**Query Params:**
```
startDate: ISO date
endDate: ISO date
format: "csv" | "json"
```

---

#### `POST /api/admin/execute-sql` (Danger)

Exécute une requête SQL directe.

**Request:**
```json
{
  "query": "SELECT * FROM ..."
}
```

**Authorization:** Super Admin only

---

### Autres

#### `POST /api/partners/register`

Inscription d'un nouveau partenaire.

---

#### `GET /api/tickets/generate-pdf`

Génère un PDF de billets.

**Query Params:**
```
bookingId: uuid
```

---

#### `POST /api/e-signature/create`

Crée une signature électronique.

---

## Codes d'Erreur

| Code | Description |
|------|-------------|
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Token CSRF invalide / Accès refusé |
| 404 | Ressource non trouvée |
| 429 | Trop de requêtes (rate limit) |
| 500 | Erreur serveur |

## Rate Limiting

| Endpoint | Limite |
|----------|--------|
| `/api/auth/*` | 5/min |
| `/api/bookings/*` | 10/min |
| `/api/payments/*` | 3/min |
| `/api/upload/*` | 10/min |
| Autres | 60/min |

## Exemples

### Créer une réservation

```typescript
// 1. Obtenir le token CSRF
const csrfRes = await fetch('/api/csrf')
const { token } = await csrfRes.json()

// 2. Créer la réservation
const formData = new FormData()
formData.append('eventId', 'uuid')
formData.append('childId', 'uuid')
formData.append('ticketType', 'standard')
formData.append('price', '150')

const res = await fetch('/api/bookings/create', {
  method: 'POST',
  headers: {
    'x-csrf-token': token,
  },
  body: formData,
})
```

### Utiliser fetchWithCSRF

```typescript
import { fetchWithCSRF } from '@/lib/security/fetch-with-csrf'

// Le token CSRF est automatiquement inclus
const res = await fetchWithCSRF('/api/payments/cmi/create', {
  method: 'POST',
  body: JSON.stringify({
    bookingId: 'uuid',
    amount: 150,
  }),
})
```
