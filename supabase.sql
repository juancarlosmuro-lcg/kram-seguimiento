-- =====================================================================
-- LCG · Seguimiento Comercial — Preparación de la base compartida
-- ---------------------------------------------------------------------
-- Copia TODO este archivo y pégalo en Supabase → SQL Editor → Run.
-- Se puede correr varias veces sin romper nada.
--
-- Qué hace:
--   1. Crea la tabla donde vive el seguimiento del equipo.
--   2. Activa la seguridad: sin haber iniciado sesión, la tabla no
--      devuelve ni acepta absolutamente nada.
--   3. Enciende el tiempo real para que los cambios se vean al instante.
--
-- La base de las 42 cuentas NO se guarda aquí: vive en data.js. Esta
-- tabla solo guarda lo que el equipo captura.
-- =====================================================================

-- 1. Tabla -------------------------------------------------------------
create table if not exists public.seguimiento (
  id               text primary key,
  empresa          text,
  estatus          text        not null default 'Pendiente',
  fecha_cita       date,
  notas            text        default '',
  actualizado_por  text        default '',
  actualizado_en   timestamptz not null default now()
);

comment on table public.seguimiento is
  'Seguimiento comercial KRAM. Una fila por cuenta trabajada; la base de cuentas vive en data.js.';

-- 2. Seguridad ---------------------------------------------------------
-- Con RLS encendida y sin políticas para "anon", la llave pública del
-- sitio por sí sola no sirve de nada: hace falta la contraseña del equipo.
alter table public.seguimiento enable row level security;

drop policy if exists "equipo lee"       on public.seguimiento;
drop policy if exists "equipo inserta"   on public.seguimiento;
drop policy if exists "equipo actualiza" on public.seguimiento;
drop policy if exists "equipo borra"     on public.seguimiento;

create policy "equipo lee"       on public.seguimiento for select to authenticated using (true);
create policy "equipo inserta"   on public.seguimiento for insert to authenticated with check (true);
create policy "equipo actualiza" on public.seguimiento for update to authenticated using (true) with check (true);
create policy "equipo borra"     on public.seguimiento for delete to authenticated using (true);

-- 3. Tiempo real -------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.seguimiento;
exception
  when duplicate_object then null;   -- ya estaba activada
end
$$;

-- Listo. Ahora crea el usuario del equipo en Authentication → Users.
