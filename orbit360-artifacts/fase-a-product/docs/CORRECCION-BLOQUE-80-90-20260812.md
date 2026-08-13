# Orbit 360 — Corrección acumulativa Bloque 80→90

Fecha: 2026-08-12
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Causa raíz y corrección

La auditoría de la ruta posterior a Cobros 10.10.2 confirmó dos mecanismos distintos:

1. `PIPELINE_MECHANISM_FAILURE`: `financiero_historico` tenía contrato de normalización, promoción selectiva posterior a `finmovs` y validadores, pero no writer durable para persistir el histórico como fuente independiente.
2. `VALIDATOR_STALE`: el workflow histórico `orbit360-planillas-comisiones-linkage-readonly-v20260801.yml` todavía exigía el lifecycle `PLANILLAS_COMMISSION_DRYRUN_ACTIVE`, aunque el lifecycle vigente está correctamente cerrado como `PLANILLAS_COMMISSION_CONTROLLED_WRITE_CLOSED`. El run 31628265512 / job 94220207755 se detuvo antes del gate, secrets y Firestore, sin escrituras.

## Implementación

- Se agregó `tools/orbit360-financiero-historico-canonical-apply-v20260812.mjs`.
- El destino durable es exclusivamente `financiero_historico`.
- El writer es tenant-bound, determinístico, idempotente y fail-closed.
- `REQUIERE_VALIDACION` permanece retenido y no se escribe.
- La escritura operacional está prohibida para `finmovs`, `cobros`, `recibosEsperados`, `carteraPrimas`, `polizas` y `clientes`.
- La promoción posterior a `finmovs` permanece separada y no se ejecuta desde este writer.
- El modo `WRITE` requiere request explícito e inmutable con digests y alcance fijados; no fue ejecutado en este cierre source-only.
- Se agregó validador sintético source-only y preflight acumulativo 80→90.
- El workflow histórico de Comisiones quedó `HISTORICAL_CLOSED_DO_NOT_REUSE`, sin secrets, Firestore, escrituras ni deploy, y el request histórico fue restaurado a su contenido congelado original.

## Evidencia reutilizada

El preflight acumulativo reutiliza, sin reabrir ni reescribir, los cierres ya aceptados de:

- Pólizas.
- Vehículos.
- Recibos/cartera.
- Planillas/Comisiones.
- Cobros 10.10.2.

El snapshot post-Cobros usado como evidencia viva mantiene: 1375 pólizas, 1294 recibos, 7 cobros y 1 finmov; Cobros 10.10.2 reporta 0 escrituras a pólizas, recibos y finmovs.

## Pruebas source-only

Workflow: `Orbit360 Block 80-90 Source Only`.

Controles:

- sintaxis de writer y validadores;
- cierre histórico de Comisiones reconocido como evidencia, sin reutilizar su workflow antiguo;
- snapshot post-Cobros 10.10.2;
- contrato canónico `financiero_historico`;
- prueba sintética: 1 IMPORTABLE + 1 REQUIERE_VALIDACION;
- rechazo de destino `finmovs`;
- rechazo de filas sin decisión explícita de persistencia;
- 0 secrets;
- 0 Firestore;
- 0 escrituras;
- 0 deploy;
- 0 producción.

Decisión esperada: `GO_BLOCK_80_90_SOURCE_ONLY`.

## Clasificación y reutilización

- Writer durable: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Patrón arquitectónico reusable (writer tenant-bound, idempotencia, holds, separación fuente/promoción): `REPLICABLE_CLAUDE_ACUMULADO` sin datos reales, secretos ni backend protegido.
- Corrección de workflow/gate: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Academia: `ACADEMIA_ACTUALIZAR` con la diferencia entre `PIPELINE_MECHANISM_FAILURE` y `VALIDATOR_STALE`, y con la separación entre persistencia durable de una fuente histórica y su promoción operacional selectiva.

## Estado

Este cierre no autoriza ni ejecuta escrituras reales de `financiero_historico`, no reimporta los registros históricos y no promueve nada a `finmovs`. Su alcance es corregir el mecanismo faltante y certificar source-only que la ruta 80→90 reutiliza los cierres vigentes sin reabrir módulos ya cerrados.
