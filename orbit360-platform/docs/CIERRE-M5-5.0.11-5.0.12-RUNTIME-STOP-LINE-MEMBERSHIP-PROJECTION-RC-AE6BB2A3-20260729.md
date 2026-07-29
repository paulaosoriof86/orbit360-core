# Cierre M5 5.0.11–5.0.12 — runtime stop-line y membership projection

Fecha: 2026-07-29

## Bloque

M5 — runtime LAB y remediación de causa raíz Access/membership.

## Carriles

- **A:** UX/multirol preservado; revisión visual no ejecutada.
- **B:** runtime read-only, Access owner, Auth/membership, gates y seguridad.
- **C:** baseline 414/26/7 preservado; cero reimportación y cero escrituras.

## Fuente/base

RC inicial del bloque: `f6dfa37ec1449b627c04cde2caf7d3c43acfe453fb0a7eb73924861bb4e7d324`, Hosting LAB 25/25.

## M5 5.0.11 — resultado

El runtime autorizado se ejecutó exactamente una vez.

```txt
Package: 30457621192 / 90595169193 / 8726195633
Request: 136cca57600c0aef146ad5b121aeb746a7d0dd4c
Runtime: 30457847993 / 90595950599 / 8726316517
Digest runtime artifact: sha256:61740f99806fc8353d0f2cbddf5a48b8432c27ced33dbb2e5808a94372f4135e
Preflight: 17/17
Contrato: 42/42
Snapshots: 11/11 antes + 11/11 después
Firestore writes: 0
Operational writes: 0
Counts stable: true
Digests stable: true
```

Bootstrap normalizado, autenticación y legal funcionaron. El primer fallo funcional fue `MEMBERSHIP_BOUNDARY_NOT_ACTIVE`, antes de completar las tres vistas por rol.

## Causa raíz

Clasificación: `FUNCTIONAL_DEFECT` + `DATA_CONTRACT_FAILURE`.

El owner Access actual exige una proyección de membership autenticada. El flujo LAB disponía de identidad Firebase, pero no la convertía en `Orbit.auth.productUser` con roles, scopes y advisor. El guard LAB legado contiene un fallback fijo de rol/asesor que el contrato multirol actual rechaza correctamente y que no se restauró.

## M5 5.0.12 — implementación

Owner corregido: `core/access-role-session-owner-v20260728.js` v`20260729.3`.

Contrato nuevo:

```txt
tenant = runtime
uid = Firebase auth autenticado
membership = tenants/{tenantId}/members/{authenticatedUid}
operación = get() read-only
proyección = Orbit.auth.productUser
writes = 0
fallback hardcodeado = no
missing/invalid membership = fail-closed
```

Archivos protegidos no modificados: store base/LAB, Auth, loader/init/guard LAB, importador y Rules.

## Evidencia 5.0.12

```txt
Final run: 30460202680
Job: 90603978220
Artifact: 8727238222
Digest: sha256:51e1e36221fecf121bc2c121b445abf5d78f6fb2de8c0cff8376a86c56f74378
Workflow safety: 13/13
Preflight: 36/36
Fixture: 23/23
Protected files unchanged: true
```

La fixture prueba membership válida, ausente e inválida. Los casos no válidos permanecen fail-closed y todos mantienen cero escrituras.

## Pipeline / causa raíz metodológica

Durante 5.0.12 se observaron fallos del mecanismo de validación. Tras repetición de la misma etapa se detuvo el patrón de reintentos, se congelaron cambios funcionales y se diagnosticó el pipeline:

- predicates de fixture/validador obsoletos;
- self-scan autorreferencial del workflow;
- checkout superficial sin historia suficiente para el diff.

La solución metodológica deja seguridad del workflow en un owner externo y checkout completo para evidencia histórica. Los incidentes no tocaron producto, datos, secretos, runtime ni deploy.

## RC resultante

```txt
RC anterior: f6dfa37ec1449b627c04cde2caf7d3c43acfe453fb0a7eb73924861bb4e7d324
RC nueva: ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61
Activos críticos: 42/42
LAB público: 24/25
Mismatches: 1
Único mismatch: core/access-role-session-owner-v20260728.js
```

## Estado de autorización

```txt
hostingDeployAuthorized: false
allowedHostingDeployExecutions: 0
runtimeSmokeAuthorized: false
allowedRuntimeSmokeExecutions: 0
visualReviewAuthorized: false
productionAuthorized: false
```

La autorización runtime de este bloque quedó consumida. No puede reutilizarse para Hosting ni para un nuevo runtime.

## Claude

- Proyección genérica Auth → membership → permisos: `REPLICABLE_CLAUDE_ACUMULADO`.
- Fail-closed y prohibición de fallback hardcodeado: `REPLICABLE_CLAUDE_ACUMULADO`.
- Firebase, gates, workflows y artifacts: `BACKEND_PROTEGIDO_NO_CLAUDE`.

## Academia

Debe enseñar identidad vs autorización, membership como fuente de roles/scopes/advisor, fail-closed, fixtures válidas/faltantes/inválidas y separación entre defecto funcional, validador obsoleto y mecanismo de pipeline.

## Pendiente

Una sola entrega Hosting LAB de RC `ae6bb2a3…` requiere nueva autorización explícita. Después se exige paridad 25/25. Solo entonces puede solicitarse otro runtime smoke.

Acción manual: no requerida.
