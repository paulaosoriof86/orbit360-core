# Gravicentra Insurance — B4-003 · Metas institucionales preparadas, no integradas

**Fecha:** 2026-10-29  
**Gate:** `I6.5/B4-003`  
**Estado:** `PATCH_AND_SYNTHETIC_QA_PREPARED_NOT_PRODUCT_SOURCE`

## Autoridad y candidata vigente

- Rama: `recovery/fase-a-clean-20260831`
- HEAD de partida: `3b3ad87beb3c8b8566b2ec419bc6a102aa497c05`
- Fuente exacta de Preview vigente: `49c4e9af7b6ec7eb0a08c365831274c225fba763`
- Build: `gi-i65-b4-49c4e9af7b6e-57f234755dc1`
- Run Preview: `40991698979`
- Estado de Control Plane: UAT autenticada y cierre P0 pendientes.

## Hallazgo atendido

`B4-003-P0-20261012-INSTITUTIONAL-GOALS`

El owner actual `Equipo → Metas` solo expone metas individuales por asesor. El backend de Inicio ya distingue metas globales sin `asesorId`, pero faltaba preparar una UI administrable que reutilizara el mismo writer durable y preservara metas individuales.

## Parche preparado

- Base `orbit360-platform/modules/equipo.js`: blob `9e76fbcb70d5a19b8b58aeb72b9fad7acd0bbecf`
- Blob propuesto local: `5ce317a0641709e1a405e61435578de934fa194d`
- SHA-256 propuesto: `1e420f64034cc9d79c03687d4808f8b85d85d576e928b008582a0ab0ebd1b3bf`
- Patch SHA-256: `1225379eaac459d97b74b6a3ec1dffb4e7566df7820ae3c158bde8be77bf1ff8`

El parche:

1. conserva metas individuales;
2. reutiliza la colección canónica `metas`;
3. reutiliza `batchDurable` y su readback canónico;
4. representa la meta institucional sin `asesorId`;
5. restringe edición a Dirección, SuperAdmin, AdminTenant y Admin con permiso efectivo `equipo/edit`;
6. registra auditoría mediante el owner existente;
7. no inventa contrato ni elegibilidad de freelancers.

## QA ejecutado

- `node --check`: PASS
- Harness sintético: `15/15 PASS`
- Firestore/Firebase: no accedido
- Writes operativos: 0
- Auth/IAM/Rules: sin cambios
- LIVE: sin cambios

## Límite y siguiente acción

Este recibo y sus adjuntos preservan una propuesta comprobada, pero **no modifican product source**, no crean nueva Preview y no cierran el P0. La integración válida exige un commit atómico de source + prueba + receipt + composición/Control Plane/guard, seguido de Preview exacta, UAT autenticada, write sintético controlado, readback, reload y auditoría.
