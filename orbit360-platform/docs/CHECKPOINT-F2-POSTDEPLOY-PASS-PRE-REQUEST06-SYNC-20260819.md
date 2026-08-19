# CHECKPOINT — F2 POSTDEPLOY PASS · PRE-REQUEST06 · SINCRONIZACION 2026-08-19

## Estado canónico verificado

Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`.
PR #5: draft/open, sin merge, sin main.
Artifact sucesor congelado: `9345207863`.
Source del artifact: `29caae94a3db1f1626bdde2ea6ee9a21799f9df6`.

## F1

F1 permanece `CLOSED_PASS`. No se reabre autenticación, contraseña, membership, Cliente 360, HostDime ni reimportación de datos sin evidencia nueva.

## F2 source-only

F2 source-only permanece `CLOSED_PASS` bajo `f2-productive-acceptance-exact-successor-v20260818` y `F2_STABLE_BOUNDARY_CONTRACT_V2`.

## RULES01

RULES01 está `PASS` y consumido.
- run: `32211779285`
- artifact terminal: `9351002966`
- source rules blob: `35fba451bbbeb97dbae3f08303b786ddbcbdd29f`
- redeploy requerido: no
- replay permitido: no

## Postdeploy cross-tenant probe

La autorización ya fue ejecutada y consumida. El estado anterior `POSTDEPLOY_PROBE_AUTHORIZATION_PENDING` queda HISTORICAL_NOT_CURRENT_STATE.

Solicitud: `.github/orbit360-requests/f2-rules01-postdeploy-probe-readonly-v20260818-01.json`
- status: `CONSUMED_PASS`
- run: `32272580947`
- run attempt: `1`
- artifact: `9372746151`
- artifact digest: `sha256:c087ad3bae277f990c760eb04edcce96ef2746add36120040ba6da5f4d55a860`
- server-forced response: `403 / PERMISSION_DENIED`
- crossTenantDenied: `true`
- integrity before/after: `PASS`
- Firestore document writes: `0`
- Auth writes: `0`
- membership writes: `0`
- data writes: `0`
- rules redeploy: `false`
- Hosting/Functions/rebuild/publicacion/produccion: `false`

Por tanto, el problema historico del probe con ID reservado queda cerrado como `VALIDATOR_STALE`; el deny cross-tenant ya esta demostrado sobre ruta valida.

## Bloque actual real

`F2_PRE_REQUEST06_SOURCE_CLOSURE`

Clasificacion operativa actual: `PIPELINE_MECHANISM_FAILURE / DURABLE_TERMINAL_OBSERVABILITY_NOT_YET_CONFIRMED`.

Hechos:
- el workflow propietario existente fue reforzado en commit `8f9573ea12a0e83bb86313f02530c6199ae0577e` para persistir evidencia sanitizada si falla;
- se disparo una unica ejecucion source-only controlada mediante commit `be3fde3f96309fb58312e81522a1bb0f8daccc1a`;
- a la hora de este checkpoint, HEAD continua en `be3fde3f...`, por lo que no existe todavia commit terminal durable de cierre ni evidencia suficiente para declarar `F2_PRE_REQUEST06_SOURCE_CLOSURE_PASS`;
- esto NO autoriza un tercer trigger automatico, otro workflow paralelo ni Request06.

## Request06

`F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST06` todavia NO existe y NO esta autorizado.

Solo puede crearse despues de que el cierre source-only pre-Request06 deje evidencia durable y el gate canónico post-sync pase. No repetir Request01-Request05, RULES01 ni el postdeploy probe ya consumido.

## Documentacion y precedencia

Este checkpoint corrige el desfase detectado el 19/08/2026. Cualquier texto anterior que diga que el postdeploy probe esta pendiente de autorizacion es historico y no puede gobernar ejecucion.

Hasta que `orbit360-live-state-v1.json` y `ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json` sean actualizados por el cierre source-only, la precedencia operacional es:
1. reglas maestras/addenda vigentes;
2. evidencia consumida del postdeploy probe (`32272580947` / `9372746151`);
3. este checkpoint;
4. HEAD y PR #5 vivos;
5. documentos narrativos anteriores solo como historial.

## Carriles

- Carril A: `FROZEN_NO_CHANGES`.
- Carril B: `F2_PRE_REQUEST06_SOURCE_CLOSURE_PENDING_DURABLE_TERMINAL_EVIDENCE`.
- Carril C: `UNTOUCHED_ZERO_CHANGES`.

Ruta inmediata a produccion: se conserva `50%` hasta cierre F2 runtime.
Programa integral: se conserva `25%`.

## Siguiente accion exacta

No volver a diagnosticar producto. Resolver exclusivamente por causa raiz por que el trigger `be3fde3f...` no ha dejado terminal durable. Si el run existio y fallo, consumir su etapa exacta. Si no existio, corregir el mecanismo de entrega/registro del workflow propietario existente. Despues ejecutar una sola vez el cierre source-only y, solo con PASS, abrir la frontera de autorizacion fresca para Request06.

## Reuso / Academia

- `BACKEND_PROTEGIDO_NO_CLAUDE`: reglas Firestore, credenciales, enforcement y runtime real.
- `REPLICABLE_CLAUDE_ACUMULADO`: negative authorization probe con recurso valido + evidencia producer-backed + observabilidad durable de pipelines.
- `ACADEMIA_ACTUALIZAR`: diferenciar producto, validador obsoleto y mecanismo de pipeline; un estado documental atrasado nunca debe reabrir un gate ya consumido.
