# REGLA CONGELADA — RECUPERACIÓN DE ÚLTIMA VERSIÓN APROBADA Y VALIDACIÓN VISUAL POR MÓDULO

Fecha: 2026-08-27  
Proyecto: Orbit 360 / A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## 0. Corrección causal de continuidad

Esta revisión corrige una desincronización detectada en la propia regla anterior: se había vuelto a señalar `Orbit.clientProjection` como siguiente causa/owner de Cliente 360 aun cuando la auditoría forense inmediatamente anterior había retirado esa explicación para el artefacto productivo certificado.

Clasificación: `PIPELINE_MECHANISM_FAILURE` con contenido `VALIDATOR_STALE`.

Regla vinculante desde esta revisión:

> **Ninguna hipótesis, fix o owner puede reabrirse por pérdida de contexto conversacional si una auditoría posterior ya lo retiró. Antes de decidir sobre un módulo se reconstruye su último linaje aprobado y se compara contra la candidata certificada.**

## 1. Dos identidades diferentes que no se pueden volver a confundir

La candidata certificada y desplegada continúa siendo:

- artifactId `9504702901`;
- sourceHead `8c9668d6d423e82826b0295431ec699390d79b4b`;
- manifest SHA-256 `b1c98c1faf644b5d83cfe6e6bb1a602927c438cd85b7855cb0b1a6b98c08053c`;
- ZIP SHA-256 `4a3660a18229a923412aa5a1bffc0817b1d5666c83ba96c81c92cea0fce9491c`;
- 194 archivos certificados; 53 scripts bajo `modules/`.

El guard global ya demostró que no existen cambios de producto no aprobados **desde esa candidata**. Eso prueba `candidate → HEAD`.

Pero no prueba por sí solo que, para cada módulo, la candidata `8c9668d6…` contenga la **última versión humana/funcional aprobada** desarrollada antes de su certificación. Esa segunda identidad es `last-approved-module → candidate` y debe quedar demostrada una sola vez por módulo.

Por tanto, desde ahora `PASS_PRESERVED_SOURCE` solo puede interpretarse de dos maneras distintas:

1. `CANDIDATE_PRESERVED`: HEAD conserva exactamente la candidata certificada;
2. `LAST_APPROVED_LINEAGE_PRESERVED`: la candidata contiene además el último source/owner/contrato aprobado del módulo.

Nunca se vuelve a usar la primera como sustituto de la segunda.

## 2. Ruta definitiva más rápida y segura

Para cada módulo ya trabajado no se repite investigación funcional. Se ejecuta un **Historical Lineage Check** acotado:

1. recuperar el último cierre humano/funcional/forense del módulo;
2. identificar el commit/branch/source/owner/bridge/contrato exacto que dejó esa versión aprobada;
3. identificar los archivos y, cuando exista, la versión de owner que materializan ese cierre;
4. comparar esos blobs/owners contra la candidata `8c9668d6…`;
5. clasificar:
   - exactos → `LAST_APPROVED_LINEAGE_PRESERVED`;
   - fix aprobado ausente de la candidata → `PIPELINE_MECHANISM_FAILURE / PROMOTION_OMISSION`;
   - source exacto pero resultado visual distinto → diagnóstico diferencial solo de runtime/wiring/access/readiness/cache;
   - validador histórico que no comprobaba la conducta real → `VALIDATOR_STALE`;
6. si falta un fix aprobado, empalmar **solo** el diff aprobado; nunca rediseñar;
7. hacer una verificación acotada;
8. volver inmediatamente a visualización humana;
9. cuando la visualización coincida, marcar `PASS_PRESERVED_VISUAL` y congelar hashes/owner de ese módulo en el registry central;
10. avanzar al siguiente módulo.

No se hace una auditoría histórica exhaustiva de todos los módulos antes de mostrar nada. Se trabaja secuencialmente y cada módulo recuperado se visualiza inmediatamente.

## 3. Regla anti-reproceso

> **Módulo ya trabajado/aprobado = no rediseñar, no reimportar, no reconstruir y no reinvestigar su negocio. Solo recuperar su último linaje aprobado, probar si llegó a la candidata y corregir la primera divergencia demostrada.**

Una anomalía visual no autoriza a:

- reimportar datos;
- volver a definir reglas de negocio;
- sustituir un owner cerrado;
- repetir un gate consumido;
- resucitar una hipótesis retirada;
- aumentar timeouts para esconder latencia;
- construir un segundo mecanismo transversal.

## 4. Protección mecánica vigente

Se conservan:

- registry: `orbit360-platform/docs/orbit360-certified-product-preservation-registry-v20260827.json`;
- guard global: `tools/orbit360-certified-product-preservation-v20260827.mjs`;
- guard Aseguradoras: `tools/orbit360-aseguradoras-operational-owner-preservation-v20260827.mjs`;
- workflow canónico único: `.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml`;
- invariant: `tools/orbit360-single-state-invariant-v20260827.mjs`.

El guard global conserva `candidate → HEAD`. El registry central debe incorporar progresivamente `last-approved-module → candidate` mediante evidencia de linaje. No se crea un ledger nuevo.

## 5. Aseguradoras — estado preservado y alcance real

Aseguradoras ya tiene evidencia de linaje específica suficiente para no reabrir su construcción:

- owner canónico: `clientInsurerOperationalDirectoryOwner`;
- versión final: `20260723.2`;
- guard específico: 16/16 invariantes PASS;
- owner final, supersesión del bridge legacy, usuario operativo visible, contraseña protegida/reveal temporal, cuenta bancaria visible/copia directa, no writes y no reimport quedan protegidos source-only.

Por tanto:

**Aseguradoras = `LAST_APPROVED_LINEAGE_PRESERVED_SOURCE`.**

La visualización actual sí muestra Aseguradoras. El delta todavía visible es puntual: el rol autorizado no obtiene la contraseña de las plataformas mediante el mecanismo protegido, y existe latencia perceptible.

No se vuelve a investigar si Aseguradoras fue construida ni se reimporta. Para contraseñas se preservan además los hallazgos históricos:

- `TARGET_MAPPING_EMPTY_BEFORE_PROVIDER`;
- `REQUEST_DID_NOT_REACH_PROVIDER`;
- clasificación histórica `DATA_CONTRACT_FAILURE / PROVIDER_NOT_INVOKED`.

Esos hallazgos prueban falla pre-proveedor y no prueban ausencia/rechazo del proveedor. La comprobación actual debe determinar únicamente si el síntoma reproduce ese punto ya conocido o si el fix aprobado quedó omitido/mal enlazado en la promoción productiva.

La latencia de Aseguradoras y la latencia del login se miden como problema transversal separado y no reabren el diseño del módulo.

## 6. Cliente 360 — continuidad correcta

Queda expresamente RETIRADA de esta regla la instrucción anterior de “localizar/corregir `Orbit.clientProjection`” como causa demostrada de la candidata productiva.

La auditoría inmediatamente anterior estableció que, en `8c9668d6…`, esa explicación no estaba demostrada y debía retirarse. También estableció una divergencia real entre:

- el render/lista bajo el camino `Orbit.access.withScope('cliente360', ...)` / store scoped;
- y los KPI posteriores calculados desde `baseStore().all('clientes')` + `A.filter(..., 'cliente360')`.

Si la lista queda `0 de 0` mientras los KPI representan cientos de clientes, no se puede justificar como dos scopes legítimamente distintos sin evidencia adicional; la frontera acotada es `Access ↔ Orbit.store ↔ readiness/orden de ejecución`.

Además, el gate F2 histórico aceptó `storeCount=430` y `rowCount=1`; una fila placeholder “Sin resultados” podía satisfacer `tbodyRowCount>0`. Esa comprobación visual es `VALIDATOR_STALE` y no certifica cartera visible.

Antes de formular cualquier fix nuevo, se termina únicamente la recuperación histórica que ya estaba abierta:

`v17 advisor/cache/route-readiness → v18 transactional hydration → v19 Cliente360 bounded render → v21 event-driven render observability → v22 block1 scope-universe`

Objetivo: identificar cuál fue el **último cierre aprobado que realmente afectó la versión de Cliente 360**, qué blobs/owners lo materializaron y si esos blobs están incluidos en `8c9668d6…`.

Hasta cerrar esa identidad:

- producto congelado;
- datos congelados;
- cero reimportación;
- cero hipótesis nuevas de causa;
- cero `clientProjection` como conclusión a priori.

## 7. Resto de módulos

La misma regla aplica a todos los módulos trabajados: Pólizas, Vehículos, Recibos/cartera, Cobros, Ops/OX, Leads, Inicio, Renovaciones, Cancelaciones, Siniestros, Comisiones, Conciliaciones, Cotizador, Comparativo, Importador, Calidad, Portal, etc.

Para cada uno se recupera **solo** el último cierre aprobado y sus archivos/owners, no toda la investigación de negocio. El orden inicial de recuperación/visualización queda:

`Aseguradoras → Cliente 360 → Pólizas → Vehículos → Recibos/cartera → Cobros → Ops → Leads → resto de superficies`.

Pólizas conserva además la retirada de la hipótesis antigua de un segundo `getRoutePermission()` cuando el source productivo no la contiene. Recibos/cartera conserva el censo reconciliado; no se regenera. Cobros conserva su semántica reportado ≠ validado ≠ pagado ≠ conciliado; no se reinventa. Ops y Leads se validan contra su pipeline ya trabajado.

## 8. Criterio de visualización y cierre

Un módulo tiene tres estados distintos:

- `LINEAGE_AUDIT_REQUIRED`: todavía no demostramos que la candidata contiene su último cierre aprobado;
- `LAST_APPROVED_LINEAGE_PRESERVED_SOURCE`: esa identidad ya está demostrada source-only;
- `PASS_PRESERVED_VISUAL`: además fue visualizado y coincide con lo aprobado.

No se llama “recuperado” a un módulo solo porque el guard global dé PASS.

Si `LAST_APPROVED_LINEAGE_PRESERVED_SOURCE` pero la pantalla difiere, se busca únicamente la primera divergencia runtime/wiring/access/readiness/cache. Si la candidata no contiene el último fix aprobado, se corrige la promoción con el diff aprobado, no el producto funcional.

## 9. Rendimiento y login

El login humano ya no se reabre como recuperación de credenciales. La demora observada permanece abierta como rendimiento/sesión.

Se mide por fronteras, sin inflar timeouts:

`Auth → membership/sesión → store/hydration → router/shell → módulo`.

Esta medición puede realizarse en paralelo con la recuperación histórica source-only, pero browser/runtime solo después del gate-contract/preflight requerido.

## 10. Anti-desencarrilamiento entre conversaciones

Ante una conversación nueva, el orden de autoridad es:

1. reglas maestras/addenda;
2. ledger único + HEAD real;
3. registry de preservación con linaje por módulo;
4. último cierre forense/funcional del módulo;
5. source/owner/blob exactos de ese cierre;
6. candidata certificada;
7. evidencia humana más reciente.

Una conversación nueva nunca autoriza a sustituir esta secuencia por una hipótesis nueva.

Si documentación posterior contradice una conclusión cerrada sin evidencia nueva, se clasifica `PIPELINE_MECHANISM_FAILURE / VALIDATOR_STALE`, se corrige la documentación y el producto permanece congelado.

## 11. Estado operativo

Esta regla no crea estado operativo paralelo. El único estado mutable continúa en `orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json`.

No autoriza secrets, Firestore, writes, browser, runtime, deploy, producción, `main` ni merge. La recuperación histórica y comparación de source es read-only; cualquier empalme futuro debe ser selectivo y basado en una versión aprobada demostrada.