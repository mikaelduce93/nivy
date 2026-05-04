-- Enable RLS
ALTER TABLE IF EXISTS challenge_proofs ENABLE ROW LEVEL SECURITY;

-- Create proofs table
CREATE TABLE IF NOT EXISTS challenge_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  challenge_id TEXT NOT NULL, -- References challenge template code
  video_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policies
-- Teens can view their own proofs
CREATE POLICY "Teens can view own proofs" ON challenge_proofs
  FOR SELECT USING (auth.uid() = user_id);

-- Teens can insert their own proofs
CREATE POLICY "Teens can upload proofs" ON challenge_proofs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins/Coachs can view all proofs (assuming 'admin' or 'coach' role in profiles or custom claim)
-- Ideally use a role check function, simplified here for now:
CREATE POLICY "Admins can view all proofs" ON challenge_proofs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'coach', 'partner')
    )
  );

-- Admins/Coachs can update proofs (review)
CREATE POLICY "Admins can review proofs" ON challenge_proofs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'coach', 'partner')
    )
  );

-- Function to handle storage bucket (run manually in Supabase dashboard usually, but documented here)
-- insert into storage.buckets (id, name, public) values ('challenge-proofs', 'challenge-proofs', true);
-- create policy "Authenticated can upload proofs" on storage.objects for insert to bucket 'challenge-proofs' with check (bucket_id = 'challenge-proofs' and auth.role() = 'authenticated');
-- create policy "Public can view proofs" on storage.objects for select to bucket 'challenge-proofs' using (bucket_id = 'challenge-proofs');

