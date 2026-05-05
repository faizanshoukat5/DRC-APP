-- ============================================================================
-- Scans RLS + cross-profile access + storage buckets and policies
-- ----------------------------------------------------------------------------
-- Purpose:
--   The committed migrations only grant `service_role` access to public.scans,
--   so authenticated mobile clients (using the publishable/anon key) cannot
--   insert, read, or update scans under their own JWT. Doctors also need to
--   see assigned-patient profiles and vice versa.
--
--   The mobile app uploads fundus images to bucket `scans/<patient_id>/...`,
--   the web/server uploads to `images/...`. Neither bucket is created in any
--   migration and neither has storage RLS configured.
--
--   This migration is fully idempotent: every CREATE is preceded by a
--   matching DROP IF EXISTS, so it is safe to re-run on a project that has
--   policies created via the dashboard.
-- ============================================================================

-- =====================================================================
-- 1. public.scans  --  RLS for authenticated users
-- =====================================================================

-- patient_id is TEXT (see 20251213113312_create_scans_table.sql) but
-- profiles.id, doctor_patients.patient_id, and auth.uid() are UUID.
-- Always cast on the boundary.

drop policy if exists "Patients can view own scans"            on public.scans;
drop policy if exists "Doctors can view assigned patient scans" on public.scans;
drop policy if exists "Admins can view all scans"               on public.scans;
drop policy if exists "Doctors can insert scans for patients"   on public.scans;
drop policy if exists "Doctors can update scans for patients"   on public.scans;
drop policy if exists "Admins can update all scans"             on public.scans;

-- SELECT --------------------------------------------------------------
create policy "Patients can view own scans"
  on public.scans for select to authenticated
  using ( auth.uid()::text = patient_id );

create policy "Doctors can view assigned patient scans"
  on public.scans for select to authenticated
  using (
    exists (
      select 1
      from public.doctor_patients dp
      where dp.doctor_id = auth.uid()
        and dp.patient_id::text = public.scans.patient_id
    )
  );

create policy "Admins can view all scans"
  on public.scans for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- INSERT --------------------------------------------------------------
-- Approved doctors may insert scans for their assigned patients.
create policy "Doctors can insert scans for patients"
  on public.scans for insert to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      join public.doctor_patients dp on dp.doctor_id = p.id
      where p.id = auth.uid()
        and p.role = 'doctor'
        and p.status = 'approved'
        and dp.patient_id::text = public.scans.patient_id
    )
  );

-- UPDATE --------------------------------------------------------------
-- Doctors can update (e.g. add doctor_notes) their assigned patients' scans.
create policy "Doctors can update scans for patients"
  on public.scans for update to authenticated
  using (
    exists (
      select 1
      from public.doctor_patients dp
      where dp.doctor_id = auth.uid()
        and dp.patient_id::text = public.scans.patient_id
    )
  )
  with check (
    exists (
      select 1
      from public.doctor_patients dp
      where dp.doctor_id = auth.uid()
        and dp.patient_id::text = public.scans.patient_id
    )
  );

create policy "Admins can update all scans"
  on public.scans for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );


-- =====================================================================
-- 2. public.profiles  --  cross-user access
-- =====================================================================

drop policy if exists "Doctors can view their patient profiles" on public.profiles;
drop policy if exists "Patients can view their doctor profile" on public.profiles;

-- Doctors can SELECT the profile of any patient assigned to them.
create policy "Doctors can view their patient profiles"
  on public.profiles for select to authenticated
  using (
    exists (
      select 1 from public.doctor_patients dp
      where dp.doctor_id = auth.uid()
        and dp.patient_id = public.profiles.id
    )
  );

-- Patients can SELECT the profile of any doctor they are assigned to.
create policy "Patients can view their doctor profile"
  on public.profiles for select to authenticated
  using (
    public.profiles.role = 'doctor'
    and exists (
      select 1 from public.doctor_patients dp
      where dp.patient_id = auth.uid()
        and dp.doctor_id = public.profiles.id
    )
  );

-- Optionally: any approved doctor is visible in the SelectDoctor list.
-- This duplicates getApprovedDoctors() from mobile/src/lib/api.ts.
drop policy if exists "Approved doctors are publicly listable" on public.profiles;
create policy "Approved doctors are publicly listable"
  on public.profiles for select to authenticated
  using (
    public.profiles.role = 'doctor'
    and public.profiles.status = 'approved'
  );


-- =====================================================================
-- 3. Storage buckets  --  create both buckets used by the app
-- =====================================================================

-- Mobile app writes here: <patient_id>/<timestamp>.<ext>
insert into storage.buckets (id, name, public)
  values ('scans', 'scans', true)
  on conflict (id) do nothing;

-- Web server (server/routes.ts) writes here: images/<timestamp>_<rand>.<ext>
insert into storage.buckets (id, name, public)
  values ('images', 'images', true)
  on conflict (id) do nothing;
-- NOTE: kept public=true to match the existing code path that calls
-- getPublicUrl() and stores the public URL directly. If you switch to signed
-- URLs later, set public=false here and adjust the application code.


-- =====================================================================
-- 4. storage.objects  --  RLS for the `scans` bucket
-- =====================================================================
-- Path convention for `scans` bucket: <patient_id>/<timestamp>.<ext>
-- The first path segment is extracted via (storage.foldername(name))[1].

drop policy if exists "scans: doctors upload for assigned patients" on storage.objects;
drop policy if exists "scans: patient or assigned doctor reads"      on storage.objects;
drop policy if exists "scans: doctors delete for assigned patients"  on storage.objects;

create policy "scans: doctors upload for assigned patients"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'scans'
    and exists (
      select 1
      from public.profiles p
      join public.doctor_patients dp on dp.doctor_id = p.id
      where p.id = auth.uid()
        and p.role = 'doctor'
        and p.status = 'approved'
        and dp.patient_id::text = (storage.foldername(name))[1]
    )
  );

create policy "scans: patient or assigned doctor reads"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'scans'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (
        select 1 from public.doctor_patients dp
        where dp.doctor_id = auth.uid()
          and dp.patient_id::text = (storage.foldername(name))[1]
      )
    )
  );

create policy "scans: doctors delete for assigned patients"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'scans'
    and exists (
      select 1 from public.doctor_patients dp
      where dp.doctor_id = auth.uid()
        and dp.patient_id::text = (storage.foldername(name))[1]
    )
  );


-- =====================================================================
-- 5. storage.objects  --  RLS for the `images` bucket
-- =====================================================================
-- Path convention for `images` bucket: images/<timestamp>_<rand>.<ext>
-- The web server writes via service_role, which bypasses RLS, so we only
-- need policies for the public-read path used by getPublicUrl(). Reads
-- against a `public=true` bucket already work without policies, but adding
-- an explicit SELECT policy keeps the door open for switching to private.

drop policy if exists "images: authenticated read" on storage.objects;
create policy "images: authenticated read"
  on storage.objects for select to authenticated
  using ( bucket_id = 'images' );


-- =====================================================================
-- 6. Done. Quick verification queries (run manually after applying):
-- =====================================================================
-- select policyname, cmd from pg_policies where tablename = 'scans';
-- select policyname, cmd from pg_policies where tablename = 'profiles';
-- select policyname, cmd from pg_policies where tablename = 'objects' and schemaname = 'storage';
-- select id from storage.buckets where id in ('scans', 'images');
