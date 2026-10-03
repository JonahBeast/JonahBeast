-- Lo que la IA ve en una foto y no está en la app ya NO se convierte solo
-- en un pedido a nombre del alumno (la IA puede confundirse de plato y el
-- alumno recibía avisos de algo que no pidió). Queda anotado en
-- platos_no_encontrados para el panel, y la app le pregunta al alumno si lo
-- comió: solo si toca "Sí, pedirlo" se crea el pedido (origen app).
drop trigger if exists pedido_desde_foto on public.platos_no_encontrados;
