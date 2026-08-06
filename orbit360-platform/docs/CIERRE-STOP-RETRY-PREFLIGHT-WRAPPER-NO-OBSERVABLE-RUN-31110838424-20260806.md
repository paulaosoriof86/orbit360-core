# Cierre STOP_RETRY — preflight wrapper no observable

Fecha: 2026-08-06  
Gate: `block2.7-visual-matrix-corrected-post-auth-lab-v20260805`  
Run: `31110838424`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR rector: #5 draft/open

## Bloque

Reapertura macro única de la matriz visual corregida post-Auth.

## Resultado de la ejecución autorizada

```text
transporte exclusivo v3: PASS
lifecycle padre exclusivo: PASS
request hijo exclusivo: PASS
parentHead exacto: PASS
PASS_LIFECYCLE_SEQUENCE_SYNTHETIC: 39/39
GO_GATE_CONTRACT: STOP
checkpoint observable: PREFLIGHT_WRAPPER_EXIT_1_BEFORE_OBSERVABLE_EVIDENCE
runtime: SKIPPED
secretos: 0
Firestore reads/writes: 0/0
Auth writes: 0
operational writes: 0
backup Hosting: 0
deploy Hosting: 0
browser: 0
Functions/Rules: 0
producción/main/merge: 0
```

El job `92647902361` completó correctamente el transporte y la validación de parent/request. El paso `GO_GATE_CONTRACT sin secretos` terminó con código 1. El paso de backup, Hosting LAB y matriz quedó omitido.

## Clasificación

```text
PIPELINE_MECHANISM_FAILURE
PREFLIGHT_WRAPPER_NON_OBSERVABLE_FAILFAST
```

## Causa raíz

El wrapper `tools/orbit360-preflight-visual-matrix-corrected-post-auth-once-v20260805.sh` utilizaba aserciones desnudas bajo `set -euo pipefail`.

Ante cualquier aserción fallida, el shell terminaba inmediatamente sin:

- identificar el check fallido;
- persistir un checkpoint sanitizado;
- copiar de forma garantizada la evidencia del router canónico;
- distinguir un fallo de identidad previo del resultado interno del router.

Por eso el run solo dejó `exit code 1`. No existe evidencia suficiente para afirmar cuál aserción interna falló. Inventar ese dato habría sido incorrecto.

La causa raíz verificable no pertenece a Auth, hidratación, renderización, datos, Firebase, Hosting ni producto. Pertenece a la falta de observabilidad del mecanismo de preflight.

## STOP_RETRY aplicado

El request `63052380791b84917618e9664285dc5fb3f03f77` quedó consumido y sin replay.

El lifecycle quedó congelado con:

```text
allowedExecutions: 0
authorizationReserved: false
executionAuthorized: false
secretAccessAuthorized: false
firestoreReadAuthorized: false
browserAuthorized: false
hostingDeployAuthorized: false
```

No se hizo segundo intento.

## Sourcefix

Se corrigió únicamente el control plane:

- cada aserción temprana emite `failedCheckIds` y `wrapperCheckpoint`;
- el wrapper ya no depende de un `set -e` global para decidir el flujo;
- el código de salida del router se captura explícitamente;
- la evidencia canónica se exige y copia antes de finalizar;
- un router no cero conserva sus checks internos y agrega `CANONICAL_ROUTER_NONZERO`;
- el camino positivo exige evidencia admisible de `GO_GATE_CONTRACT`.

Archivos:

```text
tools/orbit360-preflight-visual-matrix-corrected-post-auth-once-v20260805.sh
tools/orbit360-test-observable-preflight-wrapper-v20260806.mjs
orbit360-platform/runtime-gate-crm-v20260716/observable-preflight-wrapper-source-test-sanitized-v20260806.json
```

## Pruebas y evidencia

```text
PASS_OBSERVABLE_PREFLIGHT_WRAPPER_SOURCE
18/18 PASS
0 fallos
```

Se probaron tres caminos:

1. branch incorrecta → `BRANCH_MISMATCH` observable;
2. router no cero → `CANONICAL_ROUTER_NONZERO` y check interno preservado;
3. router válido → `GO_GATE_CONTRACT` y `go=true`.

Límites del source test:

```text
secretos: 0
Firestore reads/writes: 0/0
runtime/browser/deploy: 0
producción: 0
```

## Impacto

El siguiente intento, si se autoriza posteriormente, ya no podrá detenerse con un código genérico sin causa. Todo fallo previo a secretos deberá dejar un checkpoint sanitizado y durable.

## Estado

```text
SOURCE_OBSERVABLE_PREFLIGHT_PASS_PENDING_EXPLICIT_REAUTHORIZATION
PASS_VISUAL_POST_AUTH: NO
Hosting LAB: versión previa restaurada
Cobros 4.1: PAUSED
```

## Siguiente acción exacta

No crear otro request ni otro run todavía.

Se requiere una nueva autorización macro explícita distinta. Solo después se podrá:

```text
activar lifecycle en commit padre exclusivo
→ crear request hijo exclusivo
→ ejecutar wrapper observable
→ exigir evidencia durable de GO_GATE_CONTRACT
→ resolver credencial únicamente con GO
→ backup
→ máximo un Hosting LAB
→ precheck
→ matriz read-only
```

Ante cualquier fallo futuro, `STOP_RETRY` deberá indicar el check exacto publicado por el wrapper o por el router.
