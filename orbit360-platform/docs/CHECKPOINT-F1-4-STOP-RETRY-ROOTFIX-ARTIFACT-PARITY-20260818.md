# CHECKPOINT F1.4 — STOP_RETRY POR PARIDAD ROOTFIX ↔ ARTEFACTO

Fecha: 2026-08-18 16:16 GT
Proyecto: Orbit 360 / A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open · sin main/merge

## Bloque ejecutado

`F1_4_SINGLE_RUNTIME_ROOTFIX_CONFIRMATION` fue autorizado una sola vez y consumido.

Request inmutable/single-use:
`.github/orbit360-requests/auth-paula-membership-readonly-reconcile-v2-runbound-smoke-20260818-f1-4-01.json`

Commit del request:
`0058e4f928414da182c9e29b2e0c506ebd3258d7`

Run:
`32191671405`

Commit de evidencia persistida:
`5ddbedd22748a207b140d61799def49333d14838`

## Gate obligatorio

El gate canónico se ejecutó antes de proveedor/browser:
`node tools/orbit360-validar-gate-contracts-v20260717.mjs block-auth-paula-membership-readonly-reconcile-v2-lab-v20260817`

Resultado observado en el run:
- `GO_GATE_CONTRACT`;
- contrato `14.3.0`;
- 36/36 checks PASS;
- runtime/browser autorizados para esta única ejecución;
- writes/Auth writes/deploy/production mutation no autorizados.

## Resultado runtime

Evidencia:
`orbit360-platform/runtime-gate-crm-v20260716/r4-production-readonly-smoke-run-32191671405.json`

Resultado:
- Auth signed-in = true;
- emailVerified = true;
- membership disponible/activa = true;
- tenant match = true;
- roles requeridos presentes = true;
- browser ejecutado = true;
- bootstrap `phase=blocked`;
- error observado nuevamente: `membership_invalid:email_invalido`;
- runtime/store/router no iniciados;
- Firestore writes = 0;
- Auth writes = 0;
- operational writes = 0;
- deploy = 0;
- rebuild = 0;
- password secret usado = false;
- custom token persistido = false.

Lifecycle:
`orbit360-platform/runtime-gate-crm-v20260716/auth-paula-gate14-3-pipeline-run-32191671405.json`

Estado: `SEALED_STOP_RETRY`.

No se autoriza ni se ejecutará un segundo F1.4 equivalente.

## Causa raíz forense posterior al STOP

La repetición del error NO demuestra que el rootfix F1.3 haya fallado.

Clasificación vigente:
`PIPELINE_MECHANISM_FAILURE / ROOTFIX_ARTIFACT_PARITY_MISSING`.

Componente secundario:
`VALIDATOR_STALE / MISSING_ROOTFIX_TO_ARTIFACT_PARITY_CHECK`.

Evidencia:

1. El paquete publicado/certificado R4S9C está ligado a source HEAD:
   `861326906558f03d9c8c2e7f34adfb4979a17d73`.
2. El rootfix F1.3 de membership comienza en:
   `a808e13d69dcb687f488be7e17411796eaec3509`.
3. El rootfix de bootstrap continúa en:
   `b050d5a1a9861f898d2bb50d1bcc5c26beb72e9b`.
4. GitHub confirma que `861326...` es ancestro/merge-base y que `a808e13...` está 134 commits por delante.
5. El workflow F1.4 exportó explícitamente `ORBIT360_R4_PACKAGE_SOURCE_HEAD=861326...`.
6. El gate 14.3 dio GO sin comprobar que el artefacto probado contuviera los commits/evidencia F1.3.
7. El navegador, por tanto, volvió a probar el código publicado anterior al rootfix.

Conclusión: F1.4 fue una ejecución válida como evidencia del fallo del mecanismo/gate, pero inválida para juzgar el rootfix F1.3. El rootfix source-only conserva estado PASS, aún no confirmado sobre un artefacto que realmente lo contenga.

## Regla de congelamiento

Hasta corregir source-only la paridad rootfix ↔ artefacto:
- NO segundo request runtime/browser equivalente;
- NO deploy/rebuild;
- NO cambios de contraseña;
- NO usuarios nuevos;
- NO cambios Auth/membership/datos;
- NO reimportación;
- NO main/merge;
- R4S9C se conserva inmutable como paquete publicado actual;
- no se clasifica nuevamente como defecto funcional de membership mientras se esté ejecutando el artefacto viejo.

## Carriles

- Carril A — frontend/UX: congelado; sin cambios.
- Carril B — backend/seguridad/gates: activo únicamente en corrección source-only del gate de paridad de artefacto.
- Carril C — datos reales/migración A&S: intacto; cero cambios.

## Progreso

F1 mantiene 4/5 hitos válidamente cerrados = 80% interno.

F1.4 queda `CONSUMED_STOP_RETRY_INVALID_FOR_ROOTFIX_CONFIRMATION_STALE_ARTIFACT`; no se cuenta como cierre del quinto hito.

Ruta inmediata a producción cerrada: 20%.
Programa integral cerrado: 10%.

## Claude / Academia

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE` para implementación. Patrón reusable acumulable: un gate de confirmación runtime debe verificar que el artefacto bajo prueba contiene el rootfix que pretende confirmar.

Academia: `ACADEMIA_ACTUALIZAR` — caso real de diferencia entre `FUNCTIONAL_DEFECT` observado superficialmente y `PIPELINE_MECHANISM_FAILURE` demostrado por falta de paridad source/artefacto.

## Siguiente acción exacta

`F1_4B_ROOTFIX_ARTIFACT_PARITY_GATE_CORRECTION_SOURCE_ONLY`.

Sin runtime/browser/deploy:
1. congelar el producto;
2. corregir owner/registro/validador/workflow para que una confirmación de rootfix no pueda obtener GO si el `sourceHead` del artefacto certificado no contiene los commits/evidencia rootfix ligados al request;
3. añadir pruebas sintéticas: artefacto anterior al rootfix => STOP; artefacto que contiene rootfix => elegible para continuar a otros checks;
4. sincronizar gate/lifecycle/workflow/docs;
5. no crear candidato ni publicar en este bloque;
6. solo después definir la frontera separada de construcción/publicación de un sucesor que incluya F1.3 y su futura confirmación runtime bajo autorización nueva.
