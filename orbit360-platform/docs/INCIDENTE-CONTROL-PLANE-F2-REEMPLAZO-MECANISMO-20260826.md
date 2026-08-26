# INCIDENTE CONTROL-PLANE F2 — REEMPLAZO DEL MECANISMO DE READINESS

Fecha de cierre metodológico: 2026-08-26  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR canónico: #5 draft/open  
Candidata protegida: artifact `9504702901` · sourceHead `8c9668d6d423e82826b0295431ec699390d79b4b`

## 1. Clasificación

- Clasificación primaria: `PIPELINE_MECHANISM_FAILURE`.
- Clasificación secundaria observada durante la reparación: `VALIDATOR_STALE`.
- Producto: congelado; no se identificó una nueva causa funcional del producto en este incidente.
- Datos A&S: congelados; cero reimportaciones o escrituras para resolver el incidente.
- Producción: no tocada.

## 2. Problema de raíz

La ruta crítica de salida había convertido un harness sintético autocontenido en condición obligatoria para autorizar F2. El harness mezclaba en una sola simulación: cierre del control-plane, materialización de autorización/request, reserva one-shot, gate/router runtime, publicación, reducción terminal y además una segunda simulación hipotética de recuperación de la autorización después de un fallo pre-riesgo.

Esa última recuperación sintética no era necesaria para ejecutar por primera vez un F2 exitoso, pero su fallo impedía cerrar todo el control-plane. El resultado fue un bucle operativo: el producto y la ruta runtime podían estar preparados mientras un escenario hipotético de recovery seguía bloqueando la salida.

Además se encontró desincronización contractual concreta: el router canónico todavía exigía el modelo previo a la frontera de riesgo mientras owner, register y gate semántico ya operaban con reserva no consumidora. Ese `VALIDATOR_STALE` fue corregido y el router quedó alineado con el request V4 risk-boundary.

## 3. Evidencia causal

Los runs source-only que motivaron el cambio fueron:

- `32911512610`: el primer selftest posterior a la separación reserva/consumo detectó validadores todavía atados al contrato previo.
- `32911989964`: segundo fallo en la misma etapa; se activó `STOP_RETRY` conforme a la regla de causa raíz.
- `32913379566`, job `98011857647`: después de corregir router/registro/gate, se verificaron correctamente los controles críticos del camino inicial F2. Pasaron candidate binding dinámico, source gate, gate pre-provider, router runtime nativo, register read-only, CAS/readback, lifecycle de evidencia, protección contra source writes, reserva sin consumo y las regresiones históricas 329028/329044. Todos los pasos F2 con secrets, Firestore, browser y runtime permanecieron sin ejecutarse.

En `32913379566` los únicos fallos restantes fueron:

- `SCRATCH_PRE_RISK_AUTHORIZATION_REUSE_FAIL`
- `SCRATCH_PRE_RISK_REQUEST_REUSE_FAIL`
- `SCRATCH_AUTHORIZATION_LIFECYCLE_STATE_INVALID`

Los tres pertenecen al mismo escenario sintético de recovery posterior a un fallo hipotético pre-riesgo. No son fallos del camino inicial de F2.

La evidencia durable de ese baseline queda en:

`orbit360-platform/runtime-gate-crm-v20260716/f2-control-plane-release-baseline-run-32913379566-v20260826.json`

## 4. Medida estructural adoptada

Se retira el harness sintético de recovery de la ruta crítica de salida a producción.

Nuevo owner de readiness:

`tools/orbit360-release-readiness-minimal-v20260826.mjs`

El antiguo:

`tools/orbit360-control-plane-selftest-v20260824.mjs`

se conserva únicamente como entrypoint de compatibilidad y delega en el controlador determinista. El preflight Macro 3:

`tools/orbit360-macro3-mechanism-preflight-v20260823.mjs`

también delega en el mismo owner. Por tanto, readiness y Macro 3 ya no pueden divergir por tener dos interpretaciones diferentes del mismo contrato.

## 5. Qué valida el nuevo controlador bloqueante

El nuevo readiness inicial F2 exige, de forma fail-closed:

1. rama obligatoria y PR #5;
2. ledger/package esperados y progreso 75%;
3. boundary sin autorización/request/runtime activos;
4. candidata exacta ligada al ledger y certificación durable;
5. source gate F2 PASS con ejecución todavía cerrada;
6. evidencia runtime previa válida para router/register/gate y ausencia de cambios posteriores en esos archivos críticos;
7. autorización one-shot: reservar no consume;
8. regresión histórica pre-riesgo 329028 preservada;
9. regresión histórica post-riesgo 329044 consumida;
10. segundo intento reservado bloqueado;
11. workflow topology sin mutadores no autorizados;
12. no-source-rewrite y source-write behavioral guard;
13. publication CLI machine contract;
14. lifecycle class-wide de evidencia, incluido nombre futuro desconocido;
15. CAS/readback exacto del HEAD remoto;
16. convergencia canónica;
17. cero runtime, browser, secrets, Firestore, writes, deploy o producción durante readiness.

## 6. Qué deja de ser bloqueante

La simulación autocontenida que intenta reutilizar una autorización después de un fallo hipotético pre-riesgo ya no es requisito para el primer F2.

Esto no elimina el fail-safe real. Si durante un F2 real ocurre un fallo antes de observar riesgo privilegiado, el terminal reducer debe preservar la autorización y mantener el sistema fail-closed. Si el recovery real falla, se trata como incidente del mecanismo y no se continúa a runtime ni producción.

## 7. Seguridad y autorizaciones

Este cambio no autoriza F2 por sí mismo y no autoriza go-live.

- Readiness es source-only.
- F2 requiere autorización explícita independiente una vez que el control-plane cierre PASS.
- El presupuesto one-shot se reserva sin consumirse.
- El consumo solo ocurre al observar riesgo privilegiado efectivo.
- Writes, deploy, producción, `main` y merge permanecen prohibidos durante F2.
- Un PASS terminal F2 habilita únicamente la solicitud separada de autorización de go-live.

## 8. Archivos principales del rootfix

- `tools/orbit360-f2-authorization-lifecycle-v20260825.mjs`
- `tools/orbit360-continuity-transition-owner-v20260820.mjs`
- `tools/orbit360-validar-gate-contracts-v20260717.mjs`
- `tools/orbit360-register-f2-productive-acceptance-runtime-v20260819.mjs`
- `tools/orbit360-f2-gate-semantic-v20260824.mjs`
- `tools/orbit360-release-readiness-minimal-v20260826.mjs`
- `tools/orbit360-control-plane-selftest-v20260824.mjs`
- `tools/orbit360-macro3-mechanism-preflight-v20260823.mjs`
- `tools/orbit360-continuity-transition-owner-v20260824.mjs`
- `orbit360-platform/docs/orbit360-control-plane-semantic-contract-v20260824.json`
- `orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json`
- `orbit360-platform/runtime-gate-crm-v20260716/f2-control-plane-release-baseline-run-32913379566-v20260826.json`

## 9. Reglas permanentes anti-bucle

- No volver a hacer que una simulación hipotética de recovery bloquee el primer F2 si el camino inicial y los controles de seguridad ya están demostrados.
- No mantener dos owners de readiness con contratos distintos.
- Todo validador de Macro 3/readiness debe delegar al mismo owner determinista.
- Si el controlador determinista falla dos veces en la misma etapa, no se agrega un tercer parche; se retira el control-plane custom de la ruta crítica y se adopta un workflow mínimo estándar: candidate CAS → source gate → autorización explícita → gate runtime → provider read-only → browser/integridad → terminal reducer.
- Producto y datos no se modifican para satisfacer un validador del control-plane.

## 10. Clasificación para Claude y Academia

- `BACKEND_PROTEGIDO_NO_CLAUDE`: owners, workflow, authorization lifecycle, publication, gates y control-plane.
- `ACADEMIA_ACTUALIZAR`: diferencia entre defecto funcional, `VALIDATOR_STALE` y `PIPELINE_MECHANISM_FAILURE`; reserva versus consumo one-shot; criterio de `STOP_RETRY`; separación entre readiness inicial y recovery.
- No contiene secretos, PII ni datos reales de clientes.

## 11. Siguiente acción exacta

Ejecutar una única validación canónica source-only del nuevo controlador determinista mediante el PR técnico intent-only. Si PASS, publicar handshake y cerrar hardening. Solo después solicitar autorización F2 explícita. Si el controlador determinista falla dos veces en la misma etapa, activar el workflow mínimo estándar y retirar el control-plane custom de la ruta crítica.
