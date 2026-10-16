-- ¿Desde dónde usa la app cada alumno? (pedido por Jonah el 16 de octubre,
-- tras el cupón de Yara: el link con cupón abrió la app de Play Store, donde
-- los cupones no valen). Una columna nueva en estado_avisos, que la app ya
-- llena al abrirse: 'play' si la usa desde la app de Play Store, 'ios' si
-- desde la app de iPhone, vacío si desde el navegador (web o instalada
-- desde Chrome/Safari). Con eso, el panel arma el mensaje del cupón sin el
-- link para quien usa una app de tienda. No toca ningún dato existente.

alter table public.estado_avisos add column if not exists app_tienda text check (app_tienda is null or app_tienda in ('play', 'ios'));
