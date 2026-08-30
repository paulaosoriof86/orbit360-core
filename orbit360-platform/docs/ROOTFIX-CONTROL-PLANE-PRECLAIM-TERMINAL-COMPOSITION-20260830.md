# ROOTFIX CONTROL-PLANE — PRECLAIM, TERMINAL Y COMPOSICIÓN FÍSICA

Fecha: 2026-08-30  
Proyecto: Orbit 360 / A&S  
Rama canónica: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## 1. Incidente que activa el rootfix

El `CONTROL_PLANE_SELFTEST` ejecutado sobre `35e05a2a5e25a6e451ab0694a175aea7bc4f9d69` cerró PASS en el run `33335275487` sin runtime, browser, secretos, Firestore, deploy ni producción.

La primera ejecución de `POST_GO_LIVE_OVERLAY_RELEASE_PREP_SOURCE_ONLY` en el run `33335353690` reclamó correctamente el estado source-only y después falló antes de cualquier borde privilegiado.

Primer fallo real:

```txt
VALIDATOR_STALE:OPERATIONAL_SEMANTIC_DIAGNOSTIC_DRIFT:INSURER_PORTAL_REVEAL_OPEN
```

El ledger conservaba:

```txt
secure_reference_to_provider_to_runtime_to_reveal
```

mientras la autoridad semántica vigente exigía:

```txt
authorized_record_or_secure_reference_to_runtime_reveal
```

Al intentar reducir el terminal fallido apareció un segundo fallo del mecanismo:

```txt
PIPELINE_MECHANISM_FAILURE:ACCESS_RECOVERY_NEXT_ACTION_DESYNC
```

No hubo riesgo privilegiado, writes, deploy ni producción.

## 2. Clasificación

- Capa primaria: `VALIDATOR_STALE`.
- Capa secundaria: `PIPELINE_MECHANISM_FAILURE`.
- Producto: congelado; sin defecto nuevo demostrado por este run.
- Datos: congelados e intactos.
- Reimportación: prohibida/no requerida.
- Producción: no tocada.
- Autorización productiva: no solicitada ni consumida.

## 3. Causa raíz transversal

No era un defecto aislado del prep. Se encontraron cuatro brechas de clase completa:

1. La paridad semántica dinámica podía detectarse dentro del handler **después** de que el claim ya había sido publicado. Un drift conocido podía convertirse innecesariamente en claim huérfano.
2. `assertFollowupConsistency` mantenía listas parciales duplicadas de `nextAction`, aunque `releaseNext` ya era la autoridad central. Al registrar nuevas transiciones, una lista podía quedar obsoleta y bloquear el terminal.
3. El recovery de source-only exigía siempre `statePatch`, aunque existen transiciones source-only legítimas sin patch. El contrato declaraba recovery de clase completa, pero la implementación no cubría ese caso.
4. El selftest global comprobaba el ejecutor de release histórico, pero no construía físicamente `baseline histórico + overlay aceptado` ni pasaba ese artefacto compuesto por el mismo ejecutor certificado.

Causa raíz consolidada:

> **El control-plane declaraba autoridades dinámicas y recovery genérico, pero todavía conservaba consumidores duplicados y cobertura de prueba parcial. Eso permitía que una evolución correcta de contratos dejara otra capa obsoleta.**

## 4. Rootfix aplicado en rama aislada

Rama de preparación:

```txt
ays/backend-control-plane-class-rootfix-v32-20260830
```

Cambios de infraestructura, sin módulos de negocio:

- `tools/orbit360-single-state-contract-v20260827.mjs`
  - `RESET_LINK_READY_FOR_PRIVATE_HANDOFF` y `HUMAN_LOGIN_VERIFIED_LATENCY_OPEN` consumen `releaseNext` como autoridad única; se eliminan listas paralelas.
- `tools/orbit360-semantic-single-state-rootfix-handler-v20260827.mjs`
  - recovery source-only compatible con claims con `statePatch` y con claims patchless;
  - mantiene digest estricto cuando sí existe patch;
  - evidencia terminal sanitizada en ambos casos.
- `tools/orbit360-preclaim-operational-semantic-guard-v20260830.mjs`
  - nuevo guard fail-closed ejecutado antes de claim;
  - un drift semántico bloquea transiciones ordinarias antes de mutar ledger;
  - solo quedan exentas la reparación semántica, el recovery huérfano y el selftest del control-plane.
- `.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml`
  - integra el guard preclaim;
  - añade selftest del guard;
  - añade selftest de composición física del overlay.
- `tools/orbit360-post-go-live-overlay-release-v20260830.mjs`
  - expone una única función de composición usada por release y selftest;
  - selftest descarga el artefacto histórico, aplica exactamente los 7 overlays vigentes, rehash completo y delega el artefacto compuesto al ejecutor certificado en modo source-only.
- `orbit360-platform/docs/orbit360-control-plane-frozen-baseline-v20260827.json`
  - reseal de identidades estáticas y nuevas reglas de clase completa.

## 5. Contratos que deben quedar demostrados antes de continuar

```txt
PRECLAIM_SEMANTIC_GUARD_SELFTEST = PASS
PATCHLESS_SOURCE_ONLY_ORPHAN_RECOVERY = PASS
POST_GO_LIVE_FOLLOWUP_SINGLE_AUTHORITY = PASS
PHYSICAL_BASELINE_PLUS_7_OVERLAYS_SELFTEST = PASS
CERTIFIED_RELEASE_EXECUTOR_SOURCE_ONLY_ON_COMPOSED_PACKAGE = PASS
PRODUCT_PRESERVATION = PASS
NO_RUNTIME = true
NO_BROWSER = true
NO_SECRETS = true
NO_FIRESTORE = true
NO_DEPLOY = true
NO_PRODUCTION = true
```

## 6. Orden de recuperación obligatorio

No reintentar el prep fallido.

1. Validar y promover este rootfix de mecanismo.
2. Recuperar/reducir el claim huérfano original del run `33335353690` mediante `CONTROL_PLANE_RECOVER_ORPHANED_SOURCE_ONLY_TERMINAL`.
3. Ejecutar `POST_GO_LIVE_SEMANTIC_SINGLE_STATE_ROOTFIX_VALIDATE_AND_SEAL` con el diagnóstico vigente derivado de la autoridad semántica.
4. Ejecutar nuevamente `CONTROL_PLANE_SELFTEST` y exigir la nueva prueba física de composición.
5. Solo entonces crear **una nueva ejecución** de `POST_GO_LIVE_OVERLAY_RELEASE_PREP_SOURCE_ONLY` sobre revisión fresca del ledger.
6. Si el prep pasa, revisar ledger/contrato y recién después preparar la solicitud única de autorización de `POST_GO_LIVE_OVERLAY_RELEASE_WINDOW`.
7. No abrir navegador humano antes del readback runtime del release compuesto.

## 7. Anti-repetición

- No se reejecuta el run `33335353690`.
- No se crea otro parche de Aseguradoras/Cliente 360/Login para resolver este incidente.
- No se reimportan Clientes ni Aseguradoras.
- No se cambia producto para satisfacer un validador obsoleto.
- Cualquier nuevo `nextAction` post-go-live debe depender de la autoridad central, no de listas duplicadas.
- Toda composición productiva futura debe tener selftest físico source-only antes de abrir riesgo.

## 8. Impacto Claude / Academia

**Claude/prototipo:** `BACKEND_PROTEGIDO_NO_CLAUDE` para la implementación. Patrón metodológico reusable: una sola autoridad para estados/acciones y pruebas del flujo real, no duplicaciones.

**Academia:** `ACADEMIA_ACTUALIZAR` con el caso de estudio: diferencia `VALIDATOR_STALE` vs `FUNCTIONAL_DEFECT`, preclaim fail-closed, recovery source-only y por qué producción no se utiliza para descubrir defectos del validator.

## 9. Estado

```txt
ROOTFIX_SOURCE: PREPARADO EN RAMA AISLADA
PRODUCTO: INTACTO
DATOS: INTACTOS
PRODUCCION: INTACTA
DEPLOY: NO AUTORIZADO / NO EJECUTADO
CLAIM HUERFANO: PENDIENTE DE RECOVERY TRAS VALIDAR ROOTFIX
LEDGER SEMANTIC RECONCILIATION: PENDIENTE
OVERLAY PREP: STOP_RETRY HASTA CERRAR LOS PASOS ANTERIORES
```
