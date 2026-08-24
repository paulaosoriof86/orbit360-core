# PLAN MAESTRO CONGELADO — SALIDA A PRODUCCIÓN SIN BUCLES — ORBIT 360 A&S

**Fecha:** 2026-08-24 (America/Guatemala)  
**Estado:** `VIGENTE_CONGELADO / AUTORIDAD_OPERATIVA_DE_RUTA / NO_RECONSTRUIR`  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**PR rector:** #5 draft/open  
**Producción/main/merge/deploy:** NO autorizados al congelar este plan.  
**Estado operativo mutable único:** `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`.

Este plan **supercede operacionalmente** al `PLAN-MAESTRO-CONGELADO-DEFINITIVO-RUTA-PRODUCCION-ORBIT360-AYS-20260821.md`, sin borrar su evidencia ni sustituir las reglas maestras/addenda. Incorpora expresamente la auditoría forense del 2026-08-24, la continuidad posterior del mecanismo V3/V3R1 y las reglas de `STOP_RETRY`, causa raíz, aceleración productiva, single-writer y no repetición.

---

## 1. Objetivo único

Salir a producción por una sola ruta:

`CONTROL_PLANE_CAUSAL_PASS → F2_TERMINAL_PASS_REAL → GO_LIVE_AUTORIZADO + PRODUCTION_SMOKE_PASS`.

No se crea otro roadmap, macro paralela, owner paralelo, workflow temporal, request paralelo ni candidata nueva por problemas de mecanismo/documentación.

La candidata funcional preservada es artifact `9504702901`, source `8c9668d6d423e82826b0295431ec699390d79b4b`, 194 archivos, 1 delta, 193 idénticos, Macro-2 source-only `TRANSVERSAL_SOURCE_ACCEPTANCE_PASS`. No se reconstruye ni se reimportan Clientes/Aseguradoras salvo regresión real de producto demostrada.

---

## 2. Estado canónico al congelar

- Ledger: revisión `40`; package objetivo `34`.
- Fase: `MACRO1_CONTROL_PLANE_TRUTH_HARDENING_SOURCE_ONLY`.
- Estado: `CONTROL_PLANE_FALSE_PASS_INVALIDATED`.
- Progreso válido a producción: `75%`.
- F2 terminal PASS: `false`.
- Último one-shot: run `32686810800`, consumido, histórico, `replay=false`.
- El 85%/go-live previo queda formalmente invalidado porque el run no ejecutó browser/runtime.
- Producto y datos permanecen congelados.
- Nueva autorización F2 queda bloqueada hasta cierre de Iteración 1.

---

## 3. Causas raíz que este plan cierra permanentemente

### R1 — PASS sin evidencia causal
Un estado PASS no puede derivarse de `classification` o de documentos coherentes entre sí. PASS exige evidencia del mismo run: `ok:true`, browser real, matriz F2 PASS, integridad before/after del mismo run, cross-tenant denegado, cero writes, cero deploy y cero producción previa.

### R2 — Validators ligados a forma/texto
Los validators no pueden depender de nombres humanos de steps, selectores históricos, IDs de candidata, ordinales o rutas de evidencia viejas. Se validan IDs técnicos, dependencias, capacidades y contratos versionados.

### R3 — Evidencia no run-scoped
Browser, before, after, compare y terminal deben contener `runId`; un PASS exige `browserRunId === integrityRunId === terminalRunId`.

### R4 — Controles supuestamente independientes que comparten implementación
`convergence`, `terminal-truth` e `independent-readback` deben comprobar propiedades diferentes. Un wrapper del mismo validator no cuenta como control independiente.

### R5 — Coherencia documental confundida con verdad
La proyección solo puede ocurrir después de validar evidencia causal. Que ledger/package/README/PR coincidan no demuestra que el estado sea verdadero.

### R6 — Workflow mutable por candidata/fase
Se prohíbe reescribir el workflow para cada artifact, autorización o recuperación. Existe un único workflow base-owned genérico. Un PR de ejecución puede cambiar exactamente un intent JSON y nunca el workflow.

### R7 — Patch-over-patch/facade que reescribe core histórico en runtime
Queda prohibido en cualquier path activo `applyOnce`, `source.replace` o generación temporal de código para adaptar un core histórico. Owner, convergence, exact-candidate validator, selftest y promoter deben ser implementaciones directas vigentes. Los cores históricos pueden conservarse solo como evidencia no ejecutable.

### R8 — Trigger de Actions no demostrado antes del request
Se incorpora la continuidad V3/V3R1: antes de materializar autorización/request debe demostrarse un `CONTROL_PLANE_SELFTEST` source-only real en GitHub Actions usando el mismo workflow registrado. Si el handshake no existe, no se crea request ni se consume autorización.

### R9 — Documentación state-bearing desincronizada
El ledger es la única autoridad mutable. Package, boundary, authority, lifecycle, live-state, current-index, checkpoint, PR-state, README current, CHANGELOG current y body real de PR #5 son proyecciones. Deben compartir un fingerprint y la misma revisión. Ninguna fotografía histórica puede conservar `nextAction` operativo vigente.

### R10 — Repetición de infraestructura en módulos futuros
Auth, membership, scopes, `Orbit.store`, write guard, browser harness, integridad, terminal truth, single-writer, CAS, STOP_RETRY y workflow de intents son infraestructura transversal. Pólizas, Vehículos, Recibos, Cobros y módulos posteriores no pueden reconstruirla ni crear su propio workflow/gate de continuidad; solo agregan contratos de dominio y fixtures específicos.

---

## 4. Criterio de garantía

No se afirma que un software complejo pueda garantizar ausencia absoluta de cualquier defecto funcional desconocido. Sí se establece una garantía verificable de proceso:

1. las clases conocidas de error metodológico/mecánico se prueban negativamente antes de runtime;
2. un fallo de mecanismo no puede modificar producto ni datos;
3. un fallo de mecanismo no crea otra macro/plan/workflow/owner/request;
4. un PASS no puede existir sin evidencia causal del mismo run;
5. un documento no puede habilitar riesgo por sí solo;
6. un cambio posterior de módulo reutiliza el mismo harness transversal.

---

## 5. Presupuesto congelado: 3 macro-iteraciones restantes

### ITERACIÓN 1 — `CONTROL_PLANE_FINAL_SOURCE_ONLY`

**Riesgo:** cero runtime, cero browser, cero secrets, cero Firestore, cero deploy, cero producción.

Debe cerrar conjuntamente:

1. eliminar del camino activo la familia completa de facades/source-rewriting de owner, convergence, exact-candidate validator, selftest y promoter;
2. consolidar implementaciones canónicas directas; histórico queda no ejecutable;
3. workflow único base-owned `GENERIC_INTENT_ROUTER`, sin artifact/identidad/revisión hardcodeados;
4. agregar modo `CONTROL_PLANE_SELFTEST` source-only al mismo workflow;
5. batería reusable de regresión negativa:
   - `ok:false + PASS` → FAIL;
   - terminal PASS sin browser → FAIL;
   - integridad de otro run → FAIL;
   - provider sin dependencia de gate → FAIL;
   - cambio de nombre visible conservando IDs/dependencia → PASS;
   - artifact o auth hardcodeado en workflow → FAIL;
   - PR que modifica workflow en ejecución → FAIL;
   - dos accepts del mismo one-shot → STOP_RETRY;
   - CAS con base obsoleta → FAIL;
   - projection intentando mutar ledger → FAIL;
   - código activo con source-rewriting/core legado → FAIL;
   - documentos current sin fingerprint/estado causal → FAIL;
6. handshake real en GitHub Actions: un PR técnico intent-only, `CONTROL_PLANE_SELFTEST`, un solo `synchronize`, sin autorización/request/runtime; debe terminar `SUCCESS`;
7. cerrar V3R1/handshake como patrón reusable, no como excepción de esta candidata;
8. actualizar gate registry, writer registry, preflight, workflow, owner, Academia y documentación en el mismo bloque;
9. transición única de cierre de Macro-1;
10. regenerar atómicamente todas las proyecciones y body PR #5;
11. `convergence PASS` + `terminal-truth PASS` + `independent-readback PASS` + workflow audit PASS + docs discovery PASS;
12. evidencia sanitizada `ok:true`.

**Salida obligatoria:** `CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS`; candidata 9504702901 intacta; progreso 75%; cero auth/request activos; nueva identidad F2 preparada pero no autorizada.

**Prohibición:** si el selftest falla, se repara dentro de esta Iteración 1. No se crea Iteración 1B, workflow alterno ni request F2.

### ITERACIÓN 2 — `F2_FINAL_ONE_SHOT_REAL`

Solo después de Iteración 1 PASS y autorización fresca explícita.

1. verificar nuevamente artifact `9504702901`, digest, zip, manifest y source exactos;
2. una autorización y un request inmutables;
3. consumir presupuesto antes del preflight runtime;
4. gate semántico antes de secrets/Firestore/browser;
5. identidad/membership/tenant/rol/scopes;
6. Dirección desktop + Operativo tablet + Asesor móvil;
7. rutas `inicio`, `cliente360`, `aseguradoras`, `ops`, `leads`, `polizas`, `cobros` + Vehículos/Recibos integrados;
8. cero copy técnico, `undefined`, `NaN`, Infinity/Invalid Date visibles;
9. cross-tenant denegado;
10. integridad before/after run-scoped;
11. cero Firestore/Auth/operational writes;
12. terminal truth en el mismo run;
13. reducer terminal una sola vez y CAS.

**PASS:** `F2_TERMINAL_PASS_REAL`, progreso 85%, siguiente acción `AWAIT_EXPLICIT_GO_LIVE_AUTHORIZATION`.

**FAIL funcional real:** Iteración 2 permanece abierta; se corrige source-only la causa demostrada, se certifica sucesora únicamente si cambió producto y se requiere autorización fresca. No se crea una Iteración 4 ni un plan paralelo.

**FAIL de mecanismo:** debe haber sido prevenido por Iteración 1; si ocurre, es incumplimiento del gate de Iteración 1 y se trata como regresión del control-plane, no se toca producto.

### ITERACIÓN 3 — `AUTHORIZED_RELEASE_WINDOW`

Requiere autorización separada y explícita de go-live.

En una sola ventana controlada:

1. pre-go-live read-only de branchHead, candidata, backend protegido, Auth/membership, rules/Storage, Hosting, secretos requeridos, dominio/observabilidad y rollback;
2. checkpoint/release exacto;
3. deploy/activación únicamente dentro del alcance autorizado;
4. smoke productivo automatizado inmediato reutilizando harness transversal;
5. Dirección/Operativo/Asesor y rutas críticas;
6. integridad, cero regresiones y controles de seguridad;
7. si falla, rollback previsto dentro de la misma ventana;
8. si pasa, `PRODUCTION_SMOKE_PASS` y ruta 100%.

Macro-4 y Macro-5 del plan 20260821 se consolidan operativamente en esta misma ventana de release; no son dos ciclos de preparación independientes.

---

## 6. Regla de iteraciones y tiempo lógico

El presupuesto es de **3 macro-iteraciones**, no de tres mensajes de chat. Cada macro puede contener múltiples pasos técnicos en una misma ejecución continua.

No se autoriza aumentar este presupuesto por fallos documentales, validators stale, triggers, owners o sincronización: esas familias pertenecen a Iteración 1 y deben cerrarse allí.

Un defecto funcional genuinamente nuevo detectado por F2 no puede predecirse con certeza absoluta; si aparece, mantiene abierta Iteración 2 hasta corregirse, sin crear otra ruta ni reiniciar el plan.

---

## 7. Sincronización documental obligatoria

Al cierre de Iteración 1 deben quedar, en una sola publicación atómica y con un único fingerprint:

- ledger;
- production reopening package;
- authorization boundary;
- gate authority;
- source lifecycle;
- runtime lifecycle;
- live-state;
- current documentation index;
- checkpoint;
- PR5 current state;
- README current section;
- CHANGELOG current section;
- body real de PR #5;
- supersession manifest;
- este plan como único plan operativo vigente.

El plan 20260821 y cualquier plan/estado previo quedan `HISTORICAL/SUPERSEDED` para operación, aunque se preservan como evidencia.

---

## 8. Regla para módulos posteriores

Una vez en producción, Pólizas → Vehículos → Recibos/cartera → Cobros/conciliación → Comisiones/planillas → financiero histórico → documentos → Cotizador/Comparativo → Ops/Leads → Marketing → Portal reutilizan obligatoriamente:

- el mismo workflow genérico de intents;
- el mismo owner/state machine;
- el mismo single-writer/CAS;
- el mismo terminal truth;
- el mismo run-scoped integrity;
- el mismo STOP_RETRY;
- el mismo documentation projection/discovery;
- el mismo auth/membership/scopes/browser harness.

Está prohibido crear un nuevo mecanismo por módulo. Un módulo aporta únicamente schema, reglas de negocio, fixtures y evidencia específica.

---

## 9. Estado de carriles

- Carril A frontend/UX/Academia: Macro-2 source acceptance cerrada; producto congelado.
- Carril B backend/security/gates: Iteración 1 activa, source-only.
- Carril C datos reales/migración: congelado; cero reimportación.

Rebranding Gravicentra continúa no bloqueante y fuera de esta ruta crítica.

---

## 10. Reanudación exacta

Toda conversación futura debe:

1. leer reglas maestras/addenda;
2. leer este plan;
3. verificar PR #5 y branchHead vivo;
4. leer ledger;
5. ubicar la primera de estas tres iteraciones que no esté `CLOSED_PASS`;
6. continuar desde su primer gate incompleto;
7. nunca reconstruir roadmap desde memoria o desde un documento histórico.

**Siguiente acción exacta al congelar:** `ITER1_REMOVE_ACTIVE_SOURCE_REWRITING_AND_PROVE_CONTROL_PLANE_SELFTEST_HANDSHAKE`.
