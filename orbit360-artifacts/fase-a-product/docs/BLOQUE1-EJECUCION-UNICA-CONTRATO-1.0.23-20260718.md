# Bloque 1 · Ejecución única del contrato 1.0.23

Fecha: 2026-07-18

Repositorio: `paulaosoriof86/orbit360-core`

Rama: `ays/backend-tenant-lab-v99-20260703`

PR: #5 draft/open

Gate: `block1-client360-insurers-lab-v20260717`

## Estado de partida

- Bloque 0: `GO_STATIC_ARCHITECTURE`.
- Bloque 1: activo, no cerrado.
- Último gate oficial ejecutado: contrato 1.0.19, run `29651622670`, resultado `ok:false`.
- Primer fallo real: `PIPELINE_STEP_TIMEOUT:canonical_owner_handoff_ready`.
- Preflight, owners, conteos LAB, sincronización de usuario y publicación del canal LAB: aprobados.
- Conteos preservados: 414 clientes, 26 aseguradoras y 7 asesores.

## Clasificación

`PIPELINE_MECHANISM_FAILURE`.

La evidencia confirmó que el producto no era la causa del fallo. El observador repetía operaciones de evaluación no cancelables sobre el mismo hilo que debía completar el bootstrap.

## Corrección vigente

Contrato `1.0.23`: observación externa por requests, responses, requestfinished, señales runtime y eventos de parseo; sin modificar producto, Store, Auth, reglas, datos, Cliente 360 ni Aseguradoras.

## Ejecución autorizada

Este commit activa una sola ejecución del gate oficial sobre el HEAD vigente. El workflow debe ejecutar primero el preflight vinculante y solo se acepta evidencia sanitizada con `ok:true`.

Si vuelve a fallar la misma etapa, se detienen reintentos y se abre diagnóstico exclusivamente sobre gate/pipeline, sin otro parche ni modificación de módulos.

## Alcance

LAB únicamente. Sin producción, main, merge, reimportación ni datos personales en evidencia.
