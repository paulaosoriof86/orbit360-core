# PLAN ÚNICO DE SALIDA — RC-AYS-LAB-CANONICA-01

Fecha de adopción: 2026-08-04  
Última actualización: 2026-08-04 22:18 GT  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Baseline funcional congelado: `548cffa50cddfd93ad2118f5a06e9bb420699bde`  
Producción, `main` y merge: no autorizados

## 1. Carácter vinculante

Este documento es el plan operativo rector para cerrar una sola candidata acumulativa A&S. Se aplica junto con el ledger vivo, el estado vigente del microbloque y la evidencia reciente. Ninguna conversación o workflow sustituye estas fuentes.

Precedencia:

1. fuentes maestras y addenda vigentes;
2. este plan;
3. `rc-ays-lab-canonica-01-ledger-v20260804.json`;
4. HEAD de la rama obligatoria;
5. evidencia del gate activo.

## 2. Objetivo final

Cerrar y presentar:

```text
RC-AYS-LAB-CANONICA-01
```

Debe integrar Cliente 360, Aseguradoras, Pólizas, Vehículos, Recibos, Cartera, Cobros, Conciliaciones, Comisiones, Equipo/onboarding, Ops, Leads, importador recurrente, Auth, memberships, multirol y scopes configurables.

## 3. Hechos cerrados que no se reabren

### Runtime funcional

```text
run: 30962756387
PASS: 18
FAIL: 0
```

Incluye Ops/Leads, scopes, notificaciones, importación recurrente, Cobros/Conciliación sintético, rollback exacto y snapshot real A&S idéntico. No se repite sin cambio funcional de owner.

### Baseline canónico

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

### Arnés aislado

```text
PASS_ISOLATED_ROUTE_HARNESS
run: 30971707956
rutas: 8/8
mecanismo: ONE_ISOLATED_BROWSER_CONTEXT_AND_DIRECT_URL_PER_ROUTE
```

No se vuelve a navegación hash acumulativa ni se crea otro workflow visual paralelo.

### Cobros reales

```text
pagos reportados: 365
cartera pendiente: 641
exigible/vencido: 99
futuro: 542
HOLD: 44
confirmados materializados en corte source-only: 5
```

Cinco cobros no representan el universo completo.

## 4. Estado del Microbloque 2.1

```text
Gate: GO_LAB_CANDIDATE_VISIBLE
Estado: STOP_RETRY_DEFINITIVE_CONTROL_PLANE
Autorización: consumida
URL LAB: no producida
```

### Intento 1

```text
run: 30974443335
VALIDATOR_STALE
REQUEST_ACTIVE
VIDEO_LAYOUTFREE_HARNESS
```

Se detuvo antes de secretos, Firebase, Functions, Hosting y navegador.

### Intento 2

```text
run: 30974745085
VALIDATOR_STALE
CANONICAL_PREFLIGHT_ENTRYPOINT
CANONICAL_LIFECYCLE_REVISION_MISMATCH
```

También se detuvo antes de secretos, Firebase, Functions, Hosting y navegador.

### Causa raíz definitiva

Clasificación:

```text
VALIDATOR_STALE
PIPELINE_MECHANISM_FAILURE
```

Owner:

```text
tools/orbit360-validar-gate-contracts-v20260717.mjs
```

El outer router exige `validatorLifecycleRevision = phase-capability-contract-v1`. La versión del arnés `isolated-context-direct-url-v6` fue colocada en ese campo y sustituyó erróneamente la composición canónica. El inner engine corregido no llegó a ejecutarse.

No se demostró defecto funcional, pérdida de datos o fallo de las cuatro Functions.

### Hallazgo de evidencia

El JSON consolidado escribió un literal `functionsVerified: 4`, aunque el job real registró `0/4` y nunca alcanzó deploy. Ese campo queda invalidado y debe corregirse en el futuro rediseño source-only.

## 5. STOP_RETRY obligatorio

Tras dos fallos en la misma etapa quedan prohibidos:

- tercer request;
- tercer run;
- otro parche de emergencia a esta familia;
- otro workflow visual;
- tocar producto, módulos o datos;
- acceder a secretos;
- desplegar Functions o Hosting bajo esta autorización;
- repetir los 18 escenarios.

La candidata y el baseline quedan congelados e intactos.

## 6. Secuencia y estado vivo

| Microbloque | Gate | Estado |
|---|---|---|
| 1.0 Plan y ledger | `PASS_PLAN_PERSISTED` | PASS |
| 1.1 Baseline/owners/conteos | `PASS_CANONICAL_BASELINE` | PASS |
| 2.0 Arnés sintético aislado | `PASS_ISOLATED_ROUTE_HARNESS` | PASS |
| 2.1 Visual LAB retenida | `GO_LAB_CANDIDATE_VISIBLE` | STOP_RETRY definitivo |
| 2.2 Rediseño source-only del control plane | `PASS_CANONICAL_PREFLIGHT_COMPOSITION` | siguiente, sin runtime |
| 3.0 Ops/Leads durable | `OPS_LEADS_BACKEND_LAB_COMPLETE` | bloqueado por 2.1 |
| 4.0 Replay Cobros read-only | `PASS_COBROS_FULL_REPLAY` | pendiente después de control plane |
| 4.1 Materialización Cobros | `COBROS_REAL_LEDGER_COMPLETE` | pendiente |
| 5.0 Integración acumulativa | `RC_ACCUMULATIVE_MODULES_COMPLETE` | pendiente |
| 6.0 Revisión visual | `RELEASE_CANDIDATE_ACCEPTED` | pendiente |
| 7.0 Go-live | `GO_PRODUCTION_A&S` | bloqueado hasta autorización |

## 7. Siguiente acción exacta: Microbloque 2.2 source-only

```text
NO_EJECUTAR_RUNTIME
PASS_CANONICAL_PREFLIGHT_COMPOSITION
```

Objetivo:

1. conservar `validatorLifecycleRevision = phase-capability-contract-v1`;
2. declarar `visualHarnessRevision = isolated-context-direct-url-v6` por separado;
3. sincronizar router, lifecycle, registro, engine, workflow y request conceptualmente;
4. probar outer router + inner engine como una unidad;
5. comprobar que el JSON de decisión use outputs reales y no literales;
6. emitir evidencia estática sin secretos, Firebase, navegador o deploy.

Este rediseño no autoriza ejecución LAB. Solo después de un PASS estático integrado podrá solicitarse una autorización explícita nueva para una futura visualización.

## 8. Continuidad posterior

Después de resolver el control plane y obtener una nueva autorización:

1. entregar una URL LAB retenida;
2. cerrar Ops/Leads durable;
3. ejecutar replay completo read-only de Cobros;
4. materializar las colecciones correctas con atomicidad e idempotencia;
5. integrar módulos aprobados sobre la misma RC;
6. presentar revisión Dirección/Operativo/Asesor;
7. solicitar autorización productiva macro.

## 9. Regla de actualización

Cada iteración debe actualizar simultáneamente avance, fuente, evidencia, gate, estado, ledger, plan y PR. No se abre una auditoría general ni un bloque periférico para evitar el siguiente paso exacto.
