# Orbit 360 A&S — Cierre M5 5.0.19 — Validator redesign static PASS

Fecha: 2026-07-29  
Gate: `block5-release-candidate-visualization-v20260728`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
RC preservada: `ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61`

## Bloque

M5 5.0.19 — rediseño estático del validador después del stop-line 5.0.17.

## Causa raíz heredada

5.0.17 fue detenido después de dos fallos de la misma etapa. El segundo intento terminó 17/19 por dos falsos positivos del propio validador:

- `ENV_TRIGGER_PROVEN`: dependía de una representación textual concreta de `document.write` y de un tipo de comillas específico.
- `NO_MANUAL_POLICY_INSTALL`: una búsqueda por substring confundía `._writePolicy==='function'` con una asignación real.

Clasificación: `PIPELINE_MECHANISM_FAILURE` / `VALIDATOR_STALE`. No se demostró defecto funcional del producto.

## Implementación 5.0.19

Se creó un nuevo bloque independiente; no se reintentó 5.0.17.

Componentes:

- `tools/orbit360-validator-source-predicate-helpers-v20260729.mjs`
- `tools/orbit360-validator-lifecycle-contract-m5-validator-redesign-519-v20260729.json`
- `tools/orbit360-gate-contract-overlay-m5-validator-redesign-519-v20260729.json`
- `tools/orbit360-gate-contract-registry-extension-m5-validator-redesign-519-v20260729.json`
- `tools/orbit360-m5-validator-redesign-519-freeze-v20260729.json`
- `tools/orbit360-validar-gate-contracts-engine-m5-validator-redesign-519-v20260729.mjs`
- `.github/workflows/orbit360-m5-validator-redesign-519-v20260729.yml`

El router canónico `tools/orbit360-validar-gate-contracts-v20260717.mjs` fue actualizado para usar contrato/lifecycle/engine 5.0.19 y fase `M5_VALIDATOR_REDESIGN_STATIC` con capacidades cero.

## Diseño de predicados

El helper reusable `20260729.1` elimina las dos causas de falso positivo:

1. Detecta semánticamente el wrapper `write(src)` que llama `document.write(...)` y las tres cargas Firebase, sin depender de comillas simples o dobles.
2. Distingue una asignación real a `_writePolicy` de una comparación estricta `===` mediante un predicado que acepta `=` solo cuando no está seguido por otro `=`.
3. Detecta por separado una llamada manual a `academiaStaticContentWritePolicy.install()`.

Se agregaron fixtures de regresión para:

- loader con comillas simples;
- loader con comillas dobles;
- comparación estricta que no debe marcarse como asignación;
- asignación directa que sí debe detectarse;
- asignación por bracket que sí debe detectarse;
- llamada manual a `install()` que sí debe detectarse.

## Evidencia

Commit de verificación: `f67aedce6ee3c23ff9b9436cbe6ba6d1764f34ed`  
Run: `30471418491`  
Job: `90642326816`  
Artifact: `8731783955`  
Digest: `sha256:364a9b4adde3cd76b137569bbee6ab0b4de1c8753be740c48008bb6349f2581e`

Resultado:

```text
status: M5_VALIDATOR_REDESIGN_519_STATIC_PASS
checks: 30/30
failed: 0
failedCheckIds: []
semanticLoaderDetection: true
strictEqualityProtected: true
manualPolicyMutationDetectedInCandidate: false
productProtectedUnchanged: true
candidateRuntimeContractVersion: 5.0.18
candidateExecuted: false
```

## Seguridad y alcance

La ejecución 5.0.19 fue exclusivamente estática:

```text
secrets: false
Firestore read: false
Firestore writes: 0
operational writes: 0
runtime: false
browser: false
deploy: false
Hosting deploy: false
Functions: false
Rules: false
production: false
main/merge: false
visual review: false
Pólizas: false
```

Los archivos protegidos de producto permanecieron sin cambios respecto del runtime 5.0.16:

- `orbit360-platform/index.html`
- `orbit360-platform/core/backend-lab-loader.js`
- `orbit360-platform/core/academia-static-content-write-policy-v20260729.js`
- `orbit360-platform/data/store-firestore-lab.local.js`
- `orbit360-platform/core/access-role-session-owner-v20260728.js`

La RC sigue con paridad remota 25/25 y mismatch 0.

## Carriles

### Carril A — frontend / UX / Academia

Sin cambios funcionales ni visuales. La revisión visual continúa bloqueada hasta un runtime completo `ok:true`.

### Carril B — backend / seguridad / Auth / Orbit.store

No se modificó backend protegido, Auth, store Firestore LAB, Rules, Functions ni datos. El avance fue exclusivamente de control de gates y validadores.

### Carril C — datos reales / migración A&S

Sin escrituras ni reimportaciones. Baseline preservado: 414 clientes, 26 aseguradoras, 7 asesores, 398 GT / 16 CO, 391 Persona / 23 Empresa, missing currency 0, target-only 0.

## Claude

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Patrones reutilizables:

- validar semántica y no una representación textual exacta cuando hay sintaxis equivalente;
- no usar búsquedas por substring para distinguir operadores (`=` vs `===`);
- cubrir los predicados de seguridad con fixtures positivos y negativos;
- hacer que el engine escriba explícitamente la evidencia canónica consumida por el router;
- congelar el workflow al cerrar un bloque one-shot;
- no cambiar producto para satisfacer un validador defectuoso;
- aplicar la regla de dos fallos y abrir un bloque nuevo en vez de seguir parcheando la misma etapa.

No enviar a Claude backend protegido, Firebase, rutas Firestore, datos reales, secretos, artifacts ni identidad LAB.

## Academia

Clasificación: `ACADEMIA_ACTUALIZAR`.

Contenido a incorporar en la siguiente actualización funcional de Academia, sin alterar esta RC:

- diferencia entre `FUNCTIONAL_DEFECT`, `VALIDATOR_STALE`, `PIPELINE_MECHANISM_FAILURE` y `ENVIRONMENT_FAILURE`;
- por qué un validador debe comprobar intención semántica y no forma textual accidental;
- ejemplo de falso positivo `=` vs `===`;
- fixtures positivos/negativos para validar gates;
- evidencia canónica y trazabilidad del lifecycle;
- regla de dos fallos y congelamiento del producto;
- autorización one-shot independiente de la conclusión funcional del run.

## Estado

M5 5.0.19: **CERRADO / PASS**.

Autorizaciones al cierre:

```text
hostingDeployAuthorized: false
allowedHostingDeployExecutions: 0
runtimeSmokeAuthorized: false
allowedRuntimeSmokeExecutions: 0
staticRemediationAuthorized: false
allowedStaticRemediationExecutions: 0
visualReviewAuthorized: false
productionAuthorized: false
policiesAuthorized: false
```

## Pendiente y siguiente acción exacta

La candidata runtime 5.0.18 continúa preparada pero **no ejecutada y no autorizada**.

Siguiente acción: solicitar autorización explícita e independiente para **una sola ejecución runtime LAB** sobre la RC exacta `ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61`, usando la candidata 5.0.18, owner normalizado, snapshots read-only antes/después y cero escrituras.

Debe permanecer prohibido durante ese runtime: Hosting adicional, Functions, Rules, producción, main, merge, cambios de políticas y Pólizas.

Solo si la evidencia sanitizada termina `ok:true` se habilita la revisión visual única antes de cerrar M5.
