# Orbit 360 A&S — Auditoría estática M2: bootstrap productivo read-only

Fecha: 2026-07-23
Repositorio: paulaosoriof86/orbit360-core
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Bloque: 2
Capacidades utilizadas: solo lectura de repositorio y documentación

## Resultado ejecutivo

```text
M1: CERRADO
M2: INICIADO EN AUDITORÍA ESTÁTICA
PÓLIZAS: NO AUTORIZADAS TODAVÍA
PRODUCCIÓN/SECRETS/RULES/DEPLOY: NO TOCADOS
```

M2 no parte de cero. La rama contiene contratos productivos read-only reutilizables y validados de forma aislada. El gap principal es de orquestación: no existe todavía un bootstrap productivo explícito cargado por la aplicación que conecte Auth, membership, tenant, scopes, query planner y store read-only sin fallback.

## Componentes existentes y reutilizables

1. `data/store-firestore-product-readonly-p0.js`
   - API compatible con Orbit.store;
   - `mode: product`;
   - `noFallback: true`;
   - `writeEnabled: false`;
   - bloquea insert/update/remove/setPref/reseed;
   - exige constraint tenant en cada query;
   - cuarentena cross-tenant.

2. `core/backend-product-readiness-contract-p0.js`
   - fail-closed;
   - valida config pública mínima, Auth, membership, tenant, store y contratos;
   - no conecta Firebase ni escribe;
   - solo habilita smoke read-only.

3. `core/membership-multirol-contract-p0.js`
   - roles múltiples;
   - rol default/activo;
   - módulos base + extras - restringidos;
   - scopes own/team/all/none;
   - ampliación de acceso con confirmación reforzada;
   - sin secretos ni escritura.

4. `core/tenant-access-policy-contract-p0.js` y `core/tenant-access-policy-effective-p0.js`
   - política de visibilidad y lectura por colección/módulo/scope.

5. `core/product-query-planner-contract-p0.js`
   - constraint tenant obligatorio;
   - scope own/team/none;
   - sin filtrado cross-tenant del lado cliente;
   - no ejecuta consultas.

6. `core/tenant-canonical-paths-contract-p0.js`
   - rutas canónicas multi-tenant.

7. `core/product-readonly-route-rule-matrix-p0.js`
   - reglas get/list;
   - create/update/delete bloqueados;
   - memberships, config sanitizada, auditoría e import batches por rol;
   - credentialRefs bloqueadas al frontend.

8. `core/product-readonly-smoke-contract-p0.js`, catálogo y workflows P0
   - contratos de evidencia sanitizada;
   - validaciones estáticas y self-tests;
   - no ejecutan la conexión productiva real.

## Gaps reales encontrados

### GAP-M2-01 — Falta bootstrap productivo explícito

El readiness solo devuelve un plan; no instala store, no adjunta Auth, no resuelve membership y no conecta snapshots. La documentación también declara que la conexión productiva no se ha ejecutado.

Debe existir un owner canónico, reusable y fail-closed que:

1. detecte modo productivo autorizado;
2. inicialice Firebase desde configuración de entorno, sin valores en código;
3. espere Auth productivo;
4. lea la membership del UID;
5. derive tenant únicamente desde membership;
6. construya `Orbit.auth.user()` con roles, rol activo, países y scopes;
7. compile query plans;
8. cree e instale el store read-only;
9. adjunte snapshots permitidos;
10. bloquee el shell operativo ante cualquier gap.

### GAP-M2-02 — El entrypoint vivo continúa siendo LAB

`index.html` carga `backend-lab-loader`, `backend-lab-init` y `store-firestore-lab.local.js`. No existe todavía una ruta productiva explícita cargada por el shell.

No se debe sustituir LAB ni mezclar ambos stores. El modo productivo debe tener bootstrap inequívoco, fail-closed y sin query string como fuente de tenant.

### GAP-M2-03 — El tenant actual de preview llega por query string

El preview LAB utiliza `tenant=alianzas-soluciones`. Esto es válido solo para LAB. En producción el tenant debe resolverse desde la membership autenticada.

### GAP-M2-04 — No existe gate M2 registrado

El registro vigente todavía declara `activeBlock: 1` y solo contiene el gate de Cliente 360 + Aseguradoras. Antes de cualquier secret, Rules, Firebase o smoke productivo debe crearse un contrato M2 versionado.

Gate propuesto:

```text
block2-product-readonly-bootstrap-v20260723
```

### GAP-M2-05 — Los smokes existentes son contractuales, no conexión real

Los workflows P0 actuales ejecutan sintaxis, tests y self-tests. No prueban todavía:

- Auth productivo real;
- membership real;
- tenant derivado de membership;
- snapshots Firestore productivos;
- aislamiento cross-tenant real;
- rules productivas;
- cero fallback en el shell vivo.

Esto es correcto para la etapa actual, pero no cierra M2.

### GAP-M2-06 — Taxonomía de roles por reconciliar

Los contratos P0 usan `SuperAdmin` y `AdminTenant`; el frontend operativo vigente también reconoce variantes como `Superadmin` y `Admin`. Antes de conectar membership real debe definirse una taxonomía canónica y aliases de lectura, sin guardar variantes ambiguas.

No se corrige en varios módulos: el owner debe ser el contrato de membership/access.

### GAP-M2-07 — Rules y proyecto productivo requieren autorización separada

Existen especificaciones y matrices, pero no se han aplicado Rules ni se ha conectado un proyecto productivo. La auditoría actual no autoriza:

- usar secretos;
- leer Firebase productivo;
- crear memberships;
- aplicar Rules;
- desplegar Hosting;
- ejecutar smoke runtime.

## Contrato mínimo propuesto para M2

Owners canónicos:

```text
core/backend-product-readonly-bootstrap-p0.js     NUEVO OWNER
core/backend-product-readiness-contract-p0.js
core/membership-multirol-contract-p0.js
core/tenant-access-policy-contract-p0.js
core/tenant-access-policy-effective-p0.js
core/product-query-planner-contract-p0.js
core/tenant-canonical-paths-contract-p0.js
data/store-firestore-product-readonly-p0.js
core/product-readonly-route-rule-matrix-p0.js
core/product-readonly-smoke-contract-p0.js
```

Invariantes:

```text
tenant_from_membership_only = true
query_string_tenant_in_product = false
product_store_explicitly_installed = true
store_no_fallback = true
writes_blocked = true
cross_tenant_denied = true
demo_lab_seed_localStorage_fallback = false
credential_refs_frontend_read = false
rules_not_applied_without_authorization = true
```

## Secuencia mínima de implementación

1. Registrar gate M2 y owners canónicos.
2. Crear el bootstrap productivo explícito sin configuración real.
3. Crear entrypoint/mode routing fail-closed que no altere LAB.
4. Reconciliar taxonomía de roles en membership/access.
5. Actualizar preflight, workflow, documentación, Claude y Academia juntos.
6. Ejecutar validación estática única, sin secretos.
7. Presentar evidencia y solicitar autorización específica para conexión productiva read-only.
8. Solo después: Auth, membership inicial, Rules de lectura y smoke runtime.

## Responsive móvil diferido

Los títulos móviles no completamente responsive permanecen como deuda no bloqueante durante M2, clasificada `REPLICABLE_CLAUDE_ACUMULADO` y `ACADEMIA_ACTUALIZAR`. Deben cerrarse antes de la release candidate productiva del Bloque 5.

## Pólizas y prioridad operativa

Pólizas no es la siguiente acción. El Plan Maestro las ubica después del primer go-live controlado. La prioridad operativa de Paula —Clientes 360, CRM, Pólizas, Cobros, Ops y Leads— se mantiene registrada, pero no se adelanta la fuente Pólizas antes de cerrar el bootstrap, activación del tenant, writer durable, release candidate y go-live.

## Estado por carriles

```text
Carril A — frontend/UX/Academia:
M1 aprobado; responsive móvil diferido y documentado.

Carril B — backend/seguridad/Auth/Orbit.store:
M2 auditado; contratos read-only existentes; bootstrap productivo explícito faltante.

Carril C — datos reales/migración:
Sin acción; 414 clientes y 26 aseguradoras preservados; no se abre Pólizas.
```

## Siguiente acción exacta

Preparar un único patch estático M2 que registre `block2-product-readonly-bootstrap-v20260723`, cree el owner `backend-product-readonly-bootstrap-p0.js`, reconcilie roles en membership/access y añada un entrypoint fail-closed; actualizar preflight, workflow, documentación, Claude y Academia en el mismo bloque. No usar secretos, Firebase productivo, Rules, navegador o deploy.
