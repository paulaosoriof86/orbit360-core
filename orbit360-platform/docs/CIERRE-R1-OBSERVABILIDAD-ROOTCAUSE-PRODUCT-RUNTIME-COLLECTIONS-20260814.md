# CIERRE R1 — OBSERVABILIDAD Y CAUSA RAÍZ DEL RUNTIME PRODUCTIVO

Fecha: 2026-08-14  
Proyecto: Orbit 360 / A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Candidata funcional canónica preservada: `4ede3e785cb2cc889a7c11c2d9e2030c7af20b64`  
Commit de instrumentación R1: `e102735ea5592b84b2ea920933ce483af01a43ad`

## 1. Alcance R1

R1 modificó únicamente el harness:

`tools/orbit360-fase-a-product-local-synthetic-smoke-v20260814.mjs`

Objetivo: conservar la transición sanitizada del bootstrap productivo y las rutas HTTP fallidas sin query strings ni secretos.

No se modificaron módulos, datos, Auth, membership, store productivo, Rules, Functions, HostDime ni producción.

## 2. Evidencia

Workflow: `Orbit360 Fase A Product Local Synthetic 20260814`  
Run: `31820056535`  
Job: `94830881175`  
Resultado global: FAIL seguro fuera de producción.  
Artifact de evidencia: `orbit360-fase-a-product-local-synthetic-31820056535` · ID `9226591877` · SHA-256 `22731d833bc074d2461032674d0b192a97dacef3e5532afd10b6c238640539b9`.

PASS previos al fallo:

- gate canónico source;
- ensamblaje del artefacto;
- entrypoint funcional;
- formulario de login presente;
- runtime productivo enlazado;
- store pre-auth fail-closed;
- configuración pública materializada;
- identidad smoke existente resuelta;
- cero Firestore writes;
- cero Auth writes;
- cero operational writes;
- cero deploy;
- producción intacta.

## 3. Secuencia exacta observada

El bootstrap avanzó:

`environment -> authentication -> membership -> planning -> attaching -> blocked`

Error interno sanitizado final:

`snapshots_no_adjuntos`

También se observó un 404 local de un JS bajo `/core/`; el nombre quedó sobre-sanitizado por el harness. No se clasifica como causa del bloqueo porque los contratos requeridos ya estaban montados y el bootstrap alcanzó `attaching`. Se conserva como observación para la certificación del paquete, sin crear otro run diagnóstico.

## 4. Causa raíz demostrada

Clasificación:

`DATA_CONTRACT_FAILURE / PRODUCT_RUNTIME_COLLECTION_POLICY_MISMATCH`

Cadena causal:

1. `tools/orbit360-fase-a-materialize-product-runtime-config-v20260813.mjs` materializa actualmente `clientes`, `aseguradoras`, `gestiones`, `notificaciones`.
2. `tenant-access-policy-contract-p0.js` no define política para `notificaciones`.
3. El planner devuelve una consulta no autorizada/hard-error para esa colección.
4. `store-firestore-product-readonly-p0.js` registra el error de attach.
5. `_attachSnapshots()` devuelve falso cuando existe error síncrono de attach.
6. `backend-product-readonly-bootstrap-p0.js` transforma ese falso en `snapshots_no_adjuntos`.
7. `product-app-p0.js` lo colapsa externamente a `PRODUCT_READONLY_BOOTSTRAP_NOT_READY`.

Auth, Firebase, credenciales, membership, HostDime y datos no son la causa demostrada de R1.

## 5. Reconciliación required/optional — source-only

Ya existe un owner canónico anterior que no debe ser redescubierto ni contradicho:

`core/visual-runtime-hydration-contract-v20260805.js`

Contrato required por rutas críticas:

- Inicio: `clientes`, `polizas`, `cobros`, `aseguradoras`.
- Aseguradoras: `aseguradoras`.
- Cliente 360: `clientes`, `aseguradoras`, `polizas`, `vehiculos`, `recibosEsperados`, `carteraPrimas`, `cobros`.
- Pólizas: `polizas`, `clientes`, `aseguradoras`, `vehiculos`, `recibosEsperados`.
- Cobros: `cobros`, `clientes`, `polizas`, `aseguradoras`, `vehiculos`.
- Ops/Leads: required `clientes`, `polizas`, `aseguradoras`; `negocios`, `gestiones`, `asesores` son opcionales/legacy para readiness.

Unión canónica required del primer go-live actual:

`clientes, polizas, cobros, aseguradoras, vehiculos, recibosEsperados, carteraPrimas`

Optional/legacy ya definidos por el owner existente:

`asesores, metas, negocios, gestiones, comisiones, cancelaciones`

El runtime productivo actual viola este contrato de dos maneras:

- agrega como hard collection `notificaciones`, que no tiene política y no corresponde al almacenamiento usado por `modules/notificaciones.js`;
- omite varias colecciones required canónicas: `polizas`, `cobros`, `vehiculos`, `recibosEsperados`, `carteraPrimas`.

Además el store P0 hoy considera `ready` cuando al menos una colección recibió snapshot y no implementa required/optional. Eso puede producir un PASS de hidratación parcial. R2 debe corregir la semántica, no solo quitar `notificaciones`.

## 6. Decisión R2 — única familia permitida

R2 debe alinear el runtime productivo read-only con el contrato required/optional ya aprobado, sin reabrir módulos ni crear un mecanismo paralelo.

Objetivos del único rootfix:

1. catálogo productivo basado en required/optional canónico;
2. eliminar `notificaciones` como hard dependency sin política;
3. incluir todas las colecciones required del primer go-live;
4. optional/legacy no bloquea readiness;
5. readiness solo PASS cuando todas las required están adjuntas y sin error;
6. `asesores` permanece optional/proyectable, nunca vuelve a ser dependencia bloqueante;
7. conservar store read-only, fail-closed, tenant-scoped y cero fallback;
8. ejecutar después exactamente una vez el mismo synthetic local.

No se autoriza en R2:

- HostDime;
- deploy;
- producción;
- reimportación;
- cambios de Auth/membership;
- Rules/Functions;
- otro workflow/request;
- otro rediagnóstico general.

Si el mismo `DATA_CONTRACT_FAILURE / PRODUCT_RUNTIME_COLLECTION_POLICY_MISMATCH` reaparece después del rootfix R2, se aplica `STOP_RETRY` y no existe tercer intento de la misma familia.

## 7. Avance

Readiness funcional de la candidata: `100%`.

Ruta técnica vigente al haberse demostrado que R2 es necesario:

- R1: cerrado — 1/4;
- R2: pendiente;
- R3: pendiente;
- R4: pendiente.

Avance por iteraciones hacia producción: `25%`.

Gates finales de go-live:

- G1 blocker productivo cerrado: pendiente;
- G2 ZIP durable certificado: pendiente;
- G3 publicación + E2E final PASS: pendiente.

Avance de gates de go-live: `0%` (0/3). No se otorgan puntos por diagnóstico hasta cerrar el blocker.

Con R2 PASS: 50% por iteraciones y 33% de gates.  
Con R3 PASS: 75% por iteraciones y 67% de gates.  
Con R4 PASS: 100% / 100%.

## 8. Siguiente acción exacta

Ejecutar R2 sobre la misma rama/candidata acumulativa: corregir únicamente la capa de catálogo/hidratación productiva required/optional demostrada por R1, validar source-only, y disparar una sola vez el mismo `Orbit360 Fase A Product Local Synthetic 20260814`.
