# Brasa & Corte — Menú QR y paneles de gestión

Aplicación web estática (GitHub Pages) con datos y permisos reales en Supabase.

## Accesos

- **Carta pública:** `index.html`, lectura de platos publicados. `?vista=muestra` presenta la carta sin permitir pedidos.
- **Carta habilitada de una mesa:** `index.html?token=<QR_EMITIDO>`. El token lo genera el mozo, dura 4 horas o hasta su revocación y nunca se sustituye por un número de mesa editable.
- **Personal:** `login.html` (Supabase Auth).
- **Mozo:** `mozo.html` (mesas, QR seguro, pedidos, solicitudes de cuenta).
- **Administrador:** `admin.html` (productos, imágenes, mesas, pedidos y cuentas).
- **Vista adicional de mesas:** `mesas-online.html`.

## Arquitectura

| Parte | Archivos / tecnología |
|---|---|
| Carta de clientes | `index.html`, `catalogo-supabase.js`, `seguimiento-real.js` |
| Pedido y cuenta del cliente | RPC `place_qr_order` y `request_table_bill`, `cuenta-cliente-real.js` |
| Mesas y QR | `mozo-supabase.js`, `qr-seguro.js`, funciones Supabase |
| Administración | `admin-supabase.js`, tablas `menu_products`, `restaurant_tables`, `orders`, `bill_requests` |
| Autenticación | `auth-guard.js`, Supabase Auth, `staff`, RLS |
| Fotos de platos | Supabase Storage, bucket público `brasa-menu-images`; solo administradores pueden subir |
| Notificaciones | `push-mozo.js`, `push-cliente.js`, `sw.js` y funciones Edge de Supabase |

**Seguridad:** nunca poner service-role keys, secretos Web Push ni contraseñas en el repositorio. La clave pública de Supabase es intencionalmente visible; **RLS y las funciones RPC** controlan las operaciones. Un QR no otorga permisos de personal.

**Reglas de mesas:** `Ocupada` equivale a `enabled=true`; `Libre` y `Reservada` a `enabled=false`. No se puede desocupar una mesa con pedidos activos. Al desocuparla se revocan los QR vigentes desde la propia base de datos.

**Reglas de pedidos:** máximo 20 unidades por producto y 60 unidades por envío; Supabase verifica producto disponible, precio y token en el servidor.

## Verificación

Los cambios en `main` ejecutan GitHub Actions: **QA Brasa y Corte**, con `node --test tests/smoke.test.mjs`. Incluye controles de sintaxis JavaScript, archivos referenciados y consistencia básica de las tres pantallas.

Para probar manualmente sin tocar datos reales de clientes:

1. Abrir la carta pública sin token: solo lectura; no debe enviar pedidos.
2. Entrar como mozo habilitado; comprobar mesas y sus zonas.
3. Generar QR para una mesa libre; debe figurar habilitada/ocupada **tanto en el diálogo como en el panel principal**.
4. Abrir ese QR desde otro navegador; comprobar que muestra la mesa correcta.
5. Hacer un pedido de prueba con el QR (creará un pedido real en Supabase); revisarlo en mozo y administración.
6. Cambiar su estado y comprobar el seguimiento del cliente.
7. Pedir la cuenta y marcarla atendida.
8. Terminar el pedido, liberar la mesa y verificar que el QR deja de autorizar.
9. En administración, cambiar precio/disponibilidad, subir una foto y verificar su aparición en la carta.
10. Probar con usuario sin permisos de administrador y confirmar que no accede a ese panel.

**Precaución:** las pruebas de pedidos crean registros reales. No ejecutarlas contra un restaurante abierto al público sin un entorno de prueba.

## Funciones pendientes / límites

- **Delivery:** no tiene todavía un flujo real confirmado por el comercio. Los costos por zona en la maqueta son ilustrativos; no hay cobros ni pedidos reales a domicilio habilitados.
- **Realidad aumentada:** los modelos de referencia no garantizan dimensiones físicas exactas.
- **Pruebas visuales y dispositivos:** los smoke tests no reemplazan una prueba real en navegadores, Android/iPhone y con credenciales de roles distintos.
- **Fotos:** hasta 1 MB por archivo; PNG, JPG o WebP.

Mantener las migraciones y las reglas SQL versionadas cuando se cambie el esquema. No volver a mezclar datos locales de demostración con `restaurant_tables`, `orders` o `menu_products`.
