-- Revisión de seguridad del 16 de octubre de 2026.
-- El alumno solo puede anotar su propio pago PENDIENTE con los métodos que
-- la app le ofrece para enviar captura: Yape, Plin o Transferencia. Antes
-- solo se prohibía "Mercado Pago", así que alguien podía crear un pendiente
-- que se hiciera pasar por "App Store" o "Google Play". Los pagos de Mercado
-- Pago, App Store y Google Play los registra solo el servidor (que no pasa
-- por esta regla) y el admin sigue pudiendo anotar cualquiera.
--
-- Reemplaza una regla que ya existe, por eso lleva DROP: aplicarla desde la
-- computadora o el editor SQL de Supabase (en el celular la confirmación
-- extra no llega). Las dos órdenes van juntas en una transacción.

begin;

drop policy "alumno crea su pago" on public.pagos;

create policy "alumno crea su pago" on public.pagos
  for insert
  with check (
    (
      username = private.current_username()
      and estado = 'pendiente'
      and metodo in ('Yape', 'Plin', 'Transferencia')
    )
    or private.is_admin()
  );

commit;
