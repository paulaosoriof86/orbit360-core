# RECONCILIACIÓN FOCALIZADA DEL BASELINE — RC-AYS-LAB-CANONICA-01

Fecha de inicio: 2026-08-04  
Estado: `IN_PROGRESS`  
Gate: `PASS_CANONICAL_BASELINE`  
Source baseline: `548cffa50cddfd93ad2118f5a06e9bb420699bde`

## 1. Alcance cerrado

Esta no es una auditoría general. Solo resuelve:

1. owners efectivos;
2. scripts realmente cargados;
3. bridges/guards/refinements activos;
4. mejor versión aceptada por módulo;
5. conteos observados y su trazabilidad;
6. deltas indispensables antes del gate visual.

Restricciones: sin Firebase, secretos, deploy, navegador, reimportación, producción, main, merge o escrituras reales.

## 2. Hallazgos confirmados iniciales

### 2.1 Estado vivo del PR

El cuerpo anterior del PR estaba desactualizado porque todavía afirmaba que runtime no tenía PASS. Fue reemplazado por el estado vivo de `RC-AYS-LAB-CANONICA-01`, preservando:

- run `30962756387`: 18 PASS / 0 FAIL;
- causa raíz visual como `PIPELINE_MECHANISM_FAILURE`;
- censo source-only de Cobros;
- siguiente acción exacta.

Estado: `CORREGIDO`.

### 2.2 Bootstrap y store cargados por index

El baseline carga explícitamente:

- `core/backend-lab-loader.js`;
- `core/backend-lab-init.js`;
- `data/store.js`;
- `data/store-firestore-lab.local.js`;
- `core/auth.js`;
- `core/access-scope.js`;
- `core/access-role-session-owner-v20260728.js`;
- `core/router-tenant-config-bootstrap.js`;
- `core/router.js`.

La secuencia inline inicializa:

```text
Orbit.store.init(Orbit.SEED)
Orbit.router.init()
Orbit.auth.init()
```

Estado: `EVIDENCIA_CONFIRMADA`; todavía no se modifica el orden.

### 2.3 Módulos base cargados

El index carga directamente los módulos base relevantes:

- `modules/ops.js`;
- `modules/leads.js`;
- `modules/cliente360.js`;
- `modules/polizas.js`;
- `modules/cobros.js`;
- `modules/conciliaciones.js`;
- `modules/comisiones.js`;
- `modules/importar.js`;
- `modules/equipo.js`;
- `modules/aseguradoras.js`;
- `modules/portal.js`;
- `modules/cotizador.js`;
- `modules/comparativo.js`.

Estado: `EVIDENCIA_CONFIRMADA`.

### 2.4 Overlays activos que requieren clasificación de owner

El mismo index carga además, entre otros:

- `data/academia-v1197-bridge.js`;
- `modules/aseguradoras-v1197-ux-bridge.js`;
- `modules/aseguradoras-v1202-import-bridge.js`;
- `modules/aseguradoras-v1202-resources-bridge.js`;
- `modules/portal-v1142-copyfix.js`;
- `modules/cotizador-v1203-source-gate.js`;
- `modules/comparativo-v1203-operational-bridge.js`;
- `modules/crm-v1198-operational-bridge.js`;
- `modules/policy-receipts-v1199-bridge.js`;
- `modules/policy-receipts-v1199-detail-guard.js`;
- `modules/renewals-v1200-operational-bridge.js`;
- `modules/renewals-v1200-permission-guard.js`;
- `modules/issuance-endosos-v1201-bridge.js`;
- `modules/issuance-endosos-v1201-refinements.js`;
- `modules/ops-workflows-v1201-bridge.js`;
- `modules/renewals-v1201-issued-filter.js`;
- `modules/portal-v1198-scope-viewer-bridge.js`.

La coexistencia de base + overlay no se clasifica automáticamente como defecto. Cada archivo debe quedar en una de estas categorías:

```text
OWNER
COMPATIBILITY_REQUIRED
DUPLICATE
OBSOLETE
PROTECTED
TEMPORAL_RETIREMENT
```

No se retira ningún overlay hasta comprobar su consumidor, orden y efecto.

## 3. Matriz owner preliminar

| Dominio | Base visible | Overlays visibles | Estado |
|---|---|---|---|
| Store/backend | `data/store.js`, loader/init LAB, adapter local | políticas y contratos auxiliares | protegido; verificar sin modificar |
| Router | `core/router.js` | `router-tenant-config-bootstrap.js` | owner por confirmar |
| Access | `auth.js`, `access-scope.js` | session owner, ceilings, taxonomy | owner por confirmar |
| Cliente 360 | `modules/cliente360.js` | CRM operational bridge compartido | consumidor por confirmar |
| Aseguradoras | `modules/aseguradoras.js` | UX/import/resources bridges | múltiples capas; clasificar |
| Pólizas/recibos | `modules/polizas.js` | receipts, renewals, issuance overlays | múltiples capas; clasificar |
| Cobros | `modules/cobros.js` | dominio backend no visible como bridge de módulo | contrato runtime por cruzar |
| Conciliaciones | `modules/conciliaciones.js` | dominio backend no visible como bridge de módulo | contrato runtime por cruzar |
| Ops | `modules/ops.js` | ops workflows bridge | owner por confirmar |
| Leads | `modules/leads.js` | CRM operational bridge | owner por confirmar |
| Portal | `modules/portal.js` | copyfix y scope-viewer bridge | múltiples capas; clasificar |
| Cotizador/Comparativo | módulos base | source gate y operational bridge | preservar mejor versión aprobada |

## 4. Riesgo de raíz que se está resolviendo

La rama contiene una acumulación histórica de módulos base y overlays. El riesgo no es solo visual: sin un owner explícito, un validator puede observar una capa mientras el usuario ve otra, y una candidata posterior puede retirar o reemplazar el archivo equivocado.

Clasificación provisional:

```text
DATA_CONTRACT_FAILURE — no demostrado todavía
FUNCTIONAL_DEFECT — no demostrado
VALIDATOR_STALE — posible para consumidores antiguos
PIPELINE_MECHANISM_FAILURE — confirmado para el gate visual previo
```

No se implementa fix hasta cerrar la matriz de consumidores.

## 5. Trabajo restante del mismo microbloque

1. inspeccionar registro/router y bootstrap;
2. cruzar cada ruta con módulo y overlays;
3. identificar archivos protegidos;
4. localizar evidencia de última aprobación por módulo;
5. reconciliar conteos históricos y actuales;
6. emitir deltas concretos, no reemplazo total;
7. cerrar con `PASS_CANONICAL_BASELINE` o STOP con causa raíz.

## 6. Siguiente acción exacta

Construir la matriz completa:

```text
ruta → owner → script base → overlay → consumidor → evidencia → clasificación → acción
```

Comenzar por Router, Access, Cliente 360 y Aseguradoras porque son dependencias de todas las rutas posteriores.