# CIERRE V35 — RUNTIME IAM LOG VIEW / EXECUTOR CAPABILITY STOP

Fecha: 2026-08-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate rector: `block1-client360-insurers-lab-v20260717` / contrato `1.0.41`

## Estado

`STOP_RETRY`

Clasificación causal:

`ENVIRONMENT_FAILURE / IAM_EXECUTOR_CANNOT_MODIFY_TARGET_LOG_VIEW`

V35 se ejecutó una sola vez. El fail-closed funcionó antes del primer IAM write.

## Request único

Request:

`.github/orbit360-requests/block1-client360-insurers-v35-logging-view-grant-audit-revoke-authorization.json`

Parent autorizado:

`ae2eb843ebbbb3b513ec0eee6a97605e10d64e54`

Commit de autorización:

`bedfdebc86d0a89d5a16e57f6f77dde07f7c1bb8`

Request version:

`20260810.35-logging-view-grant-audit-revoke`

Operación:

`TEMPORARY_LOG_VIEW_PRIVATE_LOG_VIEWER_AUDIT_REVOKE`

## Runtime único

Run: `31439991628`  
Job: `93622485462`  
Attempt: `1`  
HEAD ejecutado: `bedfdebc86d0a89d5a16e57f6f77dde07f7c1bb8`

PASS antes del secret/API:

1. request exclusivo y parent-bound;
2. canonical Block1 source gate;
3. `GO_GATE_CONTRACT_RUNTIME_V35`;
4. gate v35 `17/17 PASS`;
5. worker source-safe offline;
6. budgets contractuales y cero Firestore/Auth.

La credencial LAB se materializó únicamente después del GO.

## Checkpoint de STOP

El worker comprobó primero si el ejecutor LAB podía leer/modificar la IAM policy de la Log View objetivo.

Resultado sanitizado:

```text
executorGetPolicyEffective: false
executorSetPolicyEffective: false
decision: STOP_RETRY
classification: ENVIRONMENT_FAILURE
rootCause: IAM_EXECUTOR_CANNOT_MODIFY_TARGET_LOG_VIEW
```

El runtime se detuvo antes de `getIamPolicy`, antes de `setIamPolicy`, antes del grant y antes de Cloud Logging.

## Presupuesto real observado

```text
iamPolicyReads: 0
iamWrites: 0
grantWrites: 0
revokeWrites: 0
loggingReadPages: 0
firestoreReads: 0
authReads: 0
operationalWrites: 0
```

Como `grantWrites=0`, no existió binding temporal que retirar.

## Evidencia sanitizada

Artifact: `9082470137`  
Digest: `sha256:6ef1121de7e4f44a3557581c0cddc286040c32b9e30ce29d0ec7506a167b5856`

La evidencia confirma:

```text
rawLogsPersisted: false
resourceNamesPersisted: false
documentIdsPersisted: false
principalEmailsPersisted: false
credentialsPersisted: false
containsPII: false
containsSecrets: false
```

## Request consumido y congelado

Commit de consumo:

`60e03c61a52e91582c55459ae481981a0fab943e`

Estado final:

```text
status: CONSUMED_STOP_RETRY
allowedExecutions: 0
consumed: true
authorizationFrozen: true
replayAllowed: false
consumedByRunId: 31439991628
consumedByAttempt: 1
```

No existe autorización para repetir v35.

## Revalidaciones posteriores

Lifecycle source-only:

- commit: `f8d90bea590e263a1142168a676b7ece90232d00`;
- run: `31440100785`;
- status: success.

Registry source-only:

- commit: `3d8fc6f26244aa78edfb7b99c7990a0ce829b8d5`;
- run: `31440121680`;
- status: success.

No hubo segundo runtime.

## Causa raíz

La causa inmediata ya no es la falta de permisos de lectura de logs demostrada en v34, sino la imposibilidad de la misma cuenta LAB para actuar como ejecutor administrativo de IAM sobre la Log View.

Esto significa que la cuenta objetivo no puede autoasignarse de manera segura `roles/logging.privateLogViewer` mediante el lifecycle preparado.

No se debe elevar privilegios a esa misma cuenta para resolver el problema por circularidad.

## Carriles

A — frontend/UX: sin cambios; visual continúa condicionado al universe gate.  
B — backend/seguridad: lifecycle temporal IAM se detuvo fail-closed antes de cualquier write; executor actual no es apto.  
C — datos/migración: los 2 fingerprints siguen sin adjudicación; no se leyó Cloud Logging ni datos de clientes en esta ejecución.

## Claude

`REPLICABLE_CLAUDE_ACUMULADO`

Patrón: separar principal objetivo del ejecutor IAM. Antes de un grant temporal, comprobar que el ejecutor posee capacidad administrativa sobre el recurso objetivo; si no, detener antes del primer policy read/write y no intentar autoescalamiento.

## Academia

`ACADEMIA_ACTUALIZAR`

Diferenciar:

- principal que necesita acceso temporal;
- ejecutor autorizado para modificar IAM;
- permiso que se desea conceder.

No deben asumirse como la misma identidad.

## Siguiente acción exacta

No repetir v35.

Identificar source-only un ejecutor IAM administrativo ya existente y autorizado por la arquitectura del LAB que pueda gestionar exclusivamente la policy de la Log View objetivo. Esa identificación no debe leer secrets ni ejecutar APIs de Google.

Si no existe evidencia versionada de un ejecutor separado, cualquier diagnóstico runtime de otra identidad o cualquier grant requiere una autorización explícita nueva y un request diferente.
