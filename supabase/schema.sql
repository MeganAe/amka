create extension if not exists "uuid-ossp";

create type user_role as enum ('ADMIN','RECEPTIONIST','MEDECIN_DIRECTEUR','PERCEPTEUR','PHARMACIEN','COMPTABLE');
create type sexe_type as enum ('MASCULIN','FEMININ');
create type consultation_status as enum ('EN_ATTENTE','EN_COURS','TERMINEE','ANNULEE');
create type payment_status as enum ('PENDING','COMPLETED','CANCELLED');
create type payment_method as enum ('CASH','MOBILE_MONEY','BANK_TRANSFER','INSURANCE');

create table profiles (
  id uuid references auth.users primary key,
  email text unique not null,
  first_name text not null,
  last_name text not null,
  role user_role not null default 'RECEPTIONIST',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table users (
  id uuid references auth.users primary key,
  email text unique not null,
  first_name text not null,
  last_name text not null,
  role user_role not null default 'RECEPTIONIST',
  is_active boolean default true,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', 'Utilisateur'),
    coalesce(new.raw_user_meta_data->>'last_name', 'AMKA'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'RECEPTIONIST'::user_role),
    true
  )
  on conflict (id) do nothing;

  insert into public.users (id, email, first_name, last_name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', 'Utilisateur'),
    coalesce(new.raw_user_meta_data->>'last_name', 'AMKA'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'RECEPTIONIST'::user_role),
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table patients (
  id uuid primary key default uuid_generate_v4(),
  numero_dossier text unique not null,
  nom text not null,
  prenom text not null,
  postnom text,
  sexe sexe_type not null,
  date_naissance date not null,
  telephone text,
  adresse text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table consultations (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) not null,
  medecin_id uuid references profiles(id) not null,
  motif text not null,
  diagnostic text,
  tension text,
  temperature float,
  poids float,
  traitement text,
  notes text,
  status consultation_status default 'EN_ATTENTE',
  date_consultation timestamptz default now(),
  created_at timestamptz default now()
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) not null,
  collected_by uuid references profiles(id),
  montant float not null,
  type text not null,
  mode_paiement payment_method not null,
  status payment_status default 'PENDING',
  notes text,
  created_at timestamptz default now()
);

create table medications (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  unit text not null,
  price float not null,
  stock int default 0,
  threshold int default 10,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table sales (
  id uuid primary key default uuid_generate_v4(),
  medication_id uuid references medications(id) not null,
  patient_id uuid references patients(id),
  sold_by uuid references profiles(id),
  quantity int not null,
  unit_price float not null,
  total_price float not null,
  sold_at timestamptz default now()
);

create table expenses (
  id uuid primary key default uuid_generate_v4(),
  description text not null,
  amount float not null,
  category text not null,
  date date not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table users enable row level security;
alter table patients enable row level security;
alter table consultations enable row level security;
alter table payments enable row level security;
alter table medications enable row level security;
alter table sales enable row level security;
alter table expenses enable row level security;

create policy "auth_profiles" on profiles for all using (auth.role()='authenticated');
create policy "auth_users" on users for all using (auth.role()='authenticated');
create policy "auth_patients" on patients for all using (auth.role()='authenticated');
create policy "auth_consultations" on consultations for all using (auth.role()='authenticated');
create policy "auth_payments" on payments for all using (auth.role()='authenticated');
create policy "auth_medications" on medications for all using (auth.role()='authenticated');
create policy "auth_sales" on sales for all using (auth.role()='authenticated');
create policy "auth_expenses" on expenses for all using (auth.role()='authenticated');
