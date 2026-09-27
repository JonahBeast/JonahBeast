-- Manual de la app (docs/manual-app.md) guardado en la base, para que
-- Jarvis y el asistente de WhatsApp lo lean de aquí en vez de llevarlo
-- pegado en su código. Así, cambiar el manual ya no obliga a volver a
-- publicar esas funciones: después del merge se actualiza esta fila con el
-- texto que quedó en main.
--
-- Una sola fila (id = 1). Solo la leen las funciones con la llave de
-- servicio: RLS activo y sin políticas, así que la app no la ve.
create table if not exists public.manual_app (
  id smallint primary key default 1 check (id = 1),
  texto text not null,
  commit_main text,            -- commit de main del que salió el texto
  actualizado_en timestamptz not null default now()
);

alter table public.manual_app enable row level security;
