# CIERRE V33 — RUNTIME AUDITORÍA EXTERNA / ENVIRONMENT FAILURE

Fecha: 2026-08-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717` / contrato `1.0.41`

## Estado

`STOP_RETRY`

Clasificación:

`ENVIRONMENT_FAILURE / AUDIT_UNAVAILABLE_OR_FORBIDDEN`

Este cierre no adjudica los 2 clientes y no cambia el contrato formal de Block1.

## Preparación source-only

La preparación runtime se separó del gate source y cerró antes de capacidades:

- source-ready HEAD: `b9a4083d5564deb76258e5cf7059f38400bc2241`;
- run source: `31423174384`;
- request real nuevo, exclusivo e inmutable: commit `333b88acb415a7e335e387f4c6a1bc11995ca811`;
- reparación pre-ejecución del trigger YAML: commit `71b5b13ff0c1578734306056f52ee1cbb0ce4f18`.

La primera versión del workflow no fue aceptada por GitHub Actions por un scalar YAML no citado. Fue `PIPELINE_MECHANISM_FAILURE` pre-ejecución: no consumió request, no leyó secrets y no ejecutó runtime. Se corrigió únicamente el trigger, conservando el mismo request sin cambios.

## Runtime único

Run: `31423421795`  
Job: `93569358307`  
Attempt: `1`

Antes de secrets:

- request y parent binding: PASS;
- gate canónico runtime: `21/21 PASS`;
- estado: `GO_GATE_CONTRACT_RUNTIME_V33`;
- clasificación de gate: `DATA_CONTRACT_EXTERNAL_AUDIT_RUNTIME_AUTHORIZED_READONLY`;
- zero-write semantic boundary: PASS;
- fixtures v33: PASS.

Límites autorizados:

```text
firestore locator operations max: 1
logging queries max: 1
logging read operations max: 2
firestore writes: 0
auth reads: 0
auth writes: 0
operational writes: 0
hosting/browser/deploy/production: 0
```

## Evidencia sanitizada runtime

Artifact: `9076226624`  
Digest: `sha256:c4c99c7b301d9134cdc59320b56bb85925938f999adecfd86b7a5d7df0bd899b`

Resultado sanitizado:

```text
targetCount: 2
locatorReferencesObserved: 430
firestoreLocatorReadOperations: 1
loggingReadOperations: 0
writeEventTargets: 0
auditUnavailableTargets: 2
fullyAdjudicated: false
decision: STOP_RETRY
classification: ENVIRONMENT_FAILURE
rootCause: AUDIT_UNAVAILABLE_OR_FORBIDDEN
```

Ambos fingerprints quedaron en `AUDIT_UNAVAILABLE_OR_FORBIDDEN`.

Esto significa que la consulta autoritativa no pudo completarse con la capacidad disponible. No significa que no existan eventos de escritura y no demuestra legitimidad ni residualidad de los 2 clientes.

## Seguridad e integridad

```text
rawLogsPersisted: false
resourceNamesPersisted: false
documentIdsPersisted: false
principalEmailsPersisted: false
callerIpsPersisted: false
firestoreWrites: 0
authWrites: 0
operationalWrites: 0
reimport: false
hostingTouched: false
browserExecuted: false
productionTouched: false
```

No se expuso PII ni secreto en evidencia versionada.

## Request consumido

El request se congeló después del run:

- commit de consumo: `10bf2bfdccb2c46fe214d8ca25c78911294d29c9`;
- status: `CONSUMED_STOP_RETRY`;
- `allowedExecutions: 0`;
- `consumed: true`;
- `authorizationFrozen: true`;
- `replayAllowed: false`.

No existe autorización para repetir `31423421795`.

## Rootfix de transición source

Después del consumo, el gate source quedó rojo porque exigía que el archivo request desapareciera físicamente. Eso era `VALIDATOR_STALE`: un request consumido debe conservarse como evidencia inmutable, no borrarse.

Se corrigieron router, engine y workflow para aceptar exclusivamente:

- request ausente; o
- request histórico con `CONSUMED/CONSUMED_STOP_RETRY`, `allowedExecutions=0`, `consumed=true`, `authorizationFrozen=true`, `replayAllowed=false`.

Cualquier request activo sigue bloqueando el source gate.

Run de revalidación source: `31423931735`  
Estado: `PASS_V33_RUNTIME_PREP_SOURCE_FROZEN_HISTORY`  
Artifact: `9076421929`  
Digest: `sha256:6ce0eb9ced74ecd766d950b28d5590737e79f5a758c7a108ffb3a0950ab58e6f`

Capacidades en esta revalidación: cero secrets, cero Firestore/Logging, cero runtime, cero writes, cero deploy, cero producción.

## Diagnóstico IAM fuente

La evidencia versionada previa de IAM se concentra en Functions/Cloud Run y en autorización callable. No se encontró un cierre previo que demuestre capacidad `logging.privateLogEntries.list` para la cuenta runtime LAB. El requisito aparece explícitamente en el contrato v33 como una capacidad nueva necesaria para consultar Data Access Logs.

Por ello no corresponde conceder un rol a ciegas ni repetir Audit Logs.

## Siguiente acción exacta

Preparar y validar source-only un diagnóstico IAM mínimo para la cuenta LAB que determine únicamente si el principal efectivo posee las capacidades de lectura de Logging necesarias, sin modificar IAM y sin consultar de nuevo los 2 clientes.

Solo después de ese source PASS podrá existir un request nuevo para un diagnóstico IAM read-only. Si falta permiso, una eventual concesión IAM será una operación distinta y requerirá autorización explícita separada. Si el permiso existe pero los Data Access Logs siguen inaccesibles, cerrar la vía de auditoría como evidencia externa no disponible y pasar a adjudicación humana controlada.
