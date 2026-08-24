# AUDITORÍA FORENSE DEL CONTROL-PLANE Y RUTA A PRODUCCIÓN — ORBIT 360 A&S

**Fecha:** 2026-08-24  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR rector:** #5 draft/open  
**Candidate preservada:** artifact `9504702901` / source `8c9668d6d423e82826b0295431ec699390d79b4b`  
**Run analizado:** `32686810800`  
**Producción/main/merge/deploy:** no autorizados ni ejecutados.

## 1. Conclusión ejecutiva

El Plan Maestro congelado del 2026-08-21 conserva una **secuencia estratégica correcta**:

`Macro-1 control-plane → Macro-2 hardening source-only/candidata → Macro-3 F2 one-shot → Macro-4 go-live → Macro-5 smoke productivo`.

No se crea un plan paralelo y no se reabre Macro-2/producto sin regresión demostrada.

La causa principal de la demora es que **Macro-1 fue declarada CLOSED_PASS sin que sus garantías estuvieran realmente enforced de forma independiente y semántica**. La implementación permitió que validadores y proyecciones comprobaran consistencia interna, marcadores textuales o la misma fuente derivada, pero no siempre la verdad de la evidencia runtime.

Por nueva evidencia material, se reabre **solo Macro-1** bajo el mismo Plan Maestro.

## 2. Estado real del producto

La candidata `9504702901` sigue certificada source-only con 194 archivos y Macro-2 `TRANSVERSAL_SOURCE_ACCEPTANCE_PASS`. Desde su `candidateSourceHead` hasta el HEAD observado antes de esta auditoría, los cambios posteriores corresponden a control-plane, documentación, evidencias, requests/authorization y tools; no se identificó un nuevo delta de producto en `orbit360-platform/core/`, `modules/` o `data/`.

Por tanto:

- producto/candidata permanecen congelados;
- no se reimportan Clientes/Aseguradoras;
- no se reconstruye artifact por una falla de control-plane;
- no se atribuye al producto un fallo de validator/mecanismo.

La candidata **todavía no puede declararse F2 terminal PASS** porque el run fresco no alcanzó browser.

## 3. Hallazgos de causa raíz

### F1 — Falso PASS terminal

**Clasificación:** `DATA_CONTRACT_FAILURE / PIPELINE_MECHANISM_FAILURE`.

La evidencia terminal `f2-runtime-terminal-inline-32686810800.json` contiene simultáneamente:

- `ok:false`;
- `status:F2_PRODUCTIVE_ACCEPTANCE_FAIL`;
- `classification:PASS`;
- `browserMatrixPass:false`;
- `zeroCrossTenant:false`.

El normalizador permitía conservar `classification:PASS` cuando `ok!==true`. El reducer derivaba la transición terminal usando `classification`, de modo que promovió el ledger a `F2_TERMINAL_PASS`, 85% y `AWAIT_EXPLICIT_GO_LIVE_AUTHORIZATION` pese a que el runtime real no fue ejecutado.

**Control definitivo:** PASS exige `ok:true` + status PASS + clasificación PASS + browser PASS + integridad PASS del mismo run + cross-tenant PASS + cero writes + cero deploy/producción.

### F2 — Gate order ligado a nombres de steps

**Clasificación corregida:** `VALIDATOR_STALE`.

El gate emitió `SECURITY_FAILURE:F2_GATE_ORDER_INVALID`, pero no existió exposición ni permiso excesivo. La condición buscaba literalmente nombres históricos de steps (`Mandatory canonical F2 gate...`, `Bind provider after F2 GO`). El workflow F2 agrupó esas operaciones con nombres diferentes.

**Causa real:** el validator comprobaba forma/texto en vez de orden de capacidades.

**Control definitivo:** contratos por IDs/outputs/dependencias machine-readable; nunca por copy del nombre visible del step.

### F3 — Evidencia no run-scoped

**Clasificación:** `DATA_CONTRACT_FAILURE`.

El terminal builder consultó `f2-integrity-before-after-v20260818.json`, path fijo no ligado a `GITHUB_RUN_ID`. Por eso pudo registrar `integrityBeforeAfterPass:true` aunque el step runtime/browser del run `32686810800` estuviera `skipped`.

**Control definitivo:** toda evidencia runtime debe llevar `runId` y path run-scoped. Un terminal PASS debe exigir `browserRunId===terminalRunId` e `integrityRunId===terminalRunId`.

### F4 — Composite e independent readback no eran independientes

**Clasificación:** `PIPELINE_MECHANISM_FAILURE`.

`orbit360-control-plane-composite-invariant-v20260820.mjs` y `orbit360-control-plane-independent-readback-v20260820.mjs` ejecutaban ambos el mismo `control-plane-evidence-convergence`. Tres nombres de control no equivalían a tres fuentes de verificación.

**Control definitivo:**

- convergence valida proyecciones/estado;
- terminal-truth invariant valida evidencia→estado;
- independent readback reimplementa checks críticos directamente sin delegar en convergence.

### F5 — Convergencia comprobaba coherencia, no verdad causal

**Clasificación:** `DATA_CONTRACT_FAILURE`.

Si el ledger decía 85%, projection hacía que package, boundary, live-state, README, CHANGELOG y PR-state coincidieran. Convergence validaba esa coincidencia y por eso podía devolver PASS aunque el evento terminal contradijera el ledger.

**Control definitivo:** ningún estado terminal se acepta solo por fingerprint/coherencia. La evidencia append-only del run debe respaldar la transición.

### F6 — Workflow “canónico” mutable por fase

**Clasificación:** `PIPELINE_MECHANISM_FAILURE`.

El registry declara un único workflow canónico, pero el archivo se ha reescrito para promoción source-only, F2 runtime y transportes técnicos. El workflow actual de la rama sigue hardcodeado a la promoción de artifact `9504702901`, aunque conserva el marcador `MACRO3_INLINE_F2_V1`.

Esto permite que un comentario/marker satisfaga validators que no verifican la topología real.

**Control definitivo:** congelar un workflow genérico estable y versionado. Las fases futuras deben aportar únicamente intents/eventos de datos bajo un schema; nunca reemplazar el workflow para cada candidata o autorización.

### F7 — Facade/core con parcheo dinámico de fuentes históricas

**Clasificación:** `PIPELINE_MECHANISM_FAILURE / VALIDATOR_STALE`.

Owner, gate engine, convergence y selftests conservan cores con conteos/bindings históricos y facades que los parchean en runtime mediante reemplazos `applyOnce` y archivos temporales.

Esto crea dos representaciones del contrato: core físico y comportamiento parcheado.

**Control definitivo:** eliminar gradualmente source-patching facades. El core canónico debe contener directamente la lógica vigente; los facades solo pueden delegar sin reescribir código fuente.

### F8 — Discovery documental dependía de convergence

**Clasificación:** `PIPELINE_MECHANISM_FAILURE`.

El discovery detecta documentos state-bearing, pero su “convergencia semántica” delegaba al mismo convergence que no validaba la evidencia terminal. Por eso una fotografía falsa podía propagarse consistentemente por todos los documentos.

**Control definitivo:** discovery debe depender del composite que incluya terminal truth.

### F9 — Ledger internamente contradictorio

**Clasificación:** `DOCUMENTATION_STATE_DRIFT / DATA_CONTRACT_FAILURE`.

Antes del freeze forense, el ledger registraba simultáneamente:

- `F2_TERMINAL_PASS`, 85%, go-live como next action;
- history del mismo run con `F2_STAGE_OUTCOME:preruntime=failure;runtime=skipped`;
- carril B todavía `AWAITING_FRESH_F2_RUNTIME_AUTHORIZATION`;
- terminal pointer superior ligado a un run histórico anterior.

**Control definitivo:** state transition contract debe validar también lanes, pointers y latest sealed evidence como un agregado indivisible.

## 4. Evaluación del Plan Maestro 2026-08-21

### Se conserva

- un solo plan y una sola ruta crítica;
- Macro-1 antes de reabrir riesgo;
- Macro-2 source-only transversal y candidata única;
- F2 one-shot con autorización fresca;
- separación F2 vs go-live;
- `STOP_RETRY`;
- cero reimportación por problemas de visualización/gates;
- go-live solo después de F2 terminal real;
- smoke productivo posterior.

### Se corrige dentro de Macro-1

Macro-1 no puede cerrarse nuevamente con checks que compartan la misma implementación o que acepten markers textuales. Su nuevo criterio de salida obligatorio es:

1. `terminal-truth invariant PASS` independiente;
2. `independent readback PASS` sin delegar en convergence;
3. workflow canónico estable, genérico y no artifact-specific;
4. cero source-patching de bindings operativos activos;
5. gate order por IDs/dependencias/capabilities, no step names;
6. evidence paths run-scoped y runId obligatorio;
7. simulated false-pass test debe fallar cerrado;
8. simulated stale-integrity test debe fallar cerrado;
9. simulated renamed-step/same-capability test debe PASS;
10. ledger/projections/PR body convergen únicamente después de validar evidencia causal;
11. un solo writer físico y CAS preservados;
12. evidencia sanitizada `ok:true` para el paquete completo.

Solo entonces se vuelve al inicio de Macro-3 con una autorización fresca. No se repite Macro-2 si la candidata y sus digests no cambian.

## 5. Estado forense después del freeze

- Macro-2: `CLOSED_PASS`, candidata preservada.
- Macro-3: **no cerrada**; run `32686810800` consumido/no replay.
- F2 terminal PASS: **invalidado**.
- Ruta producción: vuelve a **75%**, no por regresión de producto sino por invalidación de evidencia/control-plane.
- Go-live: bloqueado.
- Producto/datos: congelados.
- Nueva autorización: bloqueada hasta cierre source-only de Macro-1.
- PR técnico #86: cerrado sin merge.

## 6. Siguiente acción exacta

`REPAIR_CONTROL_PLANE_TRUTH_AND_VALIDATOR_CONTRACTS_SOURCE_ONLY`

Orden:

1. publicar freeze y truth guards;
2. reemplazar gate-order textual por contrato semántico;
3. convertir evidencia browser/integridad a run-scoped;
4. retirar source-patching de los bindings activos y consolidar cores;
5. convertir workflow canónico en router genérico estable de intents;
6. ejecutar batería sintética de control-plane, incluida falsificación de PASS, evidencia stale, rename de steps, CAS, STOP_RETRY y doble run;
7. regenerar proyecciones desde ledger;
8. independent readback + composite + docs discovery;
9. solo con todo PASS preparar una nueva identidad F2 sobre el **mismo artifact 9504702901** si sus digests siguen intactos.

No se solicita autorización ni se toca runtime en este bloque.
