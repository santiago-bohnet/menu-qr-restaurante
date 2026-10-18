# Supabase — integración pendiente

La demo publicada en GitHub Pages usa localStorage. La sincronización real **aún no está activada**.

## Preparación segura

1. Crear o conectar el proyecto Supabase.
2. Ejecutar `schema.sql` una vez en SQL Editor. Si ya existen tablas/políticas, revisar antes de repetir.
3. Crear un usuario en Supabase Authentication, verificar su identidad y asociarlo en `public.admins` mediante el UUID de Auth.
4. Activar Realtime para `public.products` y `public.tables` (si se necesitan notificaciones instantáneas; alternativamente refrescar datos mediante consultas).
5. Crear un archivo de configuración público con URL y *publishable/anon key* (estas claves son públicas; las service_role/secret keys nunca van al frontend ni al repositorio).
6. Integrar las vistas `admin.html` e `index.html` con Supabase JS, Auth, Storage y eventos de cambios.
7. Validar RLS con usuario anónimo y usuario administrador y probar dos dispositivos distintos.

## Alcance de esta migración

- Un solo restaurante de prueba.
- Tablas: `products`, `tables`, `admins`.
- Almacenamiento: `plate-photos`; contenido público de la carta.
- Pedidos reales, sesiones QR temporales y seguridad por mesa **todavía no están incluidos**.
- No activar pedidos reales sin backend que valide mesa, stock, precios y autorización.

## Importante

El código SQL es la base inicial a revisar antes de ejecutarlo en producción.
Evitar cargar datos personales o claves privadas en el repositorio.
