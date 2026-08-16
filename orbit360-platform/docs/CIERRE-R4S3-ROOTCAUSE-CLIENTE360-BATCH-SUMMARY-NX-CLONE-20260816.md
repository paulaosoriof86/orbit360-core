# CIERRE · R4S3 · causa raíz `R4_ROLE_ROUTE_STAGE_TIMEOUT` · 2026-08-16

## Estado

Diagnóstico exclusivamente source-only/static autorizado sobre la matriz final R4S3 run `31961220051`.

Resultado: **causa raíz aislada y owner único cerrado**.

- clasificación: `FUNCTIONAL_DEFECT`
- failure family raíz: `CLIENTE360_BATCH_SUMMARY_CONTRACT_MISSING_NX_CLONE`
- owner único: `orbit360-platform/core/queries.js`
- owner type: `PRODUCT`
- producto modificado durante este diagnóstico: **no**
- browser / secretos / datos / deploy: **no ejecutados**
- Firestore/Auth/operational writes: **0**
- nueva matriz: **no autorizada / no ejecutada**

## Evidencia durable

Workflow source-only:

- run `31962262791`
- job `95201876769`
- artifact `9267541412`
- digest `sha256:b7da1787074a948958f7d687fb8c0943c54b3375a36081d9aad2e565c8333740`
- commit del workflow `15c91bf0a966246a1d46ba564ede491f5a4c94c5`
- resultado global: `SUCCESS`

Primera etapa ejecutable: gate canónico `fase-a-ops-leads-crm-release-lab-v20260812` → PASS, 13 checks, cero capacidades runtime/browser/deploy/write.

## Aislamiento de los cuatro costos

### 1. Activación/switch de rol

La matriz observó `22,298 ms` antes de la primera ruta, pero esa cifra **no es una medición pura de `session.set`**.

`access-role-session-owner-v20260728.js` emite `orbit:session` síncronamente al cambiar de rol y `crm-v1198-operational-bridge.js` responde a ese evento disparando `hashchange`, que puede renderizar la ruta corriente dentro del mismo intervalo. Por eso este tramo queda como `MIXED / INSTRUMENTATION_CONTAMINATED`; no se atribuye a un owner funcional independiente.

### 2. Cliente 360

La matriz midió `57,804 ms` y la ruta finalmente obtuvo PASS.

La causa source-level es determinística:

1. `modules/cliente360.js` intenta usar `q.clientesResumenIndex()`.
2. `core/queries.js` **no implementa ni exporta** `clientesResumenIndex`.
3. Cliente 360 cae siempre en el fallback `q.clienteResumen(c.id)`.
4. En la carga inicial se invoca ese resumen al menos 430 veces para el agregado global + 40 filas visibles = **470 resúmenes**.
5. Cada `clienteResumen` hace `get(clientes)` y `where(polizas/cobros/comisiones)`.
6. El store productivo read-only implementa `get` y `where` sobre `all()`, y `all()` clona todas las filas de la colección.

Fixture versionada ya utilizada por las regresiones:

- clientes: 430
- pólizas: 1,375
- cobros: 1,900
- comisiones: 900

Lower bound por resumen: `430 + 1,375 + 1,900 + 900 = 4,605` filas clonadas.

Lower bound por carga inicial de Cliente 360: `470 × 4,605 = 2,164,350` filas clonadas.

Una agregación batched de una pasada necesita del orden de `4,605` filas sobre el mismo fixture. La amplificación estructural es por tanto **470×** antes de contar otros enrichers/KPIs.

Esto prueba un defecto real de producto y explica el tramo dominante de `57.804 s`.

### 3. Aseguradoras

Aseguradoras tiene una ineficiencia secundaria: la tarjeta ejecuta un `where('polizas')` por aseguradora. Con 30 aseguradoras y 1,375 pólizas, el lower bound sintético es `41,250` filas clonadas.

Eso equivale a ~`1.91%` del lower bound detectado en Cliente 360. Más importante: la matriz solo dejó `9,540 ms` residuales antes de expirar el timeout externo y **Aseguradoras nunca produjo PASS/FAIL propio**.

Conclusión: `Aseguradoras` **no es el owner terminal probado** de este STOP.

### 4. Presupuesto externo de 90 s del harness

El harness agrupa dentro de un único timeout de `90,000 ms`:

- setup/cambio de rol;
- scope;
- `inicio`;
- `cliente360`;
- `aseguradoras`;
- `ops`;
- `leads`.

La aritmética terminal fue:

- setup previo: 22,298 ms
- Inicio: 359 ms
- Cliente 360: 57,804 ms
- Aseguradoras observada: 9,540 ms
- suma: **90,001 ms**
- presupuesto: 90,000 ms
- diferencia de redondeo: 1 ms.

Además, las rutas usan checkpoints, no `runStage` independientes, y el `waitForFunction` de 8 s tiene `.catch(() => {})`.

Clasificación: `VALIDATOR_STALE_SECONDARY / CUMULATIVE_ROLE_GROUP_BUDGET_AND_ROUTE_ATTRIBUTION`.

Este problema explica por qué el timeout terminó etiquetado a nivel de grupo y truncó Aseguradoras, pero **no crea** los 57.804 s de trabajo de Cliente 360. Por tanto no es el root owner.

## Gate correctivo único

Se creó el gate versionado:

`tools/orbit360-r4-cliente360-summary-boundedness-gate-v20260816.mjs`

Estado actual R4S3, ejecutado en modo expected-fail durante el diagnóstico:

- status: `CLIENTE360_SUMMARY_BOUNDEDNESS_GATE_FAIL`
- classification: `FUNCTIONAL_DEFECT`
- failure family: `CLIENTE360_BATCH_SUMMARY_CONTRACT_MISSING`
- owner: `orbit360-platform/core/queries.js`

El FAIL actual es el resultado correcto: confirma que el contrato batched todavía no existe.

### Condición de cierre del gate

El owner debe implementar/exportar `Orbit.q.clientesResumenIndex` como `Map` de resúmenes para los 430 clientes mediante pasadas acotadas sobre las colecciones, preservando la semántica de `clienteResumen`.

En el fixture versionado `430 / 1,375 / 1,900 / 900`, el gate exige:

- `Map.size === 430`
- shape de resumen equivalente
- `allCalls <= 8`
- `getCalls <= 10`
- `cloneRows <= 20,000`

`modules/cliente360.js` y el store productivo quedan fuera del owner de este fix y están hash-bloqueados por el gate para esta regresión.

## Frontera siguiente

No se aplicó ningún rootfix de producto en este bloque.

Antes de cualquier nuevo browser se requiere nueva autorización explícita para:

1. aplicar exclusivamente el rootfix batched en `core/queries.js`;
2. ejecutar gate canónico + gate de boundedness + regresión semántica;
3. solo con PASS decidir una sucesora mínima certificada del paquete y una futura matriz, mediante autorización separada según corresponda.

No reimportación, Auth/datos, deploy, main ni merge.

El progreso permanece **100% funcional readiness / 75% técnico / 67% gates (2/3)** hasta `POST_GO_LIVE_SMOKE_PASS`.
