# PLAN MAESTRO CONGELADO DEFINITIVO — RUTA A PRODUCCIÓN ORBIT 360 A&S

**Fecha:** 2026-08-21 (America/Guatemala)  
**Estado:** `VIGENTE_CONGELADO / AUTORIDAD_DE_RECUPERACION / NO_RECONSTRUIR`  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Baseline HEAD antes de congelar este plan:** `8756053839059116bfa3fbb038a961d4beaae1d1`  
**Producción/main/merge/deploy:** no autorizados al congelar.

Este documento **supercede operacionalmente** a `PLAN-CONGELADO-CIERRE-F2-Y-GO-LIVE-20260820.md` y a cualquier estado/nextAction más antiguo que lo contradiga. Los documentos anteriores se conservan únicamente como historia y evidencia. No sustituye las reglas maestras/addenda; las aplica al estado vivo del 2026-08-21.

---

## 1. Objetivo y regla de continuidad

Cerrar definitivamente la clase de fallas de mecanismo que mantuvo F2 en bucle, corregir de forma transversal los defectos funcionales que el último runtime ya permite anticipar, certificar una sola candidata nueva y avanzar sin rutas paralelas a:

`CONTROL_PLANE_PASS → TRANSVERSAL_SOURCE_PASS → F2_TERMINAL_PASS → GO_LIVE_AUTORIZADO → PRODUCTION_SMOKE_PASS`.

En conversaciones futuras se debe:

1. leer reglas maestras/addenda vigentes;
2. leer **este plan primero entre los documentos operativos**;
3. verificar PR #5 y `branchHead` real;
4. localizar la primera macro-iteración de este plan que no esté `CLOSED_PASS`;
5. continuar exactamente desde ella;
6. no reconstruir roadmap, no reabrir bloques cerrados y no crear un plan paralelo;
7. no ejecutar runtime, secrets, Firestore, browser, deploy ni producción mientras Macro-1 y Macro-2 no estén cerradas;
8. no reutilizar ninguna autorización/request ya ejecutada.

La palabra **HEAD** sola queda reservada para `branchHead`. Siempre distinguir:

- `branchHead`: último commit real de la rama;
- `candidateSourceHead`: fuente exacta del artifact candidato;
- `runtimeControlHead`: commit desde el que arrancó un runtime.

---

## 2. Estado verificable al congelar

### Rama y candidata

- PR #5: draft/open.
- `branchHead` antes de este documento: `8756053839059116bfa3fbb038a961d4beaae1d1`.
- candidata ejecutada en F2: artifact `9433944723`.
- `candidateSourceHead`: `c3bb825da2b1ecae08dabc2034c753482b086fec`.
- artifact digest: `25228e96490004de39dfba685673c80247ce9e7046d7eeff1cde642e4c673643`.
- 194 archivos de producto en manifest.
- comparación `c3bb825d… → 87560538…`: los commits posteriores pertenecen al control plane, workflows, requests, documentación y evidencia; no se detectó mutación adicional de archivos de producto de la candidata.

### Último F2 realmente ejecutado

Run: `32494402695`  
Artifact de evidencia: `9451106452`  
Resultado: `FUNCTIONAL_DEFECT:F2_UNDEFINED_NAN_VISIBLE:desktopDirection:cobros`.

Hechos preservados del runtime:

- gate contractual: PASS;
- artifact exacto `9433944723`: verificado;
- Auth/identidad/tenant/store read-only: alcanzados;
- browser: ejecutado;
- cross-tenant: denegado correctamente;
- write guard: PASS;
- Firestore writes: 0;
- Auth writes: 0;
- operational writes: 0;
- integridad before/after: PASS, conteos y digests idénticos;
- deploy/publicación/production hosting: false.

Pólizas ya no falló por `undefined/NaN`, pero la ruta necesitó aproximadamente `60.7 s` y se recuperó después del timeout del waiter (`recoveredAfterWaitTimeout:true`). Esto se considera **señal funcional/performance a cerrar source-only antes del próximo runtime**, no motivo para aumentar timeouts.

La autorización/request `b8b35fd88e9dc36a2b8a5770cd067b22142a218332faface5a9eb46262ff0ecb` se considera **consumida por seguridad desde el momento en que el runtime autorizado fue ejecutado**. Aunque las proyecciones actuales todavía no lo reflejen, queda prohibido replay/reuse. Macro-1 debe reconciliarlo canónicamente.

---

## 3. Auditoría exhaustiva del mecanismo — familias cerradas por este plan

La auditoría se amplió a state machine, projection, invariant, independent readback, writer audit, canonical workflow, runtime observer, CP11 writer, gate authority/registry/lifecycle, PR body y documentos que se autodenominan actuales. Las fallas de mecanismo que este plan debe eliminar son:

### M1 — Estado terminal incompleto
`tools/orbit360-continuity-transition-owner-v20260820.mjs` solo reconcilia el terminal F2 cuando la clasificación es `VALIDATOR_STALE`. No puede reducir de forma canónica un `FUNCTIONAL_DEFECT` como Cobros, ni PASS, SECURITY_FAILURE, DATA_CONTRACT_FAILURE, ENVIRONMENT_FAILURE o PIPELINE_MECHANISM_FAILURE.

**Solución obligatoria:** un solo reducer genérico de terminales, tipado por clasificación, que consume authorization/request una sola vez y deriva todo el estado posterior.

### M2 — Proyección no derivada del estado
`tools/orbit360-continuity-projection-atomic-v20260820.mjs` genera `live-state`, index y lifecycle con autorización/request forzados a `false` y `freshAuthorizationRequired:true`, incluso cuando ledger/boundary ya avanzaron.

**Solución obligatoria:** proyección puramente derivada del ledger/eventos canónicos; ningún boolean operativo hardcodeado.

### M3 — Invariant/readback incompletos y ligados a historia
El composite invariant conserva Request14 y presupuestos de fase históricos; el readback presupone fail-closed de runtime incluso en fases autorizadas y no valida README, CHANGELOG ni el body real del PR.

**Solución obligatoria:** invariant dinámico por fase + readback sobre todas las proyecciones y fuentes de reanudación reales; cero ordinal/artifact histórico en checks activos.

### M4 — Single-writer lógico, no físico
El registry declara un owner, pero el observer F2 hace `git commit`, `git pull --rebase` y `git push` sobre la rama. CP11 también tiene publicación propia. El workflow-surface audit solo busca writers que toquen targets de proyección y por eso no detecta cualquier writer que mueva el `branchHead`.

**Solución obligatoria:** un único workflow físico con permiso de escritura para estado operativo. Runtime, observer, candidate builder y diagnósticos solo producen artifacts/status; no hacen commit/push. Auditoría de **todos** los workflows para `contents:write`, `git push`, Contents API, `gh pr edit`, rebase u otra mutación de rama.

### M5 — `STOP_RETRY` documentado pero no ejecutable
El package registró `sameStageRetryBudgetRemaining:0`; después el workflow fue modificado para `allow one active pre-gate F2 retry` y se produjeron varios observer cuts.

**Solución obligatoria:** retry budget y fingerprint `stage+code+candidate+authorization` son guardas del reducer. Ningún workflow puede sobreescribirlos. Toda autorización se consume al aceptar/iniciar su único runtime, incluso si el fallo ocurre pre-gate. Un fallo posterior exige causa raíz source-only y autorización fresca; nunca replay.

### M6 — Autoridades/documentos con estado viejo
PR body, README, CHANGELOG current block, `PLAN-VIVO-AVANCE-BACKEND-AYS-20260704.md`, live-state, current index, runtime lifecycle y metadata global del gate registry contienen fotografías antiguas incompatibles entre sí.

**Solución obligatoria:** el ledger queda como **único estado operativo mutable**. Package/gate contract son política/contrato; authorization/request/evidence son eventos append-only. Live-state, index, lifecycle, checkpoint, PR-state, README current section, CHANGELOG current section y body real del PR son proyecciones generadas. Los planes/estados históricos quedan marcados `HISTORICAL/SUPERSEDED` y no contienen `nextAction` operativo válido.

### M7 — Auditoría de documentación sin descubrimiento global
No existía un gate que detectara cualquier archivo antiguo que se autodenominara `current`, `vigente`, `estado vivo`, `nextAction` o `activeBlock` fuera del conjunto permitido.

**Solución obligatoria:** discovery gate de documentos state-bearing. Falla si una fuente no canónica presenta estado operativo sin marca histórica/superseded.

### M8 — Pre-runtime source audit demasiado estrecho
El selftest de rootfixes conocidos pasó en run `32494402695`, pero F2 encontró `undefined/NaN` en Cobros. El mecanismo estaba verificando fixes concretos, no una propiedad transversal de render/read-model.

**Solución obligatoria:** gate source-only transversal para todas las rutas F2 y las tres vistas antes de crear autorización/request.

**Criterio de cierre de esta auditoría:** no se afirma que no pueda existir un defecto funcional latente futuro; sí se elimina la clase de sorpresa **metodológica/mecánica**, porque Macro-1 debe descubrir de forma automática writers, documentos state-bearing, bindings históricos y transiciones no cubiertas antes de poder cerrar.

---

## 4. Hallazgos funcionales transversales ya anticipados

No se va a parchear Cobros de forma aislada.

La candidata actual muestra un patrón reusable:

- `core/ui.js::money()` y `moneyShort()` protegen `null`, pero no `NaN/Infinity` mediante `Number.isFinite`;
- `core/queries.js::norm()` propaga valores no finitos hacia agregados;
- `data/store-firestore-product-readonly-p0.js::where()` parte de `all(collection)` y por tanto clona la colección completa;
- `core/client-canonical-view-projection-v20260716.js::hasPolicies()` llama `Orbit.store.where('polizas', predicate)` durante proyección de clientes;
- `applyAll()` proyecta todos los clientes, lo que puede multiplicar scans/clones y es coherente con la latencia extrema observada en Pólizas;
- varias superficies F2 todavía interpolan campos operativos crudos sin un contrato común de representación honesta.

Macro-2 debe resolver **la familia**, no el módulo:

`raw value → canonical read model → finite/text/date normalization → honest fallback → escaped render`.

El nuevo guard debe rechazar al menos: `undefined`, `NaN`, `Infinity`, `-Infinity`, `Invalid Date`, copy técnico y valores numéricos no finitos visibles.

---

## 5. Qué se conserva de planes anteriores y qué NO se repite

### Cerrado / preservar

- arquitectura greenfield, multi-tenant y white-label;
- Auth/membership/tenant productivos ya alcanzados por F2;
- store productivo read-only, write guard y no-fallback;
- M4: 414 clientes / 26 aseguradoras y correcciones GT/GTQ cerradas;
- M5/F1: membership projection/ownership y bootstrap fail-closed;
- store `get()` amplification rootfix ya integrado;
- candidata `9433944723` como baseline histórica inmediata para el nuevo fix transversal;
- cero reimportación de Clientes/Aseguradoras;
- un solo gate por cierre;
- integridad before/after, cross-tenant, cero writes y rollback fail-closed;
- separación de autorizaciones F2 vs deploy;
- orden post-go-live por fuentes separadas.

### No reejecutar

Los Bloques 0–4 históricos del Plan Maestro 20260716 **no se vuelven a correr como bloques completos**. Sus prerrequisitos ya están materializados o superados por evidencia posterior. Reabrirlos sería reproceso y riesgo.

### Lo que sí migra al plan definitivo

- el antiguo Bloque 5 / RC se absorbe en Macro-2 y Macro-3;
- el antiguo Bloque 6 / Go-live se conserva en Macro-4 y Macro-5;
- la revisión visual humana única se hace después de F2 PASS y dentro del cierre de Macro-3, sin pasos técnicos manuales;
- Claude/Academia se actualizan dentro de Macro-2 con el patrón reusable, sin crear una iteración adicional;
- rebranding Gravicentra permanece **no bloqueante** para el go-live inicial y se ejecuta solo en una ventana aislada posterior/segura, salvo decisión explícita distinta;
- después del primer go-live se conserva el orden: Pólizas → Vehículos → Recibos/cartera → Cobros/conciliación → Comisiones/planillas → financiero histórico → documentos → Cotizador/Comparativo → Ops/Leads → Marketing → Portal → resto de Academia.

---

## 6. Plan único definitivo desde ahora

### MACRO-ITERACIÓN 1 — Reparación definitiva del mecanismo y reconciliación

**Objetivo:** hacer imposible que otra conversación/workflow vea un estado operativo diferente o que un retry burle el plan.

Debe ejecutarse source-only, sin browser/secrets/Firestore/runtime/deploy:

1. reconciliar run `32494402695` mediante reducer genérico; sellar `b8b35fd…` como consumido/historical/replay=false;
2. convertir ledger en único current-state mutable y quitar duplicación autoritativa de package/authority/lifecycle;
3. hacer projection 100% derivada del ledger y eventos;
4. ampliar reducer a PASS + todas las clasificaciones de fallo;
5. reemplazar invariant y independent readback por checks dinámicos por fase;
6. retirar Request14/artifacts históricos de cualquier guard activo;
7. retirar escritura de observer y CP11; dejar un único writer físico;
8. ampliar workflow audit a **cualquier** mutación de branch/PR, no solo projection targets;
9. hacer `STOP_RETRY` fail-closed e imposible de override;
10. discovery audit de todos los documentos state-bearing y marcar historical/superseded los antiguos;
11. sincronizar en una sola transición: ledger + package projection + authority projection + lifecycle + boundary + live-state + index + checkpoint + PR-state + README current + CHANGELOG current + PR body;
12. ejecutar composite invariant + independent readback + workflow-writer audit + documentation-discovery audit;
13. evidencia sanitizada `ok:true`.

**Salida obligatoria:** `CONTROL_PLANE_DEFINITIVE_PASS`, runtime cerrado, cero authorization/request activo.

**Avance ruta producción:** `50% → 62%`.

---

### MACRO-ITERACIÓN 2 — Hardening transversal source-only + candidata única

**Objetivo:** cerrar antes del runtime la familia `undefined/NaN` y la señal de performance Pólizas.

Sin secrets/Firestore/runtime/browser productivo:

1. introducir un contrato reusable de display/read-model seguro para texto, número, moneda y fecha;
2. normalizar números con `Number.isFinite`; no convertir ausencia en cero salvo regla de negocio;
3. corregir queries/agregados para no propagar no-finitos;
4. eliminar scans/clones repetitivos de cliente↔póliza mediante índices/read-model canónico, preservando API `Orbit.store`;
5. auditar las 7 rutas F2: `inicio`, `cliente360`, `aseguradoras`, `ops`, `leads`, `polizas`, `cobros`;
6. auditar Dirección desktop, Operativo tablet y Asesor móvil con fixtures source-only;
7. incluir superficies integradas de póliza/vehículo/recibos;
8. guard obligatorio: cero `undefined`, `NaN`, `Infinity`, `Invalid Date`, copy técnico y relaciones inventadas;
9. synthetic performance con volúmenes representativos; prohibir N×full-collection clone/scans equivalentes;
10. ejecutar regresión de Auth/membership/scopes/store/write guard como infraestructura reusable, sin reconstruirla;
11. actualizar patrón reusable Claude y Academia correspondiente;
12. construir **una sola** candidata sucesora incremental;
13. full rehash + manifest + delta audit; cero backend protegido accidental;
14. promoverla mediante el único writer y preparar boundary inerte, sin authorization/request.

**Salida obligatoria:** `TRANSVERSAL_SOURCE_ACCEPTANCE_PASS` + candidata única certificada + fresh authorization identity preparada pero `authorized:false`.

**Avance ruta producción:** `62% → 75%`.

---

### MACRO-ITERACIÓN 3 — F2 final one-shot

**Requiere autorización explícita fresca** ligada exclusivamente a la candidata de Macro-2.

Secuencia:

1. persistir autorización y materializar un único request inmutable en la misma transición canónica;
2. consumir one-shot al aceptar/iniciar el único runtime; no existe pre-gate replay;
3. gate contractual antes de secrets/Firestore/browser;
4. artifact/source/digest exactos;
5. Auth, membership, tenant, rol activo y scopes;
6. Dirección desktop + Operativo tablet + Asesor móvil;
7. 7 rutas F2 + superficies integradas;
8. ausencia de valores inválidos/copy técnico;
9. performance/readiness sin recuperación por timeout como condición normal;
10. cross-tenant denied + write guard;
11. integridad before/after;
12. Firestore/Auth/operational writes = 0;
13. artifact terminal sanitizado;
14. reducer terminal genérico + proyección canónica automática;
15. una única revisión visual de Paula sobre versión ya verde.

**Salida obligatoria:** `F2_TERMINAL_PASS`.

**Avance ruta producción:** `75% → 85%`.

Si falla, **esta macro queda abierta** y el reducer clasifica el resultado; no se crea otro plan, workflow, owner ni request paralelo. Un defecto nuevo vuelve al subciclo source-only definido en Macro-2 bajo este mismo plan. El mismo `stage+code` por segunda vez activa `STOP_RETRY` irreversible hasta reparación demostrada.

---

### MACRO-ITERACIÓN 4 — Go-live autorizado

Solo después de `F2_TERMINAL_PASS` y autorización explícita separada de producción.

1. pre-go-live read-only: rama/PR/commit/artifact exactos, backend protegido, Auth/membership, rules/Storage aplicables, Hosting, secretos requeridos, observabilidad;
2. checkpoint/release exacto;
3. backup/snapshot aplicable;
4. rollback probado/verificable;
5. confirmar que no se cargan nuevas fuentes durante deploy;
6. deploy únicamente de la candidata F2 aceptada;
7. no main/merge salvo autorización expresa separada si técnicamente fuera requerido;
8. evidencia de publicación y URL.

**Salida:** primera publicación productiva A&S.

**Avance ruta producción:** `85% → 95%`.

---

### MACRO-ITERACIÓN 5 — Smoke productivo y cierre

Inmediata después del deploy; no se declara go-live cerrado antes de PASS.

1. autenticación real;
2. membership/tenant/multirol/scopes;
3. Cliente 360 y Aseguradoras;
4. rutas F2 y superficies integradas;
5. Ops/Leads incluidos en el paquete aceptado;
6. responsive 3 vistas;
7. cero copy técnico;
8. integridad y write policy según capacidades efectivamente habilitadas;
9. cleanup de cualquier dato sintético si llegara a usarse;
10. evidencia sanitizada;
11. PASS → cierre; FAIL bloqueante → rollback según plan, sin hotfix improvisado en producción.

**Salida obligatoria:** `PRODUCTION_SMOKE_PASS` y cierre del go-live inicial.

**Avance ruta producción:** `95% → 100%`.

---

## 7. Presupuesto de iteraciones y porcentaje

**Estado actual de la ruta a primera producción:** `50%`.

- 4 macro-iteraciones restantes para **estar publicado**: Macro-1 mecanismo → Macro-2 candidata transversal → Macro-3 F2 PASS → Macro-4 go-live.
- 5 macro-iteraciones restantes para **estar publicado y cerrado**: las anteriores + Macro-5 smoke.

Una macro-iteración no significa un mensaje. Solo cuenta cuando deja evidencia y transición verificables. No se crean Macro-6, Macro-7 ni planes alternos por fallos: el fallo queda dentro del macro bloque correspondiente y se aplica el reducer/STOP_RETRY definidos aquí.

El porcentaje mide únicamente la **ruta crítica a primera producción**, no el programa integral post-go-live. El programa integral continuará después con las fuentes/módulos pendientes.

---

## 8. Gates de no desviación

Ninguna macro puede declararse PASS si falla cualquiera de estas condiciones:

- `branchHead` inequívoco y PR #5 draft/open;
- un solo writer físico de estado/branch;
- cero `git pull --rebase` en writers operativos;
- reducer terminal cubre PASS y todas las clasificaciones;
- retry budget no puede ser sobreescrito por workflow;
- toda autorización/request ejecutada queda consumida sin replay;
- state-bearing discovery sin fuentes actuales paralelas;
- todas las proyecciones coinciden con ledger en la misma revisión;
- actual PR body coincide con el estado canónico;
- gate/authority/lifecycle sin bindings históricos activos;
- candidate/source/artifact diferenciados de `branchHead`;
- source acceptance transversal antes de autorización;
- no reimportación de 414 clientes/26 aseguradoras;
- no escrituras durante F2 read-only;
- no deploy/production antes de F2 PASS + autorización separada.

---

## 9. Carriles

- **Carril A — frontend/UX/Academia:** congelado salvo el hardening transversal de display/read-model y la actualización de Academia/Claude derivada de ese patrón. Sin mejoras laterales antes de go-live.
- **Carril B — backend/seguridad/control plane:** activo para Macro-1 a Macro-5.
- **Carril C — datos reales/migración:** congelado. No reimportar ni mutar Clientes/Aseguradoras ni adelantar Pólizas/Cobros por fuente para resolver F2.

---

## 10. Primera acción exacta al reanudar

`EXECUTE_MACRO1_DEFINITIVE_CONTROL_PLANE_REPAIR_AND_TERMINAL_RECONCILIATION_20260821`

Antes de tocar producto:

1. gate contractual/source-only del mecanismo;
2. inventory global de writers + state-bearing docs;
3. reducer genérico;
4. projection/invariant/readback dinámicos;
5. reconciliación del run `32494402695` y consumo definitivo de `b8b35fd…`;
6. cierre `CONTROL_PLANE_DEFINITIVE_PASS`.

No abrir Macro-2 hasta ese PASS.

---

## 11. Regla de cambio de este plan

Este plan queda **congelado**. Solo puede cambiar si aparece evidencia material nueva que demuestre que una regla aquí es técnicamente incorrecta o insegura. Cualquier cambio exige en el mismo commit:

- motivo;
- evidencia nueva;
- antes/después;
- impacto en iteraciones y porcentaje;
- impacto Claude/Academia;
- nueva versión del plan.

No se puede sustituir por un resumen de conversación ni por un `nextAction` de un documento histórico.
