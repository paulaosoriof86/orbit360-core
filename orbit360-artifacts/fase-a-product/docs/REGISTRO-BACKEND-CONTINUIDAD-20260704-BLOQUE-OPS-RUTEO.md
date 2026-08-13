# Registro backend continuidad — bloque Ops, ruteo y notificaciones

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft

## Bloque trabajado

Se continuó el plan backend revisando la candidata activa v1.123 y el hallazgo de Paula:

- Ops mezcla solicitudes de clientes/asesores en `Gestiones Admin`;
- pago reportado por cliente debe avisar al asesor;
- todos los movimientos del cliente deben generar comunicación y trazabilidad;
- Academia/manuales deben actualizarse cuando cambie el flujo.

## Archivos creados

- `CONTRATO-OPS-RUTEO-GESTIONES-NOTIFICACIONES-AYS-20260704.md`
- `PLAN-AUDITORIA-OPS-RUTEO-NOTIFICACIONES-20260704.md`
- `MATRIZ-NOTIFICACIONES-GESTIONES-CLIENTE-ASESOR-OPS-20260704.md`
- `AUDITORIA-DIAGNOSTICO-OPS-RUTEO-NOTIFICACIONES-V123-20260704.md`
- `CONTRATO-COLECCION-GESTIONES-LAB-AYS-20260704.md`
- `PENDIENTES-CLAUDE-OPS-PORTAL-GESTIONES-V123-20260704.md`

## Hallazgo confirmado

La candidata v1.123 crea gestiones, pero el modelo y la UX todavía no clasifican suficiente:

- `opsListas` tiene pocas listas;
- `tiposGestion` manda demasiadas solicitudes a `Gestiones Admin`;
- `reportarPago()` fuerza la gestión a `Gestiones Admin`;
- el soporte de pago queda como nombre en el cobro, no como documento persistente;
- falta `conciliacionBanco` en el flujo de portal pago;
- falta notificación formal y trazable al asesor;
- falta estado separado para cliente y asesor.

## Decisión

Separar corrección en dos carriles:

### Claude/frontend

- listas/filtros visibles en Ops;
- ruteo visual de pagos, documentos, siniestros, cancelaciones y soporte portal;
- soporte visible como adjunto/documento demo;
- estado cliente/asesor visible;
- copy honesto de notificaciones no conectadas.

### ChatGPT/Codex/backend

- contrato canónico de `gestiones`;
- contrato de `notificaciones`;
- validador/smoke contra anti-regresiones;
- relación con `documentos` y `conciliacionBanco`;
- futuro Storage/Auth/tenant cuando corresponda.

## Próximo paso recomendado

Crear validador seguro de contratos/anti-regresiones para detectar:

- `pago_reportado` o `Validar pago reportado` en `Gestiones Admin`;
- gestiones con adjuntos pero sin `documentoIds[]`;
- pagos reportados sin `conciliacionId`;
- solicitudes de Portal sin `estadoCliente`;
- gestiones de cliente sin `asesorId`;
- notificaciones sin audiencia/destinatario.

## Estado

Documentado. No se tocó `data/store.js`, Firestore, deploy, main ni datos reales.
