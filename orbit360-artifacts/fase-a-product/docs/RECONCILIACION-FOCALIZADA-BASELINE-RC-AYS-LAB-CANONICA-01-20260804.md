# RECONCILIACIÓN FOCALIZADA DEL BASELINE — RC-AYS-LAB-CANONICA-01

Fecha de cierre: 2026-08-04  
Estado: `PASS`  
Gate: `PASS_CANONICAL_BASELINE`  
Source baseline: `548cffa50cddfd93ad2118f5a06e9bb420699bde`

## 1. Decisión

```text
PASS_CANONICAL_BASELINE
```

La candidata continúa siendo una sola. Esta reconciliación no reconstruye el producto, no crea otra rama y no reemplaza módulos completos. Fija owners, capas de compatibilidad, conteos y acciones posteriores sobre el baseline congelado.

Restricciones cumplidas: sin Firebase, secretos, deploy, navegador, reimportación, producción, `main`, merge o escrituras reales.

## 2. Hechos cerrados preservados

- PR #5: draft/open y anclado a `RC-AYS-LAB-CANONICA-01`;
- run funcional `30962756387`: 18 PASS / 0 FAIL;
- fallo visual vigente: `PIPELINE_MECHANISM_FAILURE`;
- mecanismo bajo `STOP_RETRY`: navegación por hash acumulativa en una SPA de larga vida;
- mecanismo reemplazante único: un contexto aislado y URL directa por ruta;
- árbol acumulativo sellado: 31 rutas, 31 módulos activos trabajados, 30 integrados al store y 0 fallos de módulo;
- ningún gate funcional cerrado se repite por este diagnóstico.

## 3. Matriz canónica de owners fundacionales

| Dominio/ruta | Owner canónico | Capas de soporte | Clasificación | Acción |
|---|---|---|---|---|
| Router | `core/router.js` | `core/router-tenant-config-bootstrap.js` | `OWNER_PLUS_BOOTSTRAP_SUPPORT` | Preservar. El bootstrap carga contratos y tenant antes del Router; no es un segundo Router. |
| Access | `core/access-scope.js` | `auth.js`, `access-role-session-owner-v20260728.js`, `access-ceilings-v1199.js` | `SINGLE_POLICY_ENGINE_WITH_DISTINCT_SESSION_AND_CEILING_LAYERS` | Preservar. Access decide visibilidad/scope; session owner resuelve rol efectivo y ceilings impone límites duros. |
| Cliente 360 | `modules/cliente360.js` | `crm-v1198-operational-bridge.js`, `client-insurer-visual-contract-v20260720.js` | `CANONICAL_RENDERER_WITH_SCOPE_OVERLAY_AND_READ_PROJECTION` | Preservar renderer y soporte. No reemplazar el módulo. |
| Aseguradoras | `modules/aseguradoras.js` | UX bridge, import bridge, visual contract, edit owner y operational-directory owner | `CANONICAL_CRUD_RENDERER_WITH_EXPLICIT_SECTION_OWNERS` | Preservar. CRUD sigue en el módulo; portales/cuentas tienen owner de sección explícito. |

## 4. Overlays y bridges

### 4.1 Cliente 360

`modules/crm-v1198-operational-bridge.js` no sustituye el renderer. Añade scope, guards de deep-link, creación tenant-aware, calidad y separación de acciones críticas. Se clasifica `COMPATIBILITY_REQUIRED`.

`core/client-insurer-visual-contract-v20260720.js` instala la proyección canónica de lectura y mantiene `writesStore:false`.

`core/client-canonical-view-projection-v20260716.js` vuelve a exponer una proyección de compatibilidad y declara `temporaryInPlaceBridge:true`. Se clasifica `TEMPORAL_RETIREMENT`, pero no se retira antes de demostrar en runtime que ningún consumidor depende de sus eventos o aliases.

### 4.2 Aseguradoras

- `aseguradoras-v1197-ux-bridge.js`: `COMPATIBILITY_REQUIRED`; conserva alias, ficha y UX sin sustituir el renderer canónico.
- `aseguradoras-v1202-import-bridge.js`: `COMPATIBILITY_REQUIRED`; owner de importación/propuestas, no del CRUD general.
- `client-insurer-edit-owner-v20260722.js`: soporte semántico de edición; delega CRUD al módulo canónico.
- `client-insurer-operational-directory-owner-v20260722.js`: owner explícito de portales y cuentas en modo operativo; sustituye únicamente esas secciones del contrato visual.
- `aseguradoras-v1202-resources-bridge.js`: candidato `TEMPORAL_RETIREMENT/INACTIVE_COMPATIBILITY`. Su guard exige `mod.__v1197Bridge`, marcador no demostrado en los productores inspeccionados. No se elimina en este bloque; el próximo runtime debe confirmar que permanece inactivo y que el owner operativo cubre sus consumidores.

No se demostró un `FUNCTIONAL_DEFECT` por coexistencia de capas. La deriva histórica de owners queda contenida mediante esta matriz y los consumidores explícitos.

## 5. Reconciliación exacta de conteos

### 5.1 Baseline histórico M1

```text
clientes: 414
aseguradoras: 26
asesores: 7
```

Esos conteos fueron el inventario aceptado de M1.

### 5.2 Escritura y revalidación durable M4

M4 escribió y luego revalidó en read-only:

```text
clientes canónicos: 414
aseguradoras canónicas: 26
configuración: 1
membership: 1
```

Por tanto, 414/26 no era seed ni una estimación: existía en el destino canónico.

### 5.3 Delta autorizado posterior

El Gate 7.8 de padres HOLD ejecutó `create-only`:

```text
clientes: +16  → 430
aseguradoras: +4 → 30
updates: 0
sobrescrituras: 0
REQUIERE_VALIDACION preservado: 20/20
```

Los veinte registros provinieron de la autoridad heredada para resolver integridad referencial; su creación no los convirtió en registros validados.

### 5.4 Snapshot acumulativo observado

```text
clientes: 430
aseguradoras: 30
pólizas: 1,375
vehículos: 1,033
recibos esperados: 1,294
cartera de primas: 673
cobros: 7
memberships: 1
```

El último gate visual read-only observó esos conteos con snapshot before/after idéntico, cero escrituras Firestore y cero escrituras Auth.

Conclusión:

```text
unexplained client delta: 0
unexplained insurer delta: 0
reimport required: false
data loss observed: false
```

No se revierten 430/30 a 414/26 y no se reimportan Clientes/Aseguradoras para resolver visualización o acceso.

## 6. Mejor versión acumulativa aceptada

La autoridad acumulativa no es un archivo aislado de Claude ni el módulo base sin overlays. Es la composición sellada del baseline:

```text
index.html + owner canónico + capas de soporte clasificadas + Orbit.store + Auth/Access + tenant bootstrap
```

La evidencia acumulativa ya vinculó Cliente 360, Aseguradoras, Pólizas, Vehículos, Recibos, Cartera, Cobros, Ops y Leads al mismo snapshot y árbol de producto. Los módulos restantes se afinan por su gate específico sin abrir otra candidata.

## 7. Clasificación final

```text
FUNCTIONAL_DEFECT: no demostrado en este microbloque
DATA_CONTRACT_FAILURE: cerrado para baseline y conteos
VALIDATOR_STALE: histórico, contenido por owners y ledger
PIPELINE_MECHANISM_FAILURE: sigue abierto únicamente para evidencia visual
SECURITY_FAILURE: no demostrado
```

## 8. Evidencia sellada

- plan rector y ledger vivo de la RC;
- `rc-ays-lab-canonica-01-baseline-reconciliation-v20260804.json`;
- cierre durable M4;
- Gate 7.8 create-only de padres HOLD;
- manifiesto acumulativo RC1.2;
- inspección del `index.html` y owners sobre el source baseline.

## 9. Siguiente acción exacta

Abrir Microbloque 2.0 y ejecutar únicamente el validador sintético existente de rutas aisladas:

```text
ONE_ISOLATED_BROWSER_CONTEXT_AND_DIRECT_URL_PER_ROUTE
```

Debe probar ocho rutas sin Firebase, secretos, deploy o escrituras reales. No se crea otro workflow ni otro arnés. Gate siguiente:

```text
PASS_ISOLATED_ROUTE_HARNESS
```
