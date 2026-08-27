# ROOTFIX — Autoridad estática de gates y lifecycle ledger-only

Fecha: 2026-08-27  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Baseline pre-rootfix: `3b2abfa3dc5aac4de3fc4230e061adfcf4bb2c40`  
HEAD de mecanismo validado: `2a98f448b83af97da1f53f2c6685fa3a8857ea95`

## Clasificación

`PIPELINE_MECHANISM_FAILURE`, con manifestaciones `VALIDATOR_STALE`. Producto congelado durante el diagnóstico. Sin datos, Firebase, secrets, browser, deploy ni producción.

## Causa raíz demostrada

La convergencia single-state había dejado fuera una familia histórica todavía ejecutable: registry de gates, router/preflight, lifecycle y engines. El registry y el router podían divergir; Ops/Leads ya presentaba un nombre de lifecycle distinto. Además, lifecycle antiguos almacenaban fase, autorizaciones, ejecuciones y resultados, y engines históricos los leían para decidir ejecución. Existía una segunda autoridad mutable paralela al ledger.

El self-test previo `33103145902` / job `98625879955` interceptó esta familia antes de runtime con `STATIC_GATE_BINDING_DEPENDENCY_MISSING:fase-a-ops-leads-crm-release-lab-v20260812::default`. No correspondía corregir un solo nombre y reintentar.

## Rootfix implementado

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
- router canónico histórico, router legacy y engine histórico: exit `41`, runtime `false`, producción `false`

La primera versión local del validador detectó dos falsos positivos propios y se corrigió antes del commit. No se subió un validator nuevo sin probar también su propia lógica.

## Evidencia canónica post-commit

Ejecución nueva, no replay del fallo anterior:

- run: `33106766909`
- job: `98638564198`
- execution commit: `8f5bed980fe6a86c6870d9a6735e067acd3e4590`
- canonical mechanism HEAD validado: `2a98f448b83af97da1f53f2c6685fa3a8857ea95`
- artifact: `9660770428`
- artifact zip SHA-256: `d6d4798793bbcc1a825a65b0e9f2cda70e40d85b3d8dae3203775d9df623cfa3`
- job conclusion: `success`
- `SINGLE_STATE_CONTROL_PLANE_SELFTEST_PASS`
- `SINGLE_STATE_CONTROL_PLANE_STATIC_INVARIANT_PASS`
- `stateParityPass: true`
- `singleMutableOperationalState: orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`
- `CERTIFIED_PRODUCT_BASELINE_PRESERVATION_PASS`
- `changedProductFilesSinceBaseline: 0`
- `candidateToHeadStatus: CANDIDATE_PRESERVED`
- `noReprocess: true`
- `noReimport: true`
- source-only; runtime `false`; browser `false`; secret access `false`; Firestore read `false`; writes `0`; deploy `false`; production touched `false`.
- claim, source handler, gate preflight privilegiado, privileged handler y terminal ledger reducer quedaron `skipped` porque `CONTROL_PLANE_SELFTEST` no es una transición mutable ni privilegiada.

Las advertencias de deprecación Node 20/acciones observadas en GitHub Actions no alteraron la ejecución: el runner utilizó Node 22 para el código y GitHub forzó las actions a Node 24; el job terminó `success`. Se registran como mantenimiento de toolchain, no como defecto funcional ni causa de reapertura.

## Carriles

- A: sin cambios de producto; documentación/Academia solamente.
- B: rootfix estructural del control plane cerrado.
- C: datos A&S intactos y no accedidos.

## Claude / Academia

Concepto reusable: `REPLICABLE_CLAUDE_ACUMULADO`. Implementación: `BACKEND_PROTEGIDO_NO_CLAUDE`. Academia: `ACADEMIA_ACTUALIZAR` para enseñar autoridad mutable única, contratos históricos, clasificación de fallos, drift fail-closed y diferencia entre warning de toolchain y fallo de gate.

## Estado final

`CLOSED_PASS_CANONICAL_SOURCE_ONLY`

Criterios simultáneos satisfechos:

1. estado correcto → PASS;
2. drift sintético deliberado → FAIL cerrado;
3. 16 bindings auditados bajo un único registry estático;
4. 15 lifecycle sin estado mutable ni autoridad ejecutable;
5. 14 engines históricos detrás de una cerca fail-closed;
6. router canónico histórico y router legacy sin capacidad de ejecución;
7. un solo ledger para estado mutable;
8. invariant single-state → PASS;
9. producto certificado preservado sin reproceso ni reimportación;
10. cero secretos, runtime, browser, Firestore, deploy o producción en el cierre.

La causa raíz de esta familia queda cerrada. No corresponde volver a sincronizar manualmente versiones ni reabrir módulos cerrados para resolver futuras discrepancias de control plane: cualquier drift de esta familia debe fallar antes del runtime y clasificarse primero mediante el contrato single-state.