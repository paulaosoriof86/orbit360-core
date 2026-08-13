# Orbit 360 A&S — Sourcefix v24 · canonical evidence handoff

Fecha: 2026-08-07  
Bloque: 1 — Cliente 360 + Aseguradoras  
Gate: `block1-client360-insurers-lab-v20260717`  
Contrato canónico: `1.0.41`  
HEAD canónico de autorización: `ef9e0e1e738ce407025ed159067d8b3cc4d2683b`  
Baseline source v23 de referencia: `93ae0289bd6c415941a17b214f24cdb6fa05ca06`

## Causa raíz exclusiva

`PIPELINE_MECHANISM_FAILURE / MULTILINE_CANONICAL_PREFLIGHT_STDOUT_LAST_LINE_PARSE`

En v23 el package nativo pasó 32/32 y el entrypoint canónico `1.0.41` pasó 20/20. El wrapper posterior intentó interpretar únicamente la última línea de stdout pretty/multilínea; esa línea era `}`, el parse quedó vacío y generó un falso STOP.

## Corrección v24

La decisión deja de depender de stdout. El wrapper:

1. elimina cualquier `preflight-sanitizado.json` anterior antes de invocar el canónico;
2. ejecuta el mismo entrypoint canónico congelado;
3. exige que la evidencia JSON sanitizada sea recreada por esa invocación;
4. valida gateId, contrato `1.0.41`, fase, status, `ok`, owner, engine, exact runtime artifact y capacidades;
5. falla cerrado ante evidencia ausente, inválida, stale o inconsistente.

Autoridad machine-readable:
`orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json`.

## Congelados

No se modifican respecto del baseline v23:
- owner canónico `1.0.41`, router y engine;
- matriz nativa y entrypoint runtime;
- observer event-driven;
- adjudicador 414/26/7;
- Cliente360, Aseguradoras, Pólizas y Cobros;
- PWA/Service Worker;
- store, adapter LAB, Auth, importador y Rules;
- scope `inicio / cliente360 / aseguradoras` y ledger no bloqueante.

## Fixtures v24

PASS esperado con stdout pretty/multilínea terminado en `}` cuando la evidencia estructurada es válida.

STOP esperado ante:
- evidencia ausente;
- JSON inválido;
- gateId incorrecto;
- contractVersion incorrecta;
- fase incorrecta;
- status no PASS;
- owner incorrecto;
- exact runtime artifact incorrecto;
- capacidades incorrectas;
- evidencia stale.

## Runtime autorizado después de source PASS

Solo después de source PASS:
- evidencia terminal source;
- transición explícita a runtime-pending;
- request v24 nuevo, exclusivo e inmutable;
- `GO_GATE_CONTRACT` antes de secretos;
- adjudicación LAB read-only 414/26/7 antes de Hosting/Playwright;
- si PASS: restore `visual-matrix-corrected-backup-31135532118`, backup, máximo un deploy Hosting LAB, precheck y matriz congelada;
- snapshot final idéntico y cero writes.

El token técnico `requestVersion` permanece igual al exigido por el owner `1.0.41`; el request nuevo se distingue y sella mediante `authorizationGeneration: v24-canonical-evidence-handoff` y una ruta v24 exclusiva.

## Clasificación

- fix: `PIPELINE_MECHANISM_FAILURE`;
- patrón reusable: `REPLICABLE_CLAUDE_ACUMULADO`;
- Academia: `ACADEMIA_ACTUALIZAR`;
- producto/backend: congelados.
