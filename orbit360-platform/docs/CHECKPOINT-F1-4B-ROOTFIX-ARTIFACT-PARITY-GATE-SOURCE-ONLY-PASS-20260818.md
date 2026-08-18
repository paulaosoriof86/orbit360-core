# CHECKPOINT F1.4B — ROOTFIX ↔ ARTEFACTO PARITY GATE SOURCE-ONLY PASS

Fecha: 2026-08-18 16:23 GT
Proyecto: Orbit 360 / A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open · sin main/merge

## Estado de entrada

F1.4 fue autorizado una sola vez y quedó consumido mediante run `32191671405`.

El runtime volvió a observar `membership_invalid:email_invalido`, pero la atribución forense demostró que el artefacto publicado R4S9C probado pertenece al source HEAD `861326906558f03d9c8c2e7f34adfb4979a17d73`, anterior al rootfix F1.3 que comienza en `a808e13d69dcb687f488be7e17411796eaec3509` y continúa en `b050d5a1a9861f898d2bb50d1bcc5c26beb72e9b`.

Clasificación de la causa del reintento inválido:
- primaria: `PIPELINE_MECHANISM_FAILURE / ROOTFIX_ARTIFACT_PARITY_MISSING`;
- secundaria: `VALIDATOR_STALE / MISSING_ROOTFIX_TO_ARTIFACT_PARITY_CHECK`.

F1.4 permanece `SEALED_STOP_RETRY`; no se permite repetirlo contra R4S9C ni abrir un tercer intento equivalente.

## F1.4B implementado

Objetivo: impedir que una confirmación runtime de un rootfix obtenga GO si el artefacto certificado bajo prueba no contiene los commits/evidencia del rootfix que pretende validar.

Implementación source-only:

- `5f51512dab9e96234937b83766d0823197c37506` — nuevo owner de gate con paridad rootfix ↔ artefacto y self-test;
- `b58241888a921548d86b754923989ae803df0923` — registro del gate actualizado para apuntar al owner de paridad;
- `45ebbb3e9c1dd364f40586a2aab98d92e08ad0e9` — lifecycle actualizado con guards obligatorios de paridad y F1.4 consumido;
- `c33b78eac35d7ecd2e286d6f862da2f2936ac60d` — workflow source-only de validación;
- `3c56d0baffce8fc8399050e520ee4cb54cebf4db` — evidencia source-only PASS y router canónico persistido al owner nuevo.

Owner vigente:
`tools/orbit360-validar-gate-contracts-engine-auth-paula-membership-readonly-reconcile-v2-lab-v20260818.mjs`

Router canónico:
`tools/orbit360-validar-gate-contracts-v20260717.mjs`

Lifecycle:
`tools/orbit360-validator-lifecycle-contract-auth-paula-membership-readonly-reconcile-v2-lab-v20260817.json`

## Evidencia PASS

Archivo:
`orbit360-platform/runtime-gate-crm-v20260716/f1-4b-rootfix-artifact-parity-source-only-v20260818.json`

Resultado:
- `ok=true`;
- `status=F1_4B_ROOTFIX_ARTIFACT_PARITY_SOURCE_ONLY_PASS`;
- `oldPackageBlocked=true`;
- `currentHeadContainsRootfix=true`;
- `rootfixEvidencePass=true`;
- `workflowGateBeforeProvider=true`;
- `registryPointsParityOwner=true`;
- browser executed = false;
- runtime executed = false;
- secret access = false;
- data access = false;
- Firestore/Auth/operational writes = 0;
- deploy = 0;
- package rebuild = 0;
- production touched = false.

La regla queda fail-closed: el artefacto R4S9C actual, cuyo source no contiene F1.3, debe detenerse antes de provider/browser en cualquier futura confirmación ligada a ese rootfix. Un artefacto solo puede continuar a los demás checks si su `sourceHead` contiene los commits rootfix requeridos y coincide con el sourceHead certificado/bound por el workflow.

## Qué queda resuelto

`F1_4B_ROOTFIX_ARTIFACT_PARITY_GATE_CORRECTION_SOURCE_ONLY = CLOSED/PASS`.

El defecto metodológico que permitió F1.4 sobre código viejo ya no queda abierto en fuente. El rootfix F1.3 sigue `CLOSED/PASS` source-only, pero todavía NO está confirmado por runtime sobre un artefacto que realmente lo contenga.

No corresponde modificar membership, Auth, contraseña, usuarios, tenant, HostDime ni datos para resolver este punto.

## Carriles

- Carril A — frontend/prototipo/UX: congelado; cero cambios.
- Carril B — backend/seguridad/gates: F1.4B CLOSED/PASS; siguiente frontera es artefacto sucesor.
- Carril C — datos reales/migración A&S: intacto; cero cambios.

## Progreso

Subfases principales F1:
- F1.1: CLOSED;
- F1.2A: CLOSED;
- F1.2B: CLOSED/CONSUMED;
- F1.3: CLOSED/PASS;
- F1.4 confirmación runtime válida del rootfix: todavía no cerrada.

F1.4B es una remediación obligatoria del pipeline y no sustituye la confirmación runtime final. Por ello F1 conserva `4/5 = 80%` interno.

Ruta inmediata a producción cerrada: 20%.
Programa integral cerrado: 10%.

## Paquete publicado

R4S9C permanece publicado e inmutable:
- sourceHead: `861326906558f03d9c8c2e7f34adfb4979a17d73`;
- contiene F1.3: NO;
- no debe reutilizarse para confirmar F1.3.

## Claude / Academia

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE` para implementación. Patrón reusable acumulable: un gate de confirmación debe probar paridad entre el rootfix ligado al request y el source exacto del artefacto certificado antes de cualquier secreto/provider/browser.

Academia: `ACADEMIA_ACTUALIZAR` — caso de `PIPELINE_MECHANISM_FAILURE` donde repetir el mismo error funcional no refuta una corrección source-only si el artefacto ejecutado no contiene dicha corrección.

## Frontera siguiente exacta

`F1_4C_SUCCESSOR_ARTIFACT_BUILD_FRONTIER`.

La autorización F1.4 ya fue consumida y prohibía explícitamente rebuild/deploy. Por tanto F1.4C requiere **autorización explícita nueva para package rebuild/candidata**, separada de cualquier publicación o runtime.

Al autorizar F1.4C, el alcance será únicamente:
1. ejecutar primero el gate aplicable;
2. construir UNA candidata sucesora no publicada desde un `sourceHead` que contenga F1.3 y F1.4B;
3. generar manifest, SHA256, file count y evidencia de paridad rootfix ↔ artefacto;
4. cero Hosting deploy/publicación;
5. cero producción mutation;
6. cero Auth/Firestore/datos/operational writes;
7. detener y sincronizar.

La confirmación runtime/browser sobre esa candidata será una frontera posterior y requerirá autorización separada; no se incluye en F1.4C.
