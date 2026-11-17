# Delivery por zonas — contrato acordado (17/11/2026)

Estado: propuesta en rama de revisión. No ejecutar SQL ni activar Supabase inactivo.

## Requisitos confirmados
- Zonas y tarifas editables por el administrador autorizado.
- Cobro **fuera de la aplicación**: efectivo, transferencia o tarjeta al recibir, sin capturar credenciales.
- El comercio define zonas reales, montos ARS y disponibilidad; nunca cargar montos ficticios en pedidos de clientes.
- Si la zona no tiene tarifa activa, la solicitud queda **pendiente de cotización**, sin afirmar un total final.
- El backend recalcula precios de productos y tarifa de envío en el momento de aceptar el pedido; **no** confía en un monto enviado desde JavaScript.
- Las tarifas se congelan por pedido confirmado para que posteriores cambios de precios no alteren pedidos históricos.
- Los cambios de tarifas y estados requieren cuenta de administrador y dejan traza de auditoría.

## Estructura de datos propuesta (para la futura migración)
`delivery_zones(id uuid PK, code text UNIQUE, name text, fee_ars numeric(12,2) CHECK (fee_ars >= 0), enabled boolean, version bigint)`.
`delivery_orders` deberá guardar `zone_code`, `quoted_delivery_fee_ars`, `confirmed_delivery_fee_ars`, `confirmed_at`; los nombres reales se ajustarán a la estructura de tablas existente, previa inspección de migraciones.

## Seguridad y compatibilidad
- Exponer a visitantes solo zonas activas y su tarifa pública mediante vista con `security_invoker=true` o RPC de lectura revisada.
- `anon` no debe tener acceso de escritura a `delivery_zones`; el rol administrador se verifica en el servidor, no solo en la UI.
- El RPC `place_delivery_order` deberá volver a consultar la zona y la tarifa; rechazar códigos inexistentes y cantidades inválidas.
- Mantener notificaciones a mozo/administrador y estados actuales.
- Pruebas: zonas activas/inactivas, cambios simultáneos de precio, tarifa cero, zona desconocida, permisos de administrador, RLS y reintento de pedido.

## Criterio de aceptación
Un administrador puede crear/editar/deshabilitar zonas, un cliente ve únicamente opciones vigentes, el servidor calcula importes verificables y se conserva la cotización confirmada en cada pedido, sin cobros online.

**Bloqueo actual:** el proyecto Supabase existente figura INACTIVE y el esquema real no se ha podido inspeccionar. No ejecutar migraciones contra ese proyecto sin autorización posterior.
