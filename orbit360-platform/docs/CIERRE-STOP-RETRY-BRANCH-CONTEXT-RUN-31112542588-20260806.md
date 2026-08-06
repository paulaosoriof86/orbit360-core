# Cierre STOP_RETRY — contexto de rama reservado en GitHub Actions

Fecha: 2026-08-06  
Gate: `block2.7-visual-matrix-corrected-post-auth-lab-v20260805`  
Run: `31112542588`  
Job: `92653766722`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR rector: #5 draft/open

## Resultado de la ejecución autorizada

```text
transporte exclusivo v4: PASS
lifecycle padre exclusivo: PASS
request hijo exclusivo: PASS
parentHead exacto: PASS
lifecycle sequence source: 39/39 PASS
observable preflight source: 18/18 PASS
GO_GATE_CONTRACT: STOP
checkpoint exacto: BRANCH_MISMATCH
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

El wrapper observable publicó evidencia durable y detuvo la ejecución antes de cualquier capacidad sensible.

## Clasificación

```text
PIPELINE_MECHANISM_FAILURE
GITHUB_RESERVED_BRANCH_CONTEXT_MISUSED
```

## Causa raíz

El wrapper utilizaba `GITHUB_REF_NAME` como si fuera una variable inyectable que representara la rama canónica.

En un workflow disparado por `pull_request`, `GITHUB_REF_NAME` pertenece al contexto reservado de GitHub y representa el ref del PR, por ejemplo `18/merge`. No debe emplearse como contrato de la rama canónica ni asumirse sobrescribible mediante `env`.

La rama objetivo real del PR está en `GITHUB_BASE_REF`. La rama canónica autorizada por Orbit debe viajar además en una variable propia y explícita.

Por eso el wrapper emitió correctamente:

```text
wrapperCheckpoint: BRANCH_MISMATCH
wrapperDetail: GITHUB_REF_NAME does not match the canonical branch.
```

No es un defecto de Auth, hidratación, renderización, datos, Firebase, Hosting ni producto.

## STOP_RETRY aplicado

El request `cd7b5cf881843da2e46bf9c337b4f9d1053a1cb3` quedó consumido y sin replay.

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

No se ejecutó un segundo run.

## Sourcefix

Se corrigió únicamente el control plane:

- `ORBIT360_CANONICAL_BRANCH` es ahora el contrato explícito y controlado por Orbit;
- `GITHUB_BASE_REF` se valida como rama base cuando el evento es `pull_request`;
- `GITHUB_REF_NAME` deja de decidir la rama canónica;
- un ref de PR como `18/merge` no bloquea el camino correcto;
- los fallos continúan publicando checkpoints sanitizados antes de cualquier riesgo.

Archivos:

```text
tools/orbit360-preflight-visual-matrix-corrected-post-auth-once-v20260805.sh
tools/orbit360-test-observable-preflight-wrapper-v20260806.mjs
orbit360-platform/runtime-gate-crm-v20260716/observable-preflight-branch-context-source-test-sanitized-v20260806.json
```

## Pruebas

```text
PASS_OBSERVABLE_PREFLIGHT_BRANCH_CONTEXT_SOURCE
24/24 PASS
0 fallos
```

Casos cubiertos:

1. variable Orbit incorrecta → `ORBIT360_CANONICAL_BRANCH_MISMATCH`;
2. base PR incorrecta → `PULL_REQUEST_BASE_REF_MISMATCH`;
3. ref `18/merge` con base y variable Orbit correctas → no bloquea;
4. fallo interno del router → check interno preservado;
5. camino positivo → `GO_GATE_CONTRACT` y `go=true`.

Límites del source test:

```text
secretos: 0
Firestore reads/writes: 0/0
runtime/browser/deploy: 0
producción: 0
```

## Estado

```text
SOURCE_BRANCH_CONTEXT_PASS_PENDING_EXPLICIT_REAUTHORIZATION
PASS_VISUAL_POST_AUTH: NO
Hosting LAB: versión previa restaurada
Cobros 4.1: PAUSED
```

## Siguiente acción exacta

No crear otro request ni otro run sin una nueva autorización macro explícita.

En una futura reapertura:

```text
activar lifecycle en commit padre exclusivo
→ crear request hijo exclusivo
→ exigir 39/39 + 18/18 + 24/24
→ definir ORBIT360_CANONICAL_BRANCH
→ validar GITHUB_BASE_REF
→ ejecutar wrapper observable
→ continuar solo con GO_GATE_CONTRACT durable
→ backup
→ máximo un Hosting LAB
→ precheck
→ matriz read-only
```
