# Registro backend continuidad — Cliente360 pagos y listas útiles

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft

## Bloque trabajado

Se continuó el bloque largo sobre pagos reportados, Cliente360, Ops, Leads, listas útiles y trazabilidad.

## Hallazgo agregado por Paula

El pago reportado por cliente tampoco aparece en la ficha Cliente360 / Pagos con estado pendiente de aprobación.

## Decisión

Todo pago reportado debe aparecer simultáneamente en:

- Portal del Cliente;
- Cliente360 / Recibos y pagos;
- Cobros / Conciliación;
- Ops / Pagos reportados o Conciliación;
- actividad/historial del cliente;
- notificaciones del asesor;
- estado visible para cliente.

## Archivos creados

- `CONTRATO-CLIENTE360-PAGOS-PENDIENTES-APROBACION-AYS-20260704.md`
- `MATRIZ-LISTAS-OPERATIVAS-OPS-LEADS-MODULOS-20260704.md`
- `ESPEC-VALIDADOR-OPS-PORTAL-CLIENTE360-GESTIONES-AYS-20260704.md`
- `PENDIENTES-CLAUDE-CLIENTE360-PAGOS-OPS-LEADS-V123-20260704.md`

## Intento de validador ejecutable

Se intentó crear el script:

```txt
tools/orbit360-validar-ops-portal-gestiones-ays.mjs
```

El conector bloqueó la subida del ejecutable. Para no frenar el avance, se creó la especificación completa del validador. Debe implementarse luego desde Codex/local o cuando el conector lo permita.

## Reglas reforzadas

- Las listas actuales del prototipo no son límite del producto.
- Si Ops, Leads, Cobros, Cliente360, Portal o cualquier módulo necesitan vistas/tabs/filtros/listas adicionales para operar mejor, deben crearse.
- No todo debe caer en listas genéricas.
- Pago reportado no marca cobro como pagado hasta aprobación/conciliación.
- Cliente360 debe mostrar estado pendiente de aprobación/conciliación.
- Asesor debe ser notificado de movimientos relevantes de sus clientes.

## Próximo paso recomendado

Continuar con contrato de `notificaciones` y matriz evento -> audiencia -> canal -> estado -> trazabilidad, porque ya se detectó que hoy existen varias capas de aviso no unificadas.

## Estado

Documentado. No se tocó `data/store.js`, Firestore, deploy, main ni datos reales.
