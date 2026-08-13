# Cierre runtime v15 · Inicio hydration + STOP consumer · 2026-08-07

## Bloque

Bloque visual post-Auth LAB. Runtime v15 consumido; no replay.

## Fuente / baseline

- HEAD autorizado inicial v15: `325260ac836266d7d2c9b35352ae15d67d7eb619`.
- Activación source-only v15: run `31186214573`.
- Request runtime v15: `20260807.15-two-phase-runtime`.
- Runtime v15: run `31186425271`.
- Baseline Hosting autorizado: `visual-matrix-corrected-backup-31135532118`.
- Rootfix source-only: run `31188089906`, job `92897659879`.
- Relay fail-closed: run `31188088053`.

## Resultado runtime v15

`GO_GATE_CONTRACT` fue otorgado con 28/28 checks antes de secretos. Luego:

- restore del baseline autorizado: PASS;
- backup previo: PASS;
- un único deploy Hosting LAB: PASS;
- Auth: PASS;
- membresía: PASS;
- tenant: PASS;
- ruta `inicio`: PASS;
- precheck: STOP en `INICIO_READY_TIMEOUT`;
- matriz Dirección/Operativo/Asesor: no ejecutada;
- rollback Hosting: PASS;
- snapshot final: `VERIFIED_UNCHANGED`;
- Firestore/Auth/operational writes: 0;
- Functions/Rules/reimportación/producción/main/merge: 0.

La captura sanitizada del precheck mostró la vista de Inicio en estado de carga fallida con `4 de 5 fuentes listas` y `asesores` como fuente faltante.

## Causa inmediata

El estado real del store tenía las siete colecciones canónicas observables, mientras `asesores` aparecía entre las fuentes legacy con error de snapshot. El rootfix visual bloqueó Inicio porque el contrato runtime efectivo no demostró que `asesores` estuviera tratado como optional/degraded antes del readiness.

## Causa raíz 1 · composición de hidratación

Clasificación: `PIPELINE_MECHANISM_FAILURE` / `VALIDATOR_STALE`.

El contrato `visual-runtime-hydration-contract-v20260805.js` ya definía para Inicio:

- required: `clientes`, `polizas`, `cobros`, `aseguradoras`;
- optional: `asesores`, `metas`, `negocios`, `gestiones`.

Sin embargo, el precheck solo exigía el marker general del rootfix visual. No probaba que el contrato required/optional estuviera realmente montado sobre el `Orbit.store` vivo. Por eso una validación source-only sintética podía quedar verde aunque la composición runtime efectiva siguiera tratando la ausencia de `asesores` como bloqueante.

### Fix

- El contrato de hidratación conserva required/optional y ahora revalida el owner real de `Orbit.store`.
- Si cambia el store, vuelve a enlazar la proyección de asesores y `_labStatus`.
- Expone `OrbitHydrationContractDiagnostics.mounted()`.
- El precheck exige `HYDRATION_CONTRACT_MOUNTED` antes de Auth/Inicio.
- Después de Auth exige `INICIO_REQUIRED_HYDRATION`: las fuentes canónicas requeridas deben estar listas; las opcionales pueden permanecer degradadas sin bloquear.
- Solo después puede evaluarse `INICIO_READY`.
- Cero escrituras y cero reimportación.

## Causa raíz 2 · consumo STOP parcial

Clasificación: `PIPELINE_MECHANISM_FAILURE_STOP_CONSUMER_STATE_DRIFT`.

Durante el STOP v15, el runner persistió primero un estado intermedio:

- `consumed=true`;
- `allowedExecutions=0`;
- `replayAllowed=false`;
- `authorizationFrozen=false`.

El consumidor automático anterior solo admitía dos estados: request activo o request ya completamente frozen. Por ello rechazó el estado intermedio con `STOP_REQUEST_CONSUMPTION_INVALID_ACTIVE_STATE`.

### Fix

- El consumidor STOP acepta de forma idempotente request activo o request ya parcial/totalmente consumido.
- Siempre normaliza a `consumed=true`, `allowedExecutions=0`, `authorizationFrozen=true`, `replayAllowed=false`.
- Desactiva capacidades runtime y límites de Hosting.
- Cierra lifecycle en `STOP_RETRY_NO_RUNTIME`.
- Cierra overlay con `runtimeAllowed=false`, `hostingAllowed=false`, `freshAuthorizationRequired=true` y `NONE_PENDING_FRESH_AUTHORIZATION`.
- El sealer también deja lifecycle y overlay terminales, de forma que el consumidor externo sea una segunda defensa y no la única.

## Evidencia source-only

Rootfix específico:

- 15/15 PASS.
- Reproducción exacta `consumed=true/allowed=0/frozen=false`: PASS.
- Consumo idempotente repetido: PASS.
- Sealer terminal sintético: PASS.
- Contrato Inicio required/optional: PASS.
- Rebind del store: PASS.
- Marker/mounted del contrato: PASS.
- Orden precheck hydration→required Inicio→Inicio ready: PASS.

Suites rectoras reejecutadas:

- request↔lifecycle+scope: 17/17 PASS;
- preflight scope-aware: 37/37 PASS;
- transporte base SHA: 12/12 PASS;
- capture watchdog: 17/17 PASS;
- signal-safe: 48/48 PASS;
- cross-runner: 24/24 PASS;
- Windows: 7/7 PASS.

En toda la corrección source-only: secretos 0, Firebase 0, Hosting 0, navegador 0, deploy 0, writes 0.

## Estado vivo después del cierre

- Request v15: consumido, frozen y no reutilizable.
- Lifecycle: STOP_RETRY.
- Overlay: runtime/Hosting desautorizados.
- Relay: `NONE_PENDING_FRESH_AUTHORIZATION`.
- Hosting LAB: restaurado al estado previo mediante rollback del run v15.
- Snapshot: `VERIFIED_UNCHANGED`.
- `PASS_VISUAL_POST_AUTH`: todavía NO.

## Carriles

- A · Frontend/UX: readiness de Inicio corregido source-only para tolerar fuentes opcionales degradadas de forma honesta; falta validación runtime futura.
- B · Backend/seguridad/control-plane: consumo STOP y sealer endurecidos e idempotentes; relay fail-closed.
- C · Datos reales/migración: sin reimportar asesores, sin modificar datos, sin writes.

## Clasificación para Claude

- `REPLICABLE_CLAUDE_ACUMULADO`: patrón required/optional, readiness observable y UI degradada honesta.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: scripts exactos de STOP consumer, sealer, relay y transporte.
- `ACADEMIA_ACTUALIZAR`: diferencia entre defecto funcional, composición runtime no probada y validador/gate obsoleto o incompleto.

## Siguiente acción exacta

No ejecutar nuevamente v15. No crear request nuevo con la autorización v15 consumida.

Solo después de consolidar este rootfix source-only en la rama canónica puede prepararse una autorización nueva. Esa futura ejecución debe volver a validar source-only y, antes de evaluar `INICIO_READY`, observar explícitamente `HYDRATION_CONTRACT_MOUNTED` e `INICIO_REQUIRED_HYDRATION`.
