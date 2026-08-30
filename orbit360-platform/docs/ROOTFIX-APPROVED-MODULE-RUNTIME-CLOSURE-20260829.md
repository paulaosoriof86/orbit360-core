# ROOTFIX · Approved Module Runtime Closure · 2026-08-29

## Estado

**CERRADO SOURCE-ONLY PASS · RUNTIME PROOF PENDIENTE**

Este documento es el cierre durable de la causa transversal que permitió que una capacidad funcional aprobada permaneciera en el repositorio pero no quedara demostrablemente alineada con el owner/entrypoint/package que debía llegar al runtime. No sustituye al ledger operativo. La autoridad viva continúa siendo `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`.

## Bloque y carriles

- Bloque: post-go-live · cierre causal de versión funcional aprobada → composición → package closure → owner lineage.
- Carril A · Frontend/UX/Academia: la capacidad visual aprobada de Aseguradoras se preserva en el owner canónico; la validación visual sigue pendiente de runtime.
- Carril B · Backend/seguridad/gates: causa raíz y mecanismo anti-loop cerrados source-only.
- Carril C · Datos reales/migración: sin reimportación, sin refresh y sin escrituras; datos preservados.

## Síntoma que originó el rootfix

Aseguradoras seguía mostrando una experiencia equivalente a la versión anterior aun después de múltiples correcciones. El patrón observado era transversal: una capacidad podía estar trabajada/aprobada en source y aun así no existir una prueba que obligara a conservar la última autoridad funcional aprobada a través de toda la cadena de composición.

La ruta incompleta era:

`source -> package`

La ruta que queda exigida es:

`approved baseline -> source -> final owner / entrypoint -> accepted overlay -> approved package closure -> owner lineage -> runtime proof`

## Clasificación de causa raíz

La secuencia combinó:

1. `PIPELINE_MECHANISM_FAILURE`: el mecanismo validaba integridad de su selección, pero no demostraba que la selección correspondiera a la autoridad funcional aprobada vigente.
2. `VALIDATOR_STALE`: varios consumidores globales conservaban versiones, estados o firmas textuales históricas y podían rechazar una implementación correcta o volver a exigir una arquitectura ya reemplazada.

No se clasificó como defecto de datos y no autorizó reimportación.

## Corrección de arquitectura: no reinsertar OP2 en paralelo

La investigación confirmó que la arquitectura vigente ya tiene un owner canónico del directorio operativo de Aseguradoras:

`core/client-insurer-operational-directory-owner-v20260722.js`

cargado por:

`core/router-tenant-config-product-bootstrap-p0.js`

Por tanto, reinsertar los módulos OP2 históricos como autoridad paralela habría creado dos owners/renderers sobre la misma superficie y habría reintroducido desincronización.

La recuperación correcta fue promover la capacidad aprobada dentro del owner canónico vigente.

## Aseguradoras · owner aceptado

Owner final:

- path: `core/client-insurer-operational-directory-owner-v20260722.js`
- version: `20260829.1`
- ownerId: `clientInsurerOperationalDirectoryOwner`

Comportamiento aprobado:

- contraseña oculta por defecto;
- acceso temporal solo para roles/permisos autorizados;
- fallback directo sobre credencial operacional existente: `password`, `pass`, `contrasena`, `clave`;
- provider seguro preservado como fallback mediante `Orbit.secureResources.revealCredential`;
- no persistencia nueva desde este owner;
- no reimportación para resolver visualización/acceso;
- cuenta bancaria operativa permanece visible/copIABLE según contrato aprobado.

Aceptación source-only:

- run: `33284848913`
- candidate: `aseguradoras-authorized-reveal-v4-20260829`
- candidate head: `619c58251eb5046097d0177e5312a1def41c1118`
- candidate manifest: `11e8ca82a4ef83f65a03c79a36528fcbf49266ad6057e94c1042e0b75c21faf5`
- patch manifest: `35a1197735ab417171367f3c70be390846ce2c0622dfc791fe3358122ef2b2b8`
- accepted overlay paths:
  - `orbit360-platform/core/client-insurer-operational-directory-owner-v20260722.js`
  - `orbit360-platform/core/router-tenant-config-product-bootstrap-p0.js`

## Contrato transversal de package closure

Se creó `docs/orbit360-approved-runtime-closure-registry-v20260829.json` tomando como baseline certificado:

- artifactId: `9504702901`
- sourceHead: `8c9668d6d423e82826b0295431ec699390d79b4b`
- manifestSha256: `b1c98c1faf644b5d83cfe6e6bb1a602927c438cd85b7855cb0b1a6b98c08053c`
- fileCount: `194`

El closure source/package cubre explícitamente seis capacidades de módulo:

1. `ASEGURADORAS_OPERATIONAL_DIRECTORY`
2. `CLIENTE360_PRIMARY_RUNTIME`
3. `POLIZAS_PRIMARY_RUNTIME`
4. `COBROS_PRIMARY_RUNTIME`
5. `OPS_PRIMARY_RUNTIME`
6. `LEADS_PRIMARY_RUNTIME`

Reglas durables:

- existir en el repositorio no equivale a estar en runtime;
- un overlay aceptado solo puede reemplazar miembros de un package closure certificado;
- un owner nuevo no puede quedar silenciosamente fuera del paquete;
- el bootstrap debe cargar al owner final vigente;
- fallo de composición no autoriza reimportación;
- source PASS no cierra un defecto visible sin runtime proof.

## Gates y evidencia de cierre

### 1. Rootfix del mecanismo

Run `33286857084`: **PASS**.

Cerró el `VALIDATOR_STALE` y el `PIPELINE_MECHANISM_FAILURE` del gate de composición mediante un rootfix reusable que:

- deriva del ledger el fallo causal vigente y la aceptación vigente;
- no depende de run IDs históricos;
- valida el claim state registrado;
- conserva product/data freeze durante el claim;
- ejecuta selftest de acceptance binding y composición antes de liberar el estado.

### 2. Approved package closure

Run `33286888487`: **PASS**.

Terminal:

- `POST_GO_LIVE_RUNTIME_CAPABILITY_COMPOSITION_VALIDATION_PASS`
- `approvedPackageClosureOk: true`
- `packageClosureCapabilityCount: 6`
- `baselineArtifactId: 9504702901`
- `aseguradorasFinalOwnerAligned: true`
- `aseguradorasOwnerVersion: 20260829.1`
- `certifiedBaselinePreserved: true`
- `runtimeProofSatisfied: false`

Los defectos visibles se mantuvieron abiertos correctamente:

- `INSURER_PORTAL_REVEAL_OPEN`
- `CLIENT360_LIST_EMPTY_WITH_DATA_OPEN`
- `LOGIN_LATENCY_OPEN`

### 3. Owner lineage vigente

Run `33287054078`: **PASS**.

Terminal:

- `POST_GO_LIVE_RUNTIME_CAPABILITY_OWNER_LINEAGE_REVIEW_PASS`
- `packageClosureCapabilityCount: 6`
- composition validator vigente PASS;
- Aseguradoras owner `20260829.1`;
- legacy consumer no es autoridad final;
- fallback directo autorizado + provider fallback preservados;
- Cliente 360 usa la semántica vigente de `Orbit.store` mediante wrapper y empty-state actual;
- Auth sigue siendo owner del ingreso interactivo;
- `access-role-session-owner` permanece separado del login;
- esperas acotadas de Auth validadas;
- los tres defectos visibles permanecen abiertos hasta runtime proof.

## Validadores obsoletos eliminados de esta cadena

Durante el cierre se localizaron y corrigieron consumidores que podían volver a crear falsos fallos o regresiones de versión:

- invariant global que esperaba Aseguradoras `20260723.2` / provider-only;
- visible priority lock provider-only;
- freeze por hash incorrecto del registro transaccional de overlays;
- handler de composición esperando un status histórico;
- Cliente 360 validado por literales históricos en vez de semántica vigente;
- router/hydration validados por nombres de funciones ya retirados;
- login validado por esperas históricas del router en vez del owner Auth actual;
- rootfix atado a runs históricos y a pre-claim state;
- owner-lineage atado a Aseguradoras `20260723.2`, blob histórico de Cliente 360 y status viejo de composición.

## Regla anti-pérdida entre iteraciones

A partir de este cierre, una nueva iteración no debe reabrir Aseguradoras, Cliente 360, Pólizas, Cobros, Ops o Leads por el solo hecho de que una vista no coincida con lo esperado. Primero debe comprobar la cadena canónica:

1. ledger / aceptación vigente;
2. owner final vigente;
3. entrypoint/bootstrap;
4. accepted overlay;
5. approved package closure;
6. owner lineage;
7. runtime proof actual.

Si source/closure/lineage siguen PASS y la vista falla, el diagnóstico continúa en runtime/served asset/cache/hydration/access según el blocker; no se reimportan datos ni se reconstruye un módulo aprobado como workaround.

## Distinción obligatoria para futuras auditorías

### FUNCTIONAL_DEFECT

Solo cuando la implementación vigente y efectivamente servida incumple su contrato funcional.

### VALIDATOR_STALE

Cuando el producto vigente cumple el contrato actual pero el gate exige una versión, literal, firma, estado o supuesto histórico. En este caso se congela producto/datos y se corrige primero el validador/registro/workflow.

### PIPELINE_MECHANISM_FAILURE

Cuando el flujo de aceptación/composición/publicación permite omisión, doble autoridad, pérdida de binding o diagnóstico insuficiente. Se corrige el mecanismo antes de reintentar producto.

## Seguridad y datos

En todo este rootfix:

- Firestore writes: `0`
- Auth writes: `0`
- operational writes: `0`
- data writes: `0`
- runtime ejecutado: `false`
- browser ejecutado: `false`
- acceso a secretos: `false`
- deploy: `false`
- producción tocada: `false`
- reimportación: `false`

No se registran secretos ni valores de contraseña en esta documentación o evidencia.

## Estado operativo posterior al cierre

El ledger alcanzó revisión `151` después del owner-lineage PASS y conserva:

- producción previamente aceptada;
- `rootCauseStatus: PASS`;
- `productFrozen: false`;
- `dataFrozen: false`;
- runtime no autorizado;
- deploy no autorizado;
- producción no autorizada;
- siguiente acción: `DIAGNOSE_POST_GO_LIVE_FUNCTIONAL_BLOCKERS`.

La solución source/composición/lineage está cerrada. **Esto todavía no significa que `app.aysseguros.com` haya recibido el overlay**: no se ejecutó deploy en este bloque.

## Siguiente acción exacta

Continuar exclusivamente con los tres blockers visibles y su prueba runtime/live:

1. Aseguradoras: demostrar `authorized record or secure reference -> role policy -> temporary reveal` en el host servido.
2. Cliente 360: demostrar `served asset -> store snapshot -> visible projection -> rows -> render` y que lista/KPIs comparten universo.
3. Login: medir `submit -> Auth -> membership -> store -> router -> usable shell` para aislar la latencia real.
4. Solo con los tres PASS: revisión visual de usuaria y aceptación explícita.
5. Cualquier deploy a producción requiere autorización explícita separada.

No avanzar a reimportación ni usar Pólizas/Cobros/Ops/Leads como vía de escape mientras el visible trio permanezca abierto.

## Impacto Academia

Orbit Academia debe enseñar este patrón como control transversal:

- diferencia entre defecto funcional y validador obsoleto;
- repository existence vs runtime reachability;
- approved baseline + accepted overlay + package closure;
- source/closure PASS no equivale a runtime PASS;
- gates fail-closed y stop-retry;
- no reimportar para corregir composición, acceso o visualización.

## Clasificación Claude

- control plane, gates, acceptance, overlay registry y validators: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- patrón conceptual reusable de UX/arquitectura sin datos, secretos ni backend protegido: `REPLICABLE_CLAUDE_ACUMULADO`.
- Academia: `ACADEMIA_ACTUALIZAR`.

## Fuente/base

Prevalecen, en orden, reglas maestras/addenda vigentes, ledger + HEAD de PR #5, Plan Maestro y esta evidencia de cierre. Este documento no reemplaza el estado vivo del ledger; evita que se pierda la causa raíz, la arquitectura aprobada y el criterio de continuación.
