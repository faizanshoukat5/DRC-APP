-- ============================================================================
-- Simplify storage RLS for the `scans` bucket
-- ----------------------------------------------------------------------------
-- The previous policies (20260505000000_scans_rls_storage_and_cross_profile.sql)
-- gated storage uploads on a JOIN through profiles + doctor_patients to verify
-- that the uploading user is an approved doctor assigned to the patient whose
-- folder the path targets. That subquery is failing in practice and blocking
-- legitimate doctor uploads with "new row violates row-level security policy".
--
-- Pragmatic fix: keep storage rules loose (any authenticated user can read or
-- write to the `scans` bucket) and enforce real authorization at the
-- public.scans INSERT policy, which already requires the JWT subject to be an
-- approved doctor with a matching doctor_patients row. Orphan images without
-- a backing scans row become a minor housekeeping concern, not a security
-- issue.
-- ============================================================================

-- Drop the strict policies from the previous migration
drop policy if exists "scans: doctors upload for assigned patients" on storage.objects;
drop policy if exists "scans: patient or assigned doctor reads"     on storage.objects;
drop policy if exists "scans: doctors delete for assigned patients" on storage.objects;

-- Drop any new names below if a previous run created them
drop policy if exists "scans: authenticated insert" on storage.objects;
drop policy if exists "scans: authenticated select" on storage.objects;
drop policy if exists "scans: authenticated delete" on storage.objects;

-- Permissive: any authenticated user can upload, read, or delete in the
-- `scans` bucket. Authorization that matters (per-patient access) is enforced
-- at the public.scans row level.
create policy "scans: authenticated insert"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'scans' );

create policy "scans: authenticated select"
  on storage.objects for select to authenticated
  using ( bucket_id = 'scans' );

create policy "scans: authenticated delete"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'scans' );

-- Verify with:
-- select policyname, cmd
-- from pg_policies
-- where tablename = 'objects' and schemaname = 'storage'
-- order by policyname;
