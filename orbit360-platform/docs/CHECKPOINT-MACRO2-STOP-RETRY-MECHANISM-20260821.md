# Orbit 360 A&S — Checkpoint Macro-2 STOP_RETRY · 2026-08-21

## Autoridad

Este checkpoint NO reemplaza el `PLAN-MAESTRO-CONGELADO-DEFINITIVO-RUTA-PRODUCCION-ORBIT360-AYS-20260821.md`. Documenta el punto intermedio de Macro-2 para reanudación exacta.

## Estado preservado

- Macro-1: `CONTROL_PLANE_DEFINITIVE_PASS` — CLOSED_PASS.
- Progreso formal hacia primera producción: **62%**.
- Rootfix transversal de Macro-2: construido y validado localmente `107/107 PASS`.
- Performance sintética: 414 clientes / 620 pólizas; una carga de pólizas; cero `where('polizas')` por cliente.
- Candidata predecessor: artifact `9433944723`, source `c3bb825da2b1ecae08dabc2034c753482b086fec`.
- Runtime/browser/secrets/Firestore/datos/deploy/producción/main/merge: **no abiertos**.

## STOP_RETRY de mecanismo

Dos defectos de mecanismo fueron detectados antes de poder cerrar Macro-2:

1. `PIPELINE_MECHANISM_FAILURE:MACRO2_PREDECESSOR_EXTRACT_TARGET_TYPO_PRI` — el transportador definía `PRE` pero usaba `PRI` al extraer el predecessor.
2. `VALIDATOR_STALE:MACRO2_PROMOTION_REQUEST_STATUS_NOT_SCHEMA_AWARE` — el promotor exige el literal `MATERIALIZED_SOURCE_ONLY`; la primera recuperación proponía un literal de estado distinto aunque su schema era válido.

El request de recuperación quedó retirado con cero ejecuciones permitidas y sin replay. No debe existir un tercer intento ciego.

## Condición obligatoria para reabrir la materialización

Antes de cualquier nueva ejecución source-only debe pasar:

`node tools/orbit360-macro2-pipeline-preflight-v20260821.mjs`

El preflight debe probar conjuntamente:

- request one-shot compatible con el promotor;
- `PRE` correcto y ausencia de `PRI`;
- tres patch bundles con gzip SHA + raw SHA exactos;
- rebind explícito del request en el promotor;
- un solo remote push y cero `git pull --rebase`;
- cero runtime, browser, secrets, Firestore, deploy o producción;
- reapertura explícita posterior a `STOP_RETRY`.

Solo un `MACRO2_PIPELINE_PREFLIGHT_PASS` permite reabrir la etapa. Después, el cierre Macro-2 sigue exigiendo una única candidata legítima de 194 archivos, 9 deltas, 185 intactos, full rehash y `107/107 PASS` antes de preparar la autorización F2 fresca.
