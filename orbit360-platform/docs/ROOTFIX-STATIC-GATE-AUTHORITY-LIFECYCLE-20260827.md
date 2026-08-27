# ROOTFIX — Autoridad estática de gates y lifecycle ledger-only

Fecha: 2026-08-27  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Baseline pre-rootfix: `3b2abfa3dc5aac4de3fc4230e061adfcf4bb2c40`

## Clasificación

`PIPELINE_MECHANISM_FAILURE`, con manifestaciones `VALIDATOR_STALE`. Producto congelado. Sin datos, Firebase, secrets, browser, deploy ni producción.

## Causa raíz demostrada

La convergencia single-state había dejado fuera una familia histórica todavía ejecutable: registry de gates, router/preflight, lifecycle y engines. El registry y el router podían divergir; Ops/Leads ya presentaba un nombre de lifecycle distinto. Además, lifecycle antiguos almacenaban fase, autorizaciones, ejecuciones y resultados, y engines históricos los leían para decidir ejecución. Existía una segunda autoridad mutable paralela al ledger.

El self-test previo `33103145902` / job `98625879955` interceptó esta familia antes de runtime con `STATIC_GATE_BINDING_DEPENDENCY_MISSING:fase-a-ops-leads-crm-release-lab-v20260812::default`. No correspondía corregir un solo nombre y reintentar.

## Rootfix

- 16 bindings quedan en `historicalBindings`, todos `HISTORICAL_FROZEN_NO_EXECUTION`.
- 15 lifecycle pasan a tombstones idénticos, sin identidad duplicada ni estado mutable. La identidad/configuración vive solo en el registry; el estado vive solo en el ledger.
- 14 engines distintos pasan a stubs que importan una cerca fail-closed única.
- F2 conserva su autoridad estática `3.0.0-single-state`, histórica/no ejecutable.
- Router canónico y router legacy quedan inertes; no leen lifecycle ni lanzan engines.
- El contrato single-state audita de forma agregada los 16 bindings, fingerprints, tombstones, fences, routers, workflow, F2, invariant y writer registry.
- El mismo contrato introduce un drift sintético deliberado en memoria y exige que sea rechazado.

## Invariante

```txt
ESTADO MUTABLE ÚNICO
orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json

CATÁLOGO ESTÁTICO ÚNICO
tools/orbit360-gate-contract-registry-v20260717.json

LIFECYCLE / ENGINES HISTÓRICOS
forensic tombstone + ejecución prohibida
```

La implementación histórica completa sigue disponible en Git mediante el baseline pre-rootfix.

## Evidencia pre-commit

Fixture source-only local:

- `STATIC_GATE_CONTROL_PLANE_PARITY_PASS`
- `bindingCount: 16`
- `historicalLifecycleTombstones: 15`
- `historicalAuthorityArtifacts: 1`
- `syntheticDrift: FAIL_CLOSED_CONFIRMED`
- router histórico, router legacy y engine histórico: exit `41`, runtime `false`, producción `false`

La primera versión local del validador detectó dos falsos positivos propios y se corrigió antes del commit. No se sube un validator nuevo sin probar también su propia lógica.

## Carriles

- A: sin cambios de producto; documentación/Academia solamente.
- B: rootfix estructural del control plane.
- C: datos A&S intactos y no accedidos.

## Claude / Academia

Concepto reusable: `REPLICABLE_CLAUDE_ACUMULADO`. Implementación: `BACKEND_PROTEGIDO_NO_CLAUDE`. Academia: `ACADEMIA_ACTUALIZAR` para enseñar autoridad mutable única, contratos históricos, clasificación de fallos y drift fail-closed.

## Estado

`IMPLEMENTED_AWAITING_CANONICAL_SOURCE_ONLY_SELFTEST` hasta probar en HEAD real simultáneamente: estado correcto PASS, drift sintético FAIL cerrado, 16 bindings PASS, routers/engines históricos bloqueados e invariant single-state PASS. Solo después se declara cerrada la causa raíz y se actualiza el estado vivo.
