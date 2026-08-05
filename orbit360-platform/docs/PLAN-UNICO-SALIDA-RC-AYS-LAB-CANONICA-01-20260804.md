# PLAN ÚNICO DE SALIDA — RC-AYS-LAB-CANONICA-01

Fecha de adopción: 2026-08-04  
Última actualización: 2026-08-05 06:55 GT  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Baseline funcional congelado: `548cffa50cddfd93ad2118f5a06e9bb420699bde`  
Producción, `main` y merge: no autorizados

## 1. Carácter vinculante

Este documento, el ledger vivo, el estado activo y la evidencia reciente rigen una sola candidata acumulativa A&S. Ninguna conversación sustituye estas fuentes.

Precedencia:

1. reglas maestras y addenda vigentes;
2. estado vivo del PR/HEAD;
3. este Plan Único;
4. ledger vivo;
5. evidencia reciente del módulo.

## 2. Identidad y objetivo

```text
RC: RC-AYS-LAB-CANONICA-01
sourceBaseline: 548cffa50cddfd93ad2118f5a06e9bb420699bde
```

El objetivo sigue siendo integrar y presentar Cliente 360, Aseguradoras, Pólizas, Vehículos, Recibos, Cartera, Cobros, Conciliaciones, Comisiones, Equipo/onboarding, Ops, Leads, importador recurrente, Auth, memberships, multirol y scopes configurables.

## 3. Hechos cerrados

### Runtime funcional

```text
run: 30962756387
PASS: 18
FAIL: 0
```

No se repite sin cambio funcional de owner.

### Baseline canónico

```text
clientes: 430
aseguradoras: 30
pólizas: 1,375
vehículos: 1,033
recibos: 1,294
cartera: 673
cobros confirmados: 7
memberships: 1
reimportación requerida: no
pérdida observada: no
```

### Composición y continuidad

```text
rutas aisladas: 30971707956 · 8/8 PASS
composición canónica: 30977179448 · 31/31 PASS
inner preflight: 32/32 PASS
request v4/provenance: 30979519198 · 33/33 PASS
```

## 4. Microbloque 2.5 — candidata LAB visible

```text
run: 31005103975
job: 92302991333
workflow: success
preflight: 32/32 PASS
Functions allowlisted: 4/4
Hosting preview: PASS y retenido
integridad: PASS
visual exit: 0
integridad exit: 0
snapshots before/after: idénticos
Firestore/Auth writes: 0
```

URL retenida:

```text
https://ays-orbit-360-lab--orbit360-operational-block12-w8ibrr6w.web.app
```

Las ocho capturas automáticas mostraron el modal `Acuerdos legales`. Esto demuestra un fallo del capturador para reconocer overlays, no un defecto funcional de la candidata.

Root fix source-only del capturador:

```text
commit: 6c443d0f40e6874675f8c1980ef0cdb353120031
error futuro: PIPELINE_MECHANISM_FAILURE:ROUTE_<route>_LEGAL_MODAL_BLOCKING_CAPTURE
```

## 5. Decisión de continuidad del producto

Por decisión de la dueña del producto, el modal legal no pausa la ruta técnica.

```text
revisión manual: disponible
aceptación legal: una sola vez en la sesión
captura automática: pendiente de corrección
producto/backend: continúa
```

No se desactiva globalmente el contrato legal. Paula puede abrir la URL, aceptar el acuerdo una vez y revisar la candidata. La aprobación visual permanece pendiente en paralelo.

Quedan prohibidos:

- rerun de `31005103975`;
- modificar requests consumidos;
- redeploy de Functions o Hosting por el modal;
- otro workflow visual;
- usuarios o memberships sintéticos;
- repetir los 18 escenarios;
- Rules, reimportación, producción, main o merge.

El Microbloque 2.6 de recaptura queda diferido y no bloqueante.

## 6. Bloque 3.0 — Ops/Leads durable

```text
Gate: OPS_LEADS_BACKEND_LAB_COMPLETE
Estado: PASS_REUSED_FUNCTIONAL_RUNTIME_AND_CURRENT_DEPLOY
```

Se cerró sin otra ejecución porque:

1. el runtime `30962756387` ya demostró Ops/Leads, scope propio del asesor, notificaciones y rollback exacto;
2. el run `31005103975` verificó las Functions desplegadas y la integridad del tenant;
3. al comparar `76377a4a95d9a834ac114e0654660a03c5f5046c` con el source HEAD desplegado `24b341483b6853269a125c60796f7b33edbfbb61`, ningún owner de Ops/Leads cambió;
4. `backend-lab-init.js` carga dinámicamente el cliente callable y el bridge durable con `opsLeadsDomainBackendActive: true`;
5. repetir la batería 18/18 no produciría evidencia nueva.

Owners cerrados:

```text
functions/ops-leads-domain.js
functions/ops-advisor-inbox.js
functions/bootstrap.js
orbit360-platform/core/ops-leads-domain-client.js
orbit360-platform/modules/ops-leads-domain-v20260804-bridge.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/ciclo.js
orbit360-platform/modules/ops.js
orbit360-platform/modules/leads.js
```

## 7. Bloque 4.0 — replay completo read-only de Cobros

```text
Gate: PASS_COBROS_FULL_REPLAY
Estado: ACTIVE_READ_ONLY
```

Punto de partida:

```text
pólizas activas: 224
pólizas con calendario: 223
recibos de calendario: 1,261
cartera pendiente: 641
vencido/exigible: 99
futuro: 542
pagos reportados: 365
sin pendiente según aseguradora: 211
HOLD de estado: 44
calendarios sustituidos: 20
cobros existentes: 5
```

Replay parcial preservado:

```text
secuencia de cartera: 128
posteriores al corte: 2
pendientes de overlay: 235
invariante: 128 + 2 + 235 = 365
```

Fuentes recuperadas sin pedir reenvío:

- workbook canónico privado de recibos/cartera;
- dry-run privado normalizado de planillas: 19 archivos, 10 paquetes, 67 filas, 65 elegibles CRM;
- 8 paquetes exactos;
- 1 planilla sin factura;
- 1 fuente incompleta;
- planilla detallada G&T julio: 8 filas;
- Aseguradora General julio: agregado sin detalle de póliza;
- factura El Roble julio: agregado sin detalle de póliza.

Regla de evidencia:

- las fuentes detalladas pueden cruzarse fila por fila;
- una factura o resumen agregado no autoriza aplicar cobros individuales;
- evidencia agregada sin detalle queda en HOLD explícito;
- se preservan los 128 casos de secuencia, los 2 posteriores al corte y los 5 cobros existentes;
- no se permite doble conteo.

Frontera:

```text
Firestore writes: 0
Auth writes: 0
cobros aplicados: 0
recibos modificados: 0
reimportación: 0
Functions/Hosting deploy: 0
Rules: no
producción/main/merge: no
```

## 8. Estado vivo

| Bloque | Gate | Estado |
|---|---|---|
| 1.0 | `PASS_PLAN_PERSISTED` | PASS |
| 1.1 | `PASS_CANONICAL_BASELINE` | PASS |
| 2.0 | `PASS_ISOLATED_ROUTE_HARNESS` | PASS |
| 2.1 | `GO_LAB_CANDIDATE_VISIBLE` | STOP_RETRY control plane |
| 2.2 | `PASS_CANONICAL_PREFLIGHT_COMPOSITION` | PASS |
| 2.3 | `GO_LAB_CANDIDATE_VISIBLE` | STOP_RETRY provenance |
| 2.4 | `PASS_REQUEST_V4_PROVENANCE_COMPOSITION` | PASS |
| 2.5 | `GO_LAB_CANDIDATE_VISIBLE` | GO técnico; revisión manual pendiente no bloqueante |
| 2.6 | `PASS_LEGAL_READINESS_CAPTURE_CONTRACT` | diferido no bloqueante |
| 3.0 | `OPS_LEADS_BACKEND_LAB_COMPLETE` | PASS |
| 4.0 | `PASS_COBROS_FULL_REPLAY` | activo read-only |
| 4.1 | `COBROS_REAL_LEDGER_COMPLETE` | pendiente autorización de escritura |
| 5.0 | `RC_ACCUMULATIVE_MODULES_COMPLETE` | pendiente |
| 6.0 | `RELEASE_CANDIDATE_ACCEPTED` | pendiente |
| 7.0 | `GO_PRODUCTION_A&S` | bloqueado hasta autorización |

## 9. Siguiente acción exacta

```text
BLOQUE 4.0
PASS_COBROS_FULL_REPLAY
```

Completar la clasificación fila por fila de los 365 pagos reportados usando el workbook canónico, las planillas normalizadas y la evidencia vigente. El resultado debe:

1. conservar 128 casos de secuencia;
2. conservar 2 casos posteriores al corte;
3. preservar 5 cobros existentes;
4. cruzar planillas detalladas sin duplicar;
5. dejar resúmenes agregados sin detalle en HOLD;
6. explicar los 365 pagos mediante categorías exhaustivas;
7. producir únicamente ledger sanitizado y digests;
8. mantener cero escrituras.

Solo después del PASS se prepara el Bloque 4.1 de materialización durable, que requiere autorización explícita separada.

## 10. Regla de actualización

Cada iteración actualiza avance, fuente, implementación, evidencia, gate, estado, ledger, plan, Academia, acumulado Claude y PR. No se reabre una auditoría general ni se convierte un problema del capturador en bloqueo artificial del producto.
