# PLAN ÚNICO DE SALIDA — RC-AYS-LAB-CANONICA-01

Fecha de adopción: 2026-08-04  
Última actualización: 2026-08-04 23:08 GT  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Baseline funcional congelado: `548cffa50cddfd93ad2118f5a06e9bb420699bde`  
Producción, `main` y merge: no autorizados

## 1. Carácter vinculante

Este documento es el plan rector para cerrar una sola candidata acumulativa A&S. Se aplica junto con el ledger vivo, el estado activo y la evidencia más reciente del gate.

Precedencia:

1. fuentes maestras y addenda vigentes;
2. este plan;
3. `rc-ays-lab-canonica-01-ledger-v20260804.json`;
4. HEAD de la rama obligatoria;
5. evidencia del gate activo.

Ninguna conversación, candidata, workflow o documento histórico sustituye estas fuentes.

## 2. Objetivo final

Cerrar y presentar:

```text
RC-AYS-LAB-CANONICA-01
```

Debe integrar Cliente 360, Aseguradoras, Pólizas, Vehículos, Recibos, Cartera, Cobros, Conciliaciones, Comisiones, Equipo/onboarding, Ops, Leads, importador recurrente, Auth, memberships, multirol y scopes configurables.

## 3. Hechos cerrados que no se reabren

### 3.1 Runtime funcional

```text
run: 30962756387
PASS: 18
FAIL: 0
```

Incluye Ops/Leads, scopes, notificaciones, importación recurrente, Cobros/Conciliación sintético, rollback exacto y snapshot real A&S idéntico. No se repite sin cambio funcional de owner.

### 3.2 Baseline canónico

```text
PASS_CANONICAL_BASELINE
clientes: 430
aseguradoras: 30
pólizas: 1,375
vehículos: 1,033
recibos: 1,294
cartera: 673
cobros: 7
reimportación requerida: no
pérdida observada: no
```

Owners fundacionales:

```text
Router       → core/router.js
Access       → core/access-scope.js
Cliente 360  → modules/cliente360.js
Aseguradoras → modules/aseguradoras.js
```

### 3.3 Arnés aislado

```text
PASS_ISOLATED_ROUTE_HARNESS
run: 30971707956
rutas: 8/8
mecanismo: ONE_ISOLATED_BROWSER_CONTEXT_AND_DIRECT_URL_PER_ROUTE
```

No se vuelve a navegación hash acumulativa ni se crea otro workflow visual paralelo.

### 3.4 Composición canónica del preflight

```text
PASS_CANONICAL_PREFLIGHT_COMPOSITION
run final: 30977179448
integrated checks: 31/31
inner preflight: 32/32
outer router exit: 0
inner engine reached: true
```

Contrato corregido:

```text
validatorLifecycleRevision = phase-capability-contract-v1
visualHarnessRevision = isolated-context-direct-url-v6
controlPlaneRevision = canonical-preflight-composition-source-only-v1
```

El builder de evidencia usa outputs observados. El workflow runtime existente quedó preparado para un futuro request v3 y permanece inerte porque ese request no existe.

### 3.5 Cobros reales

```text
pagos reportados: 365
cartera pendiente: 641
exigible/vencido: 99
futuro: 542
HOLD: 44
confirmados materializados en corte source-only: 5
```

Cinco cobros no representan el universo completo.

## 4. Historial del Microbloque 2.1

```text
Gate: GO_LAB_CANDIDATE_VISIBLE
Estado: STOP_RETRY_DEFINITIVE_CONTROL_PLANE
Autorización: consumida
URL LAB: no producida
```

Intentos autorizados:

```text
30974443335 → VALIDATOR_STALE · REQUEST_ACTIVE / VIDEO_LAYOUTFREE_HARNESS
30974745085 → VALIDATOR_STALE · CANONICAL_LIFECYCLE_REVISION_MISMATCH
```

Ambos se detuvieron antes de secretos, Firebase, Functions, Hosting y navegador.

Incidente administrativo:

```text
30975037529 → request consumido rechazado antes del preflight
```

El request anterior permanece consumido e inmutable. Su consumo vive en el ledger, no mediante nuevas modificaciones del path disparador.

## 5. Solución de raíz aplicada en Microbloque 2.2

Se separaron:

- composición canónica del lifecycle;
- revisión del arnés visual;
- request de autorización;
- ledger de consumo;
- evidencia observada;
- política de retención.

Se validaron conjuntamente outer router, lifecycle e inner engine, con todas las capacidades operativas forzadas a cero.

```text
runtime: no
secretos: no
Firebase: no
browser: no
deploy: no
Rules: no
reimportación: no
producción/main/merge: no
```

## 6. Secuencia y estado vivo

| Microbloque | Gate | Estado |
|---|---|---|
| 1.0 Plan y ledger | `PASS_PLAN_PERSISTED` | PASS |
| 1.1 Baseline/owners/conteos | `PASS_CANONICAL_BASELINE` | PASS |
| 2.0 Arnés sintético aislado | `PASS_ISOLATED_ROUTE_HARNESS` | PASS |
| 2.1 Visual LAB retenida | `GO_LAB_CANDIDATE_VISIBLE` | STOP_RETRY histórico; autorización consumida |
| 2.2 Composición canónica source-only | `PASS_CANONICAL_PREFLIGHT_COMPOSITION` | PASS |
| 2.3 Visual LAB retenida con request v3 | `GO_LAB_CANDIDATE_VISIBLE` | listo; espera autorización explícita nueva |
| 3.0 Ops/Leads durable | `OPS_LEADS_BACKEND_LAB_COMPLETE` | pendiente después de 2.3 |
| 4.0 Replay Cobros read-only | `PASS_COBROS_FULL_REPLAY` | pendiente |
| 4.1 Materialización Cobros | `COBROS_REAL_LEDGER_COMPLETE` | pendiente |
| 5.0 Integración acumulativa | `RC_ACCUMULATIVE_MODULES_COMPLETE` | pendiente |
| 6.0 Revisión visual | `RELEASE_CANDIDATE_ACCEPTED` | pendiente |
| 7.0 Go-live | `GO_PRODUCTION_A&S` | bloqueado hasta autorización productiva |

## 7. Microbloque activo: 2.3

```text
Gate: GO_LAB_CANDIDATE_VISIBLE
Estado: READY_AWAITING_NEW_EXPLICIT_LAB_DEPLOY_AUTHORIZATION
```

Workflow existente:

```text
.github/workflows/orbit360-block12-visual-layoutfree-reactivation-lab-v20260804.yml
```

Request futuro:

```text
.github/orbit360-requests/block12-go-lab-candidate-visible-v3.json
```

El request v3 no existe y no se crea sin autorización explícita nueva.

Alcance exacto autorizable:

1. preflight canónico antes de secretos;
2. cuatro Functions LAB allowlisted;
3. un único Hosting preview LAB retenido;
4. snapshot A&S before;
5. ocho rutas mediante contextos aislados y URLs directas;
6. snapshot A&S after;
7. before/after idénticos y cero escrituras;
8. evidencia desde outputs observados;
9. retener URL si producto e integridad pasan;
10. no repetir los 18 escenarios funcionales.

Prohibiciones:

- Rules;
- reimportación;
- escrituras reales;
- producción;
- `main`;
- merge;
- workflow visual nuevo;
- navegación hash acumulativa;
- modificación del request consumido anterior.

## 8. Continuidad posterior obligatoria

Después de obtener una URL LAB retenida:

1. cerrar Ops/Leads durable y conectado a UI real;
2. ejecutar replay completo read-only de los 365 pagos;
3. sellar diff crear/actualizar/omitir/HOLD/requiere validación;
4. materializar colecciones correctas con atomicidad e idempotencia;
5. integrar módulos aprobados sobre la misma RC;
6. presentar revisión Dirección/Operativo/Asesor;
7. solicitar una autorización productiva macro.

No se abre un bloque periférico entre estas etapas.

## 9. Regla de actualización

Cada iteración actualiza simultáneamente:

- avance visible;
- fuente/base;
- implementación o evidencia;
- gate y estado;
- ledger;
- plan;
- estado activo;
- PR;
- Academia;
- acumulado Claude cuando aplica.

No se abre una auditoría general ni se toca otro módulo para evitar el siguiente paso exacto.
