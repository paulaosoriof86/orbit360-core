# Addendum Claude — post auditoría candidata v1330 `2026-07-08T135740`

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Estado

Claude ya no tiene capacidad. Este addendum queda para futuro paquete, pero principalmente sirve para que ChatGPT/Codex continúe corrigiendo desde esta última candidata auditada.

## Qué sí conservar de la candidata

- Portal Cliente con estados más honestos para pago reportado.
- Soporte visible por nombre en Portal.
- Rechazo de reporte en Cobros con motivo y trazabilidad.
- Cliente360 con pestaña Documentos.
- Documento general del Portal como metadata-only.
- Conciliaciones separadas de aplicación de pago.
- Academia con rutas Portal/Cobros/Cliente360/Documentos/M5/Admin.

## Qué corregir antes de cierre total

- Soporte de pago debe generar documento/adjunto metadata-only, no solo `soporteNombre`.
- Cobros no puede usar base64/FileReader para factura.
- Validar reporte y aplicar pago deben exigir motivo.
- Aplicar pago debe validar país/moneda.
- Conciliación validada debe ser no aplicada.
- Validar conciliación requiere motivo y país/moneda.
- Anular conciliación requiere confirmación reforzada.
- Config/Equipo deben tener gates reales en los flujos principales.
- Credenciales/key/token no deben guardarse en frontend/store.
- Academia debe incorporar roles/permisos y auditoría unificada.

## Instrucción para futura candidata Claude

No afirmar que los 7 ítems están cerrados si no cumple P0. La candidata actual es base incremental, pero necesita hotfix selectivo.

## Estado

Addendum documentado para continuidad.