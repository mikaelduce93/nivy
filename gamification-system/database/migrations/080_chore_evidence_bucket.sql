-- =========================================================================
-- 078_chore_evidence_bucket.sql
-- TICKET-014 [parent-defi] Photo evidence private bucket + signed URLs
--
-- Creates a dedicated PRIVATE Supabase Storage bucket `chore-evidence` to
-- separate parent-defi photo proofs from `defi-proofs` (which is reserved
-- for physical-challenge proofs). The split keeps RLS policies simple and
-- aligns with the data-model invariant that each evidence domain owns its
-- own bucket (kyc-documents, mentor-recordings, defi-proofs, …).
--
-- Path convention
--   `<teen_id>/<chore_id>/<uuid>.<ext>`
--   The first folder MUST equal `auth.uid()::text` so the storage RLS
--   policies below can authorize the caller without joining a public
--   table on every read.
--
-- Read access
--   - Teen owner (path prefix == auth.uid())
--   - Linked parent (parent_teen_links.parent_id == auth.uid()
--                    AND parent_teen_links.teen_id == path[0])
--   - Admin (admin_roles in {'admin','super_admin'})
--   - Service role (bypasses RLS)
--
-- Write access (INSERT)
--   - Teen owner only (path prefix == auth.uid()).
--
-- Numbering
--   Slot 078 was free at the time of authoring (last existing migration
--   was 077_quiz_language_filter.sql). If a collision is observed at
--   apply time, renumber to the next free slot.
-- =========================================================================

BEGIN;

-- ---- 1. Bucket --------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('chore-evidence', 'chore-evidence', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ---- 2. Storage RLS policies -----------------------------------------
-- Drop-and-recreate so this migration is idempotent.

DROP POLICY IF EXISTS chore_evidence_teen_insert ON storage.objects;
CREATE POLICY chore_evidence_teen_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chore-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS chore_evidence_visibility ON storage.objects;
CREATE POLICY chore_evidence_visibility
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chore-evidence'
    AND (
      -- Teen owner
      (storage.foldername(name))[1] = auth.uid()::text
      -- Linked parent
      OR EXISTS (
        SELECT 1
          FROM public.parent_teen_links l
         WHERE l.parent_id = auth.uid()
           AND l.teen_id::text = (storage.foldername(objects.name))[1]
      )
      -- Admin
      OR EXISTS (
        SELECT 1
          FROM public.admin_roles a
         WHERE a.profile_id = auth.uid()
           AND a.role IN ('admin', 'super_admin')
      )
    )
  );

-- Optional: allow teen to delete their own pre-submission uploads. Keeping
-- writes locked to INSERT for now — completion rows are immutable once
-- recorded, so deletion is not part of the user-facing flow. Service-role
-- handles cleanup if ever needed (e.g. CNDP retention sweep).

COMMIT;

-- =========================================================================
-- END — chore-evidence bucket ready for /api/teen/evidence/sign-upload
-- once ALLOWED_BUCKETS is widened to include 'chore-evidence'.
-- =========================================================================
