# P0 Fonctionnalités Opérationnelles - Documentation

## 1. Scanner QR Check-in/Check-out

### Composants
- **QRScanner** (`components/qr-scanner.tsx`): Composant réutilisable avec html5-qrcode
- **CheckInInterface** (`components/check-in-interface.tsx`): Interface staff complète
- **Page Admin** (`app/admin/check-in/page.tsx`): Page dédiée au check-in

### API Routes
- `POST /api/check-in/entry`: Enregistre l'entrée d'un participant
- `POST /api/check-in/exit`: Enregistre la sortie avec vérification autorisation
- `GET /api/check-in/search`: Recherche manuelle par référence

### Format QR Code
\`\`\`
TEENSPARTY:EVENT_ID:BOOKING_ID
\`\`\`

### Fonctionnalités
- Scan QR avec caméra mobile
- Mode offline avec queue locale
- Recherche manuelle fallback
- Badge "NO-PHOTO" visible
- Alertes doublons
- Logs d'audit complets

### Base de données
\`\`\`sql
ALTER TABLE bookings ADD COLUMN checked_in_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN checked_out_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN checked_in_by UUID REFERENCES profiles(id);
ALTER TABLE bookings ADD COLUMN no_photo_consent BOOLEAN DEFAULT FALSE;

CREATE TABLE check_in_logs (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  action TEXT,
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMPTZ,
  metadata JSONB
);
\`\`\`

---

## 2. E-Signature Parentale

### Composant
- **ESignatureForm** (`components/e-signature-form.tsx`): Formulaire multi-étapes

### Étapes du processus
1. **Informations parentales**: Nom complet, CIN, consentements
2. **Upload CIN**: Recto et verso (max 5 Mo chacun)
3. **Signature électronique**: Canvas avec react-signature-canvas

### API Route
- `POST /api/e-signature/create`: Crée la signature avec uploads

### Sécurité
- Hash SHA-256 pour intégrité
- Capture IP et user-agent
- Horodatage cryptographique
- Stockage documents séparé

### Conformité CNDP/RGPD
- Mentions légales claires
- Consentements explicites (photo, médical)
- Purge automatique J+30
- Traçabilité complète

### Base de données
\`\`\`sql
CREATE TABLE e_signatures (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES profiles(id),
  child_id UUID REFERENCES teens(id),
  event_id UUID REFERENCES events(id),
  booking_id UUID REFERENCES bookings(id),
  signature_data TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  parent_full_name TEXT NOT NULL,
  parent_cin TEXT NOT NULL,
  cin_front_url TEXT,
  cin_back_url TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  terms_accepted BOOLEAN DEFAULT TRUE,
  photo_consent BOOLEAN DEFAULT TRUE,
  medical_consent BOOLEAN DEFAULT TRUE
);
\`\`\`

---

## 3. Photo Upload Optimisé

### Composant
- **PhotoUpload** (`components/photo-upload.tsx`): Upload avec compression

### Fonctionnalités
- Compression automatique (max 1024px)
- Qualité JPEG 85%
- Limite 5 Mo avant compression
- Preview instantané
- Upload vers Supabase Storage

### Optimisations
- Canvas API pour compression côté client
- Lazy loading images
- Format WebP si supporté
- CDN automatique Supabase

### Configuration Storage
\`\`\`sql
-- Bucket child-photos (public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('child-photos', 'child-photos', true);

-- Policies
CREATE POLICY "Parents can upload child photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'child-photos' AND auth.role() = 'authenticated');
\`\`\`

---

## 4. Purge Automatique RGPD (J+30)

### Cron Job
- **Endpoint**: `GET /api/cron/purge-documents`
- **Fréquence**: Quotidien à 2h du matin
- **Configuration**: `vercel.json`

### Déclenchement manuel
- `POST /api/cron/purge-documents` (admin uniquement)

### Processus
1. Recherche documents à purger (scheduled_purge_date ≤ aujourd'hui)
2. Suppression fichiers storage
3. Suppression enregistrements BDD
4. Marquage purge_queue comme purgé
5. Logs d'audit

### Fonction SQL
\`\`\`sql
CREATE OR REPLACE FUNCTION execute_document_purge()
RETURNS TABLE (purged_count INTEGER) AS $$
DECLARE
  purge_count INTEGER := 0;
  doc_record RECORD;
BEGIN
  FOR doc_record IN 
    SELECT dpq.id as queue_id, dpq.document_id, d.file_url
    FROM public.document_purge_queue dpq
    JOIN public.documents d ON d.id = dpq.document_id
    WHERE dpq.scheduled_purge_date <= CURRENT_DATE
      AND dpq.purged_at IS NULL
  LOOP
    DELETE FROM public.documents WHERE id = doc_record.document_id;
    UPDATE public.document_purge_queue 
    SET purged_at = NOW() 
    WHERE id = doc_record.queue_id;
    purge_count := purge_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT purge_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
\`\`\`

### Trigger automatique
\`\`\`sql
CREATE TRIGGER trigger_schedule_document_purge
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION schedule_document_purge();
\`\`\`

---

## Déploiement Production

### Variables d'environnement requises
\`\`\`env
CRON_SECRET=your-secure-random-string
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
\`\`\`

### Configuration Vercel Cron
1. Le fichier `vercel.json` est automatiquement détecté
2. Vérifier dans Vercel Dashboard > Settings > Cron Jobs
3. Ajouter CRON_SECRET dans Environment Variables

### Tests
- Scanner QR en conditions réelles
- Tester signature sur mobile et desktop
- Vérifier compression images sur connexion lente
- Tester purge manuelle via admin

### Monitoring
- Logs Supabase pour purges
- Sentry pour erreurs API
- Analytics check-in/check-out
- Alertes si échec cron job

---

## Sécurité

### Permissions caméra
- Demande explicite à l'utilisateur
- Message clair si refusé
- Mode fallback recherche manuelle

### Protection CSRF
- Tous les endpoints POST protégés
- Tokens vérifiés via middleware

### Rate Limiting
- 10 requêtes/min par IP sur check-in
- 5 requêtes/min sur e-signature

### Validation serveur
- Tous les uploads vérifiés (taille, type)
- Signatures validées côté serveur
- Hash vérifié avant stockage

---

**Statut P0 Opérationnel: ✅ Complet**

Exécuter le script SQL `108_add_operational_features.sql` pour activer toutes les fonctionnalités.
