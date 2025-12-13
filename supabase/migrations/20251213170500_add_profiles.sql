create table if not exists profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    email text not null,
    role text not null check (role in ('patient', 'doctor', 'admin')),
    status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
    name text not null,
    phone text,
    date_of_birth date,
    gender text,
    address text,
    license_number text,
    specialty text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists profiles_role_status_idx on profiles (role, status);

alter table profiles enable row level security;

create policy "Profiles: select own" on profiles for select using (auth.uid() = id);
create policy "Profiles: insert self" on profiles for insert with check (auth.uid() = id and role <> 'admin');
create policy "Profiles: update self" on profiles for update using (auth.uid() = id);

create or replace function set_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
before update on profiles
for each row execute procedure set_profiles_updated_at();
