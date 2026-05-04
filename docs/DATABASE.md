# Database Schema

Documentation du schéma de base de données Supabase pour Teens Party Morocco.

## Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE DATABASE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   profiles   │────▶│   children   │────▶│   bookings   │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│         │                    │                    │                         │
│         │                    │                    ▼                         │
│         │                    │           ┌───────────────┐                  │
│         │                    └──────────▶│booking_tickets│                  │
│         │                                └───────────────┘                  │
│         │                                        │                         │
│         ▼                                        ▼                         │
│  ┌──────────────┐     ┌──────────────┐  ┌──────────────┐                   │
│  │   user_xp    │     │    events    │  │   payments   │                   │
│  └──────────────┘     └──────────────┘  └──────────────┘                   │
│         │                    │                                              │
│         ▼                    ▼                                              │
│  ┌──────────────┐     ┌──────────────┐                                     │
│  │ achievements │     │    clubs     │                                     │
│  └──────────────┘     └──────────────┘                                     │
│                              │                                              │
│                              ▼                                              │
│                       ┌──────────────┐                                     │
│                       │club_members  │                                     │
│                       └──────────────┘                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tables Principales

### profiles

Informations des utilisateurs (parents).

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin', 'ambassador')),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

---

### children

Profils des enfants/adolescents.

```sql
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  date_naissance DATE NOT NULL,
  pseudo TEXT UNIQUE,
  avatar_url TEXT,
  allergies TEXT,
  medical_notes TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_age CHECK (
    date_naissance <= CURRENT_DATE - INTERVAL '10 years' AND
    date_naissance >= CURRENT_DATE - INTERVAL '18 years'
  )
);

-- Index
CREATE INDEX idx_children_parent ON children(parent_id);

-- RLS
CREATE POLICY "Parents can manage their children" ON children
  FOR ALL USING (auth.uid() = parent_id);
```

---

### events

Événements et soirées.

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  event_start TIME,
  event_end TIME,
  venue_name TEXT,
  venue_address TEXT,
  city TEXT NOT NULL,
  category TEXT CHECK (category IN ('soiree', 'sport', 'art-culture', 'technologie', 'autres')),
  base_price DECIMAL(10,2),
  vip_price DECIMAL(10,2),
  max_capacity INTEGER DEFAULT 100,
  available_spots INTEGER DEFAULT 100,
  age_min INTEGER DEFAULT 13,
  age_max INTEGER DEFAULT 17,
  featured_image TEXT,
  image_url TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_city ON events(city);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_slug ON events(slug);

-- RLS
CREATE POLICY "Events are viewable by everyone" ON events
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage events" ON events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
```

---

### bookings

Réservations.

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_reference TEXT UNIQUE NOT NULL,
  qr_code TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  status TEXT DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'confirmed', 'cancelled', 'completed')),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_bookings_event ON bookings(event_id);
CREATE INDEX idx_bookings_parent ON bookings(parent_id);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_bookings_status ON bookings(status);

-- RLS
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Users can create bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = parent_id);
```

---

### booking_tickets

Billets individuels par réservation.

```sql
CREATE TABLE booking_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('standard', 'vip')),
  price DECIMAL(10,2) NOT NULL,
  qr_code TEXT,
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_tickets_booking ON booking_tickets(booking_id);
CREATE INDEX idx_tickets_child ON booking_tickets(child_id);
```

---

### payments

Historique des paiements.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'MAD',
  method TEXT NOT NULL CHECK (method IN ('cmi', 'inwi', 'orange', 'wave', 'cash')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  transaction_id TEXT,
  provider_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);
```

---

### clubs

Clubs et activités récurrentes.

```sql
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT,
  schedule TEXT,
  monthly_price DECIMAL(10,2),
  max_members INTEGER,
  current_members INTEGER DEFAULT 0,
  city TEXT,
  venue TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_clubs_slug ON clubs(slug);
CREATE INDEX idx_clubs_city ON clubs(city);
```

---

### club_subscriptions

Abonnements aux clubs.

```sql
CREATE TABLE club_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  paused_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(club_id, child_id)
);

-- RLS
CREATE POLICY "Users can manage own subscriptions" ON club_subscriptions
  FOR ALL USING (auth.uid() = parent_id);
```

---

### notifications

Notifications utilisateur.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('event', 'booking', 'club', 'pass', 'gamification', 'system', 'promo', 'reminder')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

---

### user_xp

Points d'expérience (gamification).

```sql
CREATE TABLE user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Fonction calcul niveau
CREATE OR REPLACE FUNCTION calculate_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(SQRT(xp / 100)) + 1;
END;
$$ LANGUAGE plpgsql;

-- Trigger mise à jour niveau
CREATE OR REPLACE FUNCTION update_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.current_level := calculate_level(NEW.total_xp);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_xp_change
  BEFORE UPDATE ON user_xp
  FOR EACH ROW
  EXECUTE FUNCTION update_level();
```

---

### user_achievements

Badges et accomplissements.

```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, achievement_id)
);
```

---

### user_streaks

Séries de connexions.

```sql
CREATE TABLE user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,

  UNIQUE(user_id)
);
```

---

### authorizations

Autorisations parentales.

```sql
CREATE TABLE authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('sortie', 'photo', 'activite', 'general')),
  signature TEXT,
  signed_at TIMESTAMPTZ,
  valid_until DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### ambassador_applications

Candidatures ambassadeurs.

```sql
CREATE TABLE ambassador_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  motivation TEXT NOT NULL,
  social_media JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### push_subscriptions

Abonnements notifications push.

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, endpoint)
);
```

---

## Fonctions Utiles

### Incrémenter XP

```sql
CREATE OR REPLACE FUNCTION add_xp(p_user_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  INSERT INTO user_xp (user_id, total_xp)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET total_xp = user_xp.total_xp + p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Mettre à jour streak

```sql
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_last_date DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT last_activity_date INTO v_last_date
  FROM user_streaks WHERE user_id = p_user_id;

  IF v_last_date IS NULL THEN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, 1, 1, v_today);
  ELSIF v_last_date = v_today - 1 THEN
    UPDATE user_streaks
    SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_activity_date = v_today
    WHERE user_id = p_user_id;
  ELSIF v_last_date < v_today - 1 THEN
    UPDATE user_streaks
    SET current_streak = 1,
        last_activity_date = v_today
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Row Level Security (RLS)

Toutes les tables ont RLS activé. Règles principales:

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | Own | - | Own | - |
| children | Parent | Parent | Parent | Parent |
| events | Public | Admin | Admin | Admin |
| bookings | Parent | Parent | Admin | Admin |
| notifications | Own | System | Own | Own |

## Index Performance

Index recommandés pour les requêtes fréquentes:

```sql
-- Recherche événements
CREATE INDEX idx_events_search ON events
  USING gin(to_tsvector('french', title || ' ' || COALESCE(description, '')));

-- Réservations par date
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);

-- Notifications non lues
CREATE INDEX idx_notif_unread ON notifications(user_id)
  WHERE is_read = false;
```

## Migrations

Les migrations sont gérées via Supabase CLI:

```bash
# Créer une migration
supabase migration new <name>

# Appliquer les migrations
supabase db push

# Reset la base
supabase db reset
```
