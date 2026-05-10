alter table if exists public.scans
  add column if not exists doctor_notes text;
