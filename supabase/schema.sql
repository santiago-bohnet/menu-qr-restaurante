-- Brasa & Corte / esquema inicial de sincronización.
-- Ejecutar en el SQL Editor del proyecto Supabase. No habilitar escrituras anónimas.
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.products (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '',
  category text not null,
  price integer not null check (price >= 0),
  image_path text,
  available boolean not null default true,
  updated_at timestamptz not null default now()
);
create table if not exists public.tables (
  id bigint generated always as identity primary key,
  number integer unique not null check(number between 1 and 999),
  status text not null default 'Libre' check (status in ('Libre','Ocupada','Reservada')),
  updated_at timestamptz not null default now()
);
create or replace function public.is_restaurant_admin()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.admins where user_id = (select auth.uid()))
$$;
revoke all on function public.is_restaurant_admin() from public;
grant execute on function public.is_restaurant_admin() to authenticated, anon;
alter table public.admins enable row level security;
alter table public.products enable row level security;
alter table public.tables enable row level security;
create policy "admins read selves" on public.admins for select to authenticated using(user_id=(select auth.uid()));
create policy "public read products" on public.products for select to anon,authenticated using (true);
create policy "admin insert products" on public.products for insert to authenticated with check (public.is_restaurant_admin());
create policy "admin update products" on public.products for update to authenticated using (public.is_restaurant_admin()) with check(public.is_restaurant_admin());
create policy "admin delete products" on public.products for delete to authenticated using (public.is_restaurant_admin());
create policy "public read tables" on public.tables for select to anon,authenticated using(true);
create policy "admin insert tables" on public.tables for insert to authenticated with check(public.is_restaurant_admin());
create policy "admin update tables" on public.tables for update to authenticated using(public.is_restaurant_admin()) with check(public.is_restaurant_admin());
-- Fotos: bucket público solo para lectura; escrituras autenticadas y autorizadas.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('plate-photos','plate-photos',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy "public view plate photos" on storage.objects for select to anon,authenticated using(bucket_id='plate-photos');
create policy "admin upload plate photos" on storage.objects for insert to authenticated with check(bucket_id='plate-photos' and public.is_restaurant_admin());
create policy "admin update plate photos" on storage.objects for update to authenticated using(bucket_id='plate-photos' and public.is_restaurant_admin()) with check(bucket_id='plate-photos' and public.is_restaurant_admin());
create policy "admin delete plate photos" on storage.objects for delete to authenticated using(bucket_id='plate-photos' and public.is_restaurant_admin());
-- El primer usuario administrador debe crearse manualmente por un operador de confianza:
-- insert into public.admins(user_id) values ('UUID-DEL-USUARIO-AUTH');
-- Tabla products y tables: activar Realtime tras revisar consumo y permisos.
