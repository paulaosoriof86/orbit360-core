# ESTADO ACTIVO — MICROBLOQUE 2.1

Fecha: 2026-08-04  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate: `GO_LAB_CANDIDATE_VISIBLE`  
Estado: `CORRECTIVE_CONTINUATION_READY_AFTER_VALIDATOR_STALE`

## Entradas cerradas

```text
PASS_PLAN_PERSISTED
PASS_CANONICAL_BASELINE
PASS_ISOLATED_ROUTE_HARNESS
```

Evidencia del arnés:

```text
run: 30971707956
rutas: 8/8
mecanismo: ONE_ISOLATED_BROWSER_CONTEXT_AND_DIRECT_URL_PER_ROUTE
Firebase/secrets/escrituras/deploy: no
```

## Primer intento preventivo

```text
run: 30974443335
status: VALIDATOR_STALE
failed checks:
- REQUEST_ACTIVE
- VIDEO_LAYOUTFREE_HARNESS
secret access: no
Firestore: no
Functions: no
Hosting: no
browser: no
```

El request único y el baseline congelado pasaron. El preflight estaba desactualizado frente al request v2 y al arnés v6.

## Correctivo cerrado

Se sincronizaron:

- motor canónico Gate 12.0.11;
- lifecycle `isolated-context-direct-url-v6`;
- extensión de registro;
- root cause `ROUTE_ASEGURADORAS_NAVIGATION_TIMEOUT`;
- evidencia sintética 8/8;
- política de retención segura;
- documentación, Academia y acumulado Claude.

No se modificaron producto, módulos, Store, datos, Auth, Functions ni Hosting.

## Objetivo único vigente

Entregar una URL Hosting LAB retenida de la misma candidata, con cuatro Functions LAB allowlisted, ocho rutas aisladas y snapshots before/after idénticos.

## Ejecución exacta

1. preflight corregido antes de secretos;
2. desplegar solo las cuatro Functions LAB allowlisted;
3. desplegar un único Hosting preview LAB;
4. snapshot A&S before y after;
5. abrir Cliente 360, Aseguradoras, Pólizas, Cobros, Conciliaciones, Ops, Leads e Importar con contexto aislado y URL directa;
6. exigir cero escrituras e integridad idéntica;
7. retener URL si producto e integridad pasan;
8. no repetir los 18 escenarios funcionales;
9. no retirar la candidata por un fallo exclusivo del capturador.

## STOP_RETRY

Si el preflight vuelve a fallar en `REQUEST_ACTIVE`, `ISOLATED_ROUTE_HARNESS` o la misma etapa de control plane, se detiene definitivamente sin otro parche ni ejecución.

## Prohibiciones

Rules, reimportación, escrituras reales, producción, main, merge, otra candidata, otro workflow visual y navegación por hash acumulativa.

## Siguiente acción exacta

Emitir como último commit el request correctivo de continuación del run `30974443335` y ejecutar una sola vez el workflow visual existente.

Fuente de continuidad superior: ledger vivo y PR #5.
