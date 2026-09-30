-- Presupuesto de avisos: cada push automático que se manda a un alumno
-- (recordatorios, rachas, plan por vencer…) se anota aquí. Antes de mandar
-- otro, las tareas automáticas revisan que ese alumno no haya recibido ya 3
-- hoy y que ese momento del día (mañana, mediodía, noche) no se haya usado.
-- No guarda el texto del aviso ni datos de la cuenta. Solo el admin la lee.
create table if not exists public.avisos_enviados (
  id bigint generated always as identity primary key,
  username text not null,
  tipo text not null,
  momento text check (momento is null or momento in ('manana', 'mediodia', 'noche')),
  fecha date not null,
  enviado_en timestamptz not null default now()
);
create index if not exists avisos_enviados_fecha_username on public.avisos_enviados (fecha, username);
alter table public.avisos_enviados enable row level security;
drop policy if exists "admin lee avisos enviados" on public.avisos_enviados;
create policy "admin lee avisos enviados" on public.avisos_enviados
  for select using (private.is_admin());
