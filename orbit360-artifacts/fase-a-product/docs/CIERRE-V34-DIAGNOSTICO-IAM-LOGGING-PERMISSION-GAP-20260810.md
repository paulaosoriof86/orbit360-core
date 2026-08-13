# CIERRE V34 — DIAGNÓSTICO IAM LOGGING / PERMISSION GAP

Fecha: 2026-08-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate rector: `block1-client360-insurers-lab-v20260717` / contrato `1.0.41`

## Estado

`DIAGNOSTIC_PASS / IAM_LOGGING_CAPABILITY_GAP`

Clasificación causal:

`ENVIRONMENT_FAILURE / REQUIRED_LOGGING_PERMISSION_NOT_EFFECTIVE`

Este cierre no modifica IAM, no reintenta v33, no adjudica los 2 clientes y no cambia el contrato formal de Block1.

## Fuente y preparación

Source v34 inicial:

- run: `31424257131`;
- HEAD source: `50df1c28d4cbdcd5169190971c8b778a1d5ca23f`;
- objetivo: comprobar exclusivamente `logging.logEntries.list` y `logging.privateLogEntries.list` mediante `projects.testIamPermissions`;
- source capabilities: cero secrets, cero red, cero Firestore/Auth/Audit Logs/IAM writes.

Preparación runtime:

- primer run source-prep: `31432163895`;
- canonical Block1 source gate: PASS;
- fixture GO v34: `18/18 PASS`;
- STOP posterior: detector estático auto-coincidió con sus propios literales de prohibición;
- clasificación: `VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`;
- secrets/red/runtime: 0.

Rootfix source-prep:

- commit: `caeee3ddb4029d5c7f4b79d67521d02e0419343b`;
- run: `31432235243`;
- status: `PASS_V34_RUNTIME_PREP_SOURCE`;
- request real todavía ausente durante ese PASS.

## Request único

Request:

`.github/orbit360-requests/block1-client360-insurers-v34-logging-iam-capability-authorization.json`

Commit de autorización:

`a33caa805010be2f1387f46fd76144362923b6d4`

Parent autorizado:

`caeee3ddb4029d5c7f4b79d67521d02e0419343b`

El primer YAML runtime no fue aceptado por GitHub Actions por el mismo riesgo de scalar con `: ` dentro del `if:`. Se trató como `PIPELINE_MECHANISM_FAILURE` pre-ejecución. El request no fue reemplazado ni duplicado.

Reparación pre-ejecución:

`c63885aab4059857a8933188bcb594e510717e82`

La reparación:

- conservó el request intacto;
- verificó que el commit de autorización seguía siendo el único commit que creó el request;
- ligó el parent exacto;
- reemplazó el detector textual genérico por una comprobación semántica del probe;
- permitió una sola ejecución sobre el mismo request.

## Runtime único

Run: `31432381783`  
Job: `93598614402`  
Attempt: `1`  
HEAD ejecutado: `c63885aab4059857a8933188bcb594e510717e82`

Todos los pasos terminaron success:

1. request y parent binding: PASS;
2. canonical Block1 source gate antes de secrets: PASS;
3. `GO_GATE_CONTRACT_RUNTIME_V34`: PASS;
4. gate v34: `18/18 PASS`;
5. zero-write/no-data-read semantic boundary: PASS;
6. dependencia aislada: PASS;
7. una ejecución de `projects.testIamPermissions`: PASS;
8. evidencia sanitizada y scope: PASS;
9. observable status: success;
10. enforce no-retry: PASS.

## Resultado objetivo

```text
permissionCount: 2
logging.logEntries.list: false
logging.privateLogEntries.list: false
decision: IAM_LOGGING_CAPABILITY_GAP
classification: ENVIRONMENT_FAILURE
rootCause: REQUIRED_LOGGING_PERMISSION_NOT_EFFECTIVE
ok: true
```

La cuenta LAB utilizada por el runtime no posee efectivamente ninguno de los dos permisos necesarios para consultar los Data Access Logs privados.

Esto explica el `AUDIT_UNAVAILABLE_OR_FORBIDDEN` observado en v33 sin necesidad de repetir la consulta focal.

No demuestra ausencia de logs y no demuestra ausencia de escrituras históricas.

## Evidencia sanitizada

Artifact: `9079620393`  
Digest: `sha256:df591e022184e8badf92fcb3ab8da6007cea413dabbec41a6d70509cf6df65b7`

Scope real observado:

```text
iamPolicyBindingsRead: false
auditLogEntriesRead: false
targetClientDataRead: false
iamWrites: 0
operationalWrites: 0
firestoreReads: 0
firestoreWrites: 0
authReads: 0
authWrites: 0
rawPrincipalPersisted: false
credentialsPersisted: false
containsPII: false
containsSecrets: false
```

## Request consumido

Commit de consumo:

`c4cbe1b1a93eab8cc01770c5df3f145abf8f54a9`

Estado final:

```text
status: CONSUMED
allowedExecutions: 0
consumed: true
authorizationFrozen: true
replayAllowed: false
consumedByRunId: 31432381783
consumedByAttempt: 1
```

No existe autorización para repetir v34.

## Cierre del falso rojo source-prep

El run paralelo `31432382570` quedó rojo después de que el runtime ya había concluido correctamente. La causa fue otro auto-match del detector source sobre los literales `setIamPolicy`, `add-iam-policy-binding` y `playwright` contenidos dentro del propio detector del workflow runtime.

Clasificación:

`VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`

Se corrigió el source gate para validar el probe operativo y no los literales del detector.

Run final source-only:

`31432516291`

Estado:

`PASS_V34_RUNTIME_PREP_SOURCE`

No hubo segundo runtime ni nueva llamada a Google.

## Carriles

A — frontend/UX/Academia: sin cambios funcionales; visual sigue condicionado al universe gate de Block1.  
B — backend/seguridad: v34 demuestra una brecha efectiva de permisos de Logging; ningún grant fue autorizado ni aplicado.  
C — datos/migración: los 2 clientes pendientes siguen sin adjudicación; no se reimportó ni leyó información de clientes en v34.

## Claude

`REPLICABLE_CLAUDE_ACUMULADO`

Patrón reusable: antes de otorgar permisos por un `403`, ejecutar una prueba mínima `testIamPermissions` limitada a los permisos requeridos; no leer políticas completas si no son necesarias y nunca convertir un permiso faltante en grant automático.

## Academia

`ACADEMIA_ACTUALIZAR`

Diferenciar:

- API/log inaccesible por permiso faltante;
- log realmente inexistente;
- retención insuficiente;
- validador/pipeline obsoleto.

Un `403` no prueba ausencia de eventos. Un `testIamPermissions` negativo prueba únicamente que el principal no posee la capacidad solicitada.

## Siguiente acción exacta

No repetir v34 ni v33.

Cualquier concesión IAM es una operación nueva. Antes de escribir IAM debe prepararse source-only el cambio mínimo de privilegio que otorgue exclusivamente las capacidades de lectura requeridas, con grant temporal/revocable, evidencia antes/después y retiro posterior si la lectura autoritativa se realiza.

Ese grant requiere autorización explícita separada. Hasta entonces:

- IAM writes: NO autorizados;
- Audit Logs: NO reconsultar;
- universe gate: NO ejecutar;
- visual matrix: NO ejecutar;
- producción/main/merge: NO autorizados.
