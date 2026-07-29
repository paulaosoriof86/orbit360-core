# Orbit 360 A&S — M5 5.0.26 STOP por dos fallos de package/control plane

Fecha: 2026-07-29  
Gate: `block5-release-candidate-visualization-v20260728`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
RC preservada: `ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61`

## Bloque

M5 continúa abierto. La candidata runtime 5.0.25 permanece preparada pero **no ejecutada**. La autorización explícita recibida para un runtime fue invalidada antes de crear request porque el package 5.0.26 falló dos veces en la misma etapa.

## Carriles

- Carril A — frontend/UX/Academia: producto visual sin cambios; resolver responsive 5.0.24 sigue PASS 28/28.
- Carril B — backend/seguridad/store: sin acceso Firestore, secretos, browser ni runtime en ambos packages 5.0.26; cero escrituras.
- Carril C — datos reales/migración: baseline preservado 414 clientes, 26 aseguradoras, 7 asesores; no hubo migración ni reimportación.

## Fuente/base

- M5 5.0.24 estático: PASS 28/28.
- Contrato canónico de resolver: `tools/orbit360-responsive-title-resolver-contract-v20260729.json` v20260729.1.
- Candidata no ejecutada: `tools/orbit360-m5-runtime-smoke-525-browser-v20260729.mjs`, blob SHA `70d6ad22553bd0387fa08dd2eeeb6e3b9834fa12`.
- Stop overlay vigente: `tools/orbit360-m5-release-candidate-stop-overlay-526-v20260729.json`.

## Package 5.0.26 — intento 1

- Commit: `059212882153f777bc3a8ab56140f3095c49736c`
- Run: `30481853743`
- Job: `90677666777`
- Artifact: `8735962519`
- Digest: `sha256:b1554fc410626c021433352098c376d7aa74b8b5ad52930578adbce28be7ca0b`
- Preflight: 16/21.
- Fallos: `REM_524`, `WRAPPER_CONTRACT_EXEC`, `WRAPPER_CONTRACT_PASS`, `CANDIDATE_CONTRACT_EXEC`, `CANDIDATE_CONTRACT_PASS`.
- Clasificación: `VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`.
- Causa raíz: los consumidores 5.0.26 esperaban `staticAttempt`, mientras el freeze canónico 5.0.24 cerrado usa `staticVerification`.
- Capacidades operativas: no usadas; request ausente, secretos no leídos, Firestore no leído, navegador/runtime no ejecutados.

Se corrigió una sola vez el consumidor para leer `staticVerification`.

## Package 5.0.26 — intento 2 y stop-line

- Commit: `0a18fd87742ba2b5cd896bb7857c4de3fa70e4a1`
- Run: `30482337946`
- Job: `90679336990`
- Artifact: `8736166610`
- Digest: `sha256:67b20e35de59d36a4b95e7f8e894549b6d2193bd67e578f4d6015ddd43f5622e`
- Wrapper contract: 10/10 PASS.
- Canonical preflight: 19/21.
- Candidate contract: 13/14; único fallo real `RESOLVER_CONTRACT`.
- Clasificación: `VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`.
- Causa raíz: el contrato consumidor volvió a asumir una estructura que no existe (`scopeFallback`). El contrato canónico real usa `scopedExactTextFallback` y un bloque superior `insurerFicha`.
- Producto protegido: intacto.
- Candidata runtime 5.0.25: intacta y no ejecutada.
- Request: nunca creado.
- Firestore writes: 0.
- Operational writes: 0.
- Hosting/Functions/Rules/producción/main/merge: no tocados.

Al fallar la misma etapa package por segunda vez se aplicó la regla contractual: **STOP, sin tercer parche, sin tercer package y sin request/runtime**.

## Estado de autorización

La autorización del usuario no fue consumida por runtime porque la ejecución operativa nunca empezó. Sin embargo quedó **invalidada** por el stop-line del package:

- `runtimeSmokeAuthorized: false`
- `allowedExecutions: 0`
- `requestCreated: false`
- `authorizationConsumed: false`
- `authorizationInvalidated: true`

Los workflows de package y runtime 5.0.26 quedaron congelados en `workflow_dispatch` con fallo deliberado si alguien intenta invocarlos.

## Causa raíz metodológica consolidada

No hay evidencia de un defecto funcional nuevo. El problema está en cómo el control plane 5.0.26 valida contratos JSON: los consumidores codificaron nombres de propiedades inferidos en lugar de depender del esquema/paths canónicos. El primer parche cambió un nombre obsoleto, pero el segundo intento reveló la misma falla estructural en otro contrato. Por eso seguir sustituyendo nombres uno por uno sería repetir el patrón de parcheo que la metodología prohíbe.

La corrección de raíz siguiente debe rediseñar el validador para:

1. cargar el contrato JSON canónico como fuente de verdad;
2. verificar rutas declaradas por el propio contrato o por un schema/version contract, no nombres adivinados en múltiples consumidores;
3. tener fixtures de compatibilidad de esquema positivos y negativos;
4. fallar estáticamente si lifecycle, freeze, registry y engine no consumen la misma revisión;
5. no habilitar runtime hasta que ese rediseño cierre PASS independiente.

## Claude

`REPLICABLE_CLAUDE_ACUMULADO`:
- schema-driven validators en vez de property-name duplication;
- un owner canónico de rutas/shape de contratos;
- fixtures que prueben cambios de nombre/estructura;
- package pre-runtime como barrera real de capacidades;
- stop-line automático tras dos fallos de la misma etapa.

No enviar a Claude secretos, datos reales, Firebase/Firestore ni backend protegido.

## Academia

`ACADEMIA_ACTUALIZAR`:
- diferencia entre defecto funcional, `VALIDATOR_STALE` y `PIPELINE_MECHANISM_FAILURE`;
- por qué un contrato JSON debe ser consumido por esquema y no por nombres duplicados;
- por qué dos fallos del mismo package obligan a detener el parcheo;
- diferencia entre autorización recibida, request creado y autorización realmente consumida;
- evidencia de que un package puede fallar de forma segura antes de leer secretos o datos.

## Pendiente

M5 sigue abierto. Revisión visual, producción y Pólizas continúan bloqueados.

## Siguiente acción exacta

Abrir un **nuevo bloque estático de rediseño del control plane/schema 5.0.26**, sin runtime, secretos, Firestore, navegador ni producto. Debe cerrar PASS con contratos dirigidos por esquema canónico. Solo después podrá solicitarse una nueva autorización explícita para ejecutar una candidata runtime sobre la RC preservada.
