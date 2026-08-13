# CIERRE V36 — DIAGNÓSTICO READ-ONLY DE EJECUTOR IAM

Fecha: 2026-08-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate rector: `block1-client360-insurers-lab-v20260717` / contrato `1.0.41`

## Estado

`STOP_RETRY`

Clasificación causal:

`ENVIRONMENT_FAILURE / IAM_POLICY_ANALYZER_READ_FORBIDDEN`

V36 se ejecutó una sola vez, read-only, y se cerró sin segundo intento.

## Objetivo

Determinar si existe una identidad administrativa distinta de la cuenta LAB objetivo con capacidad efectiva para gestionar la IAM policy de:

`projects/ays-orbit-360-lab/locations/global/buckets/_Default/views/_AllLogs`

Permisos objetivo de diagnóstico:

- `logging.views.getIamPolicy`
- `logging.views.setIamPolicy`

V36 no autorizó ninguna modificación IAM.

## Preparación source-only

Source run inicial:

`31441747750`

Resultado:

`PASS_V36_SOURCE`

Artifact:

`9083083851`

Digest:

`sha256:454c5be04c7a45e4ba066e731baad527e65ff4d738e3cd3a49c1b533db505283`

La preparación validó:

- gate canónico antes de capacidades;
- predecessor v35 consumido y congelado;
- lifecycle/registry/engine/request fixture;
- worker offline;
- cero IAM writes;
- cero Firestore/Auth/Logging entries;
- persistencia solo sanitizada.

Registry source-ready:

`0425d6f4b3a9af19b0443d150b32a3759788c6a1`

Revalidación source antes del request real:

`31441790318` — success.

## Request único

Request:

`.github/orbit360-requests/block1-client360-insurers-v36-iam-executor-diagnostic-authorization.json`

Parent autorizado:

`0425d6f4b3a9af19b0443d150b32a3759788c6a1`

Commit de autorización:

`659f5d2d23e9c16f309b5eadce09b92e4784de67`

Request version:

`20260810.36-iam-executor-diagnostic-readonly`

Operación:

`IAM_EXECUTOR_DIAGNOSTIC_READONLY`

## Runtime único

Run: `31441839536`  
Job: `93627990408`  
Attempt: `1`  
HEAD ejecutado: `659f5d2d23e9c16f309b5eadce09b92e4784de67`

PASS previo a la credencial/API:

1. request exclusivo y parent-bound;
2. canonical Block1 source gate;
3. `GO_GATE_CONTRACT_RUNTIME_V36`;
4. gate v36 `17/17 PASS`;
5. worker source-safe offline;
6. zero-write boundary.

La credencial LAB se materializó únicamente después del GO.

## Evidencia runtime y checkpoint exacto

Artifact:

`9083117566`

Digest:

`sha256:d64adeb2a982957545fd60d835fc0298bde88d1931f071eed1640a71d3b3a162`

Evidencia sanitizada:

```text
analysisScopeClass: PROJECT
ancestryReads: 1
policyAnalyzerQueries: 0
policyTroubleshooterQueries: 0
candidateCount: 0
effectiveCandidateCount: 0
iamWrites: 0
firestoreReads: 0
authReads: 0
loggingEntryReads: 0
operationalWrites: 0
decision: STOP_RETRY
classification: ENVIRONMENT_FAILURE
rootCause: IAM_POLICY_ANALYZER_READ_FORBIDDEN
```

Interpretación estricta:

- la cuenta LAB sí obtuvo la lectura de jerarquía autorizada;
- el scope de análisis resultó `PROJECT`;
- el intento de Policy Analyzer fue rechazado por permisos antes de obtener una respuesta de análisis válida;
- por eso no hubo candidatos y Policy Troubleshooter no se ejecutó;
- `candidateCount: 0` **no demuestra** que no exista un ejecutor administrativo;
- demuestra únicamente que la identidad usada para el diagnóstico no tiene visibilidad suficiente mediante Policy Analyzer.

## Seguridad observada

```text
iamPolicyWrites: 0
iamWrites: 0
firestoreReads: 0
authReads: 0
loggingEntryReads: 0
operationalWrites: 0
rawPoliciesPersisted: false
rawPrincipalsPersisted: false
principalFingerprintsOnly: true
credentialsPersisted: false
containsPII: false
containsSecrets: false
```

No hubo `setIamPolicy`, grants, revokes, creación de service accounts, llaves, cambios de roles, Hosting, browser, deploy, producción, main ni merge.

## Request consumido y congelado

Commit:

`1f1db4f982e6914a753efcfd3cff4087361a1775`

Estado final:

```text
status: CONSUMED_STOP_RETRY
allowedExecutions: 0
consumed: true
authorizationFrozen: true
replayAllowed: false
consumedByRunId: 31441839536
consumedByAttempt: 1
```

No existe autorización para repetir v36.

## Lifecycle y registry finales

Lifecycle cierre:

`d23b58a012e41c57c27ad835dc9fd7c8c94fac3c`

Registry cierre:

`773aac9db61cc51810e064636d4b3eb23e6748f9`

Revalidación source final:

`31441999183` — success.

Artifact source final:

`9083175153`

Digest:

`sha256:f6dcc496f43febab9b60f54c0a5aeb450ae5f15ce8a01121a4bedc0b35c137b7`

## Causa raíz acumulativa v34–v36

La secuencia ya está demostrada y no debe reiniciarse:

1. v34: la cuenta LAB carece de permisos para leer los logs privados requeridos;
2. v35: la misma cuenta LAB carece de capacidad para modificar IAM de la Log View y no puede autoasignarse el rol temporal;
3. v36: la misma cuenta LAB tampoco posee la visibilidad de Policy Analyzer requerida para descubrir de forma autoritativa otro ejecutor IAM.

Esto es una brecha de **control administrativo IAM del entorno**, no un defecto funcional de Cliente 360, Aseguradoras ni de los datos de los dos clientes.

## Carriles

A — frontend/UX: sin cambios; continúa congelado hasta resolver el universe gate.  
B — backend/seguridad: v36 read-only cerró `ENVIRONMENT_FAILURE / IAM_POLICY_ANALYZER_READ_FORBIDDEN`; cero writes.  
C — datos/migración: los 2 fingerprints continúan sin adjudicación; v36 no leyó clientes ni logs.

## Siguiente acción exacta

No repetir v36 ni ampliar permisos de la misma cuenta LAB por autoescalamiento.

Cualquier mecanismo alterno para obtener visibilidad IAM —por ejemplo una lectura directa de policy por una identidad con privilegio administrativo existente, o el uso controlado de una identidad administradora distinta— requiere una autorización nueva y un request diferente. La próxima acción debe conservar cero escrituras IAM hasta identificar primero una identidad administradora válida.
