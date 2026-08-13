# CIERRE V37 — VISIBILIDAD IAM DIRECTA DEL PROYECTO PASS

Fecha: 2026-08-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate rector: `block1-client360-insurers-lab-v20260717` / `1.0.41`

## Estado

`PASS`

Clasificación:

`ENVIRONMENT_PROJECT_IAM_DIRECT_VISIBILITY_PASS`

V37 se ejecutó una única vez en runtime read-only. No hubo segundo intento.

## Causa previa y cambio material

V36 cerró `ENVIRONMENT_FAILURE / IAM_POLICY_ANALYZER_READ_FORBIDDEN`.

V37 no repitió Policy Analyzer. Sustituyó el mecanismo por:

1. `projects.testIamPermissions` para `resourcemanager.projects.getIamPolicy`;
2. una sola lectura `projects.getIamPolicy` únicamente si el permiso era efectivo;
3. policy version 3 solicitada;
4. procesamiento en memoria y persistencia solo sanitizada.

## Source

Primer source run: `31442662309` — STOP antes de runtime.

Clasificación:

`VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`

Causa raíz:

el validador heredoc Node intentó usar la variable Bash `R` sin exportarla y produjo `ReferenceError: R is not defined`.

Todo lo sustantivo previo al fallo había pasado: gate, predecessor, engine/fixture y worker offline.

Rootfix único:

`8909bf63488cc059cdf650a3c172bafda9f9a3e8`

Segundo source run:

`31442724397` — PASS.

Artifact source:

`9083422794`

Digest:

`sha256:6958f351896657e70418a28a27461ba5ac319b0deee0ded19e7a4f51cbfe6fb7`

Revalidación source-ready:

`31442767913` — PASS.

## Request único

Parent source-ready:

`ca2bf15df232eb4fef1769555871f0c2e3091080`

Commit de autorización:

`773403657f92e2de8fb6ab2e19004502a769537d`

Request:

`.github/orbit360-requests/block1-client360-insurers-v37-project-iam-direct-visibility-authorization.json`

Request version:

`20260810.37-project-iam-direct-visibility-readonly`

## Runtime único

Run:

`31442798546`

Job:

`93630820516`

Attempt:

`1`

HEAD ejecutado:

`773403657f92e2de8fb6ab2e19004502a769537d`

Todos los checkpoints del workflow PASS, incluido cierre sin retry.

Artifact runtime:

`9083448667`

Digest:

`sha256:1fda9a644c8c2029494a4d3af10458a5bcc7e12938acd94e2da63f2ff85300db`

## Evidencia runtime sanitizada

```text
testIamPermissionsCalls: 1
testPermissionEffective: true
projectIamPolicyReads: 1
requestedPolicyVersion: 3
returnedPolicyVersion: 1
candidateCount: 1
ambiguousBindingCount: 0
unverifiedCustomRoleBindingCount: 0
selectedExecutorType: USER
selectedExecutorFingerprint: c8c3e8ab1b4acf50a47c
selectedRoleIds: roles/owner
iamWrites: 0
policyAnalyzerQueries: 0
policyTroubleshooterQueries: 0
firestoreReads: 0
authReads: 0
loggingEntryReads: 0
operationalWrites: 0
```

La policy solicitó versión 3. La API retornó versión 1 porque no hubo condiciones aplicables en el resultado observado; no se degradó manualmente la solicitud.

## Interpretación estricta

Se identificó exactamente un candidato administrativo directo de proyecto, distinto de la cuenta LAB objetivo, cuyo role ID pertenece a la intersección source-verificada de roles que contienen `logging.views.getIamPolicy` y `logging.views.setIamPolicy`.

El candidato es un `USER` con `roles/owner`.

La identidad real no fue persistida. Únicamente se conserva el fingerprint sanitizado `c8c3e8ab1b4acf50a47c`.

No hubo grupos, dominios o bindings condicionales privilegiados que volvieran ambiguo el resultado, ni custom roles no verificables dentro de la clasificación ejecutada.

## Seguridad

```text
rawPoliciesPersisted: false
rawPrincipalsPersisted: false
principalFingerprintsOnly: true
credentialsPersisted: false
containsPII: false
containsSecrets: false
```

Cero IAM writes, `setIamPolicy`, grants, revokes, creación de service accounts/llaves, Policy Analyzer, Troubleshooter, Firestore, Auth, Logging entries, Hosting, browser, deploy, producción, main o merge.

## Request consumido

Commit:

`9532940f9754636a88456719a72a9f1abea262a6`

Estado final:

```text
status: CONSUMED_PASS
allowedExecutions: 0
consumed: true
authorizationFrozen: true
replayAllowed: false
consumedByRunId: 31442798546
consumedByAttempt: 1
```

## Control-plane final

Lifecycle cierre:

`ab4c997dc8d49302563f13dd6624b6448054380c`

Registry cierre:

`fcbee1e63a44e8f2b1f044e2eb04931de5f56669`

Revalidación source final:

`31442923027` — PASS.

Artifact source final:

`9083487792`

Digest:

`sha256:90f64d4563db5393bd49b74d77ae68c3f310794ab711ee509ba440350d52ff48`

## Causa raíz acumulativa v34–v37

1. v34: la cuenta LAB no dispone de lectura privada de logs necesaria;
2. v35: la cuenta LAB no puede modificar IAM de la Log View y no puede autoasignarse acceso;
3. v36: la cuenta LAB no puede usar Policy Analyzer para descubrir administradores;
4. v37: la misma cuenta sí puede leer la policy IAM directa del proyecto y esa lectura demuestra un único candidato administrativo directo `USER / roles/owner`.

La ruta correcta no es elevar la cuenta LAB, sino separar el principal técnico de la identidad administradora que controla IAM.

## Carriles

A — frontend/UX: sin cambios; continúa congelado hasta resolver universe gate.  
B — backend/seguridad: v37 PASS read-only; administrador directo identificado de forma sanitizada; cero writes.  
C — datos/migración: los dos fingerprints de clientes continúan sin adjudicación; v37 no leyó datos ni logs.

## Claude

`REPLICABLE_CLAUDE_ACUMULADO`: capability-first read, cambio de mecanismo tras fallo de observabilidad, policy v3, sanitización previa a persistencia y ambigüedad fail-closed.

## Academia

`ACADEMIA_ACTUALIZAR`: un mecanismo de observabilidad puede fallar aunque otro mecanismo read-only autorizado sea suficiente. No confundir falta de Policy Analyzer con ausencia de administrador.

## Siguiente acción exacta

No repetir v37 y no reutilizar su request.

El siguiente bloque, si se autoriza, debe estar controlado por la identidad administradora identificada y no por la cuenta LAB bloqueada. Antes de cualquier IAM write debe resolverse un mecanismo seguro para ejecutar bajo autoridad del owner sin persistir su identidad/credencial y volver a comprobar la capacidad efectiva de administrar exclusivamente la Log View objetivo.

Cualquier grant/revoke sigue requiriendo autorización explícita nueva y un request distinto.
