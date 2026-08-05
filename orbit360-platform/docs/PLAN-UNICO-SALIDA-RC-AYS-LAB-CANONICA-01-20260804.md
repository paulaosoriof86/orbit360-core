# PLAN ÚNICO DE SALIDA — RC-AYS-LAB-CANONICA-01

Fecha de adopción: 2026-08-04  
Última actualización: 2026-08-04 23:23 GT  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Baseline funcional congelado: `548cffa50cddfd93ad2118f5a06e9bb420699bde`  
Producción, `main` y merge: no autorizados

## 1. Carácter vinculante

Este documento es el plan rector para cerrar una sola candidata acumulativa A&S. Se aplica junto con el ledger vivo, el estado activo y la evidencia del gate. Ninguna conversación o workflow sustituye estas fuentes.

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

### Composición canónica

```text
PASS_CANONICAL_PREFLIGHT_COMPOSITION
run: 30977179448
integrado: 31/31
inner preflight: 32/32
```

Contrato vigente:

```text
validatorLifecycleRevision = phase-capability-contract-v1
visualHarnessRevision = isolated-context-direct-url-v6
controlPlaneRevision = canonical-preflight-composition-source-only-v1
```

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

## 4. Historia de visualización LAB

### Microbloque 2.1

```text
Estado: STOP_RETRY_DEFINITIVE_CONTROL_PLANE
runs autorizados: 30974443335 y 30974745085
URL LAB: no
```

Causa cerrada: composición lifecycle/harness mezclada y evidencia con contador literal. Resuelta en el Microbloque 2.2.

### Microbloque 2.2

```text
Estado: PASS_CANONICAL_PREFLIGHT_COMPOSITION
run final: 30977179448
```

### Microbloque 2.3

```text
run: 30977831814
Estado: STOP_RETRY_DEFINITIVE_BASELINE_PROVENANCE
URL LAB: no
```

Primera etapa fallida:

```text
REQUEST_BASELINE_PROVENANCE_BEFORE_CANONICAL_PREFLIGHT
```

Error:

```text
fatal: Invalid revision range 548cffa50cddfd93ad2118f5a06e9bb420699bde..HEAD^
```

Clasificación y owner:

```text
PIPELINE_MECHANISM_FAILURE
.github/workflows/orbit360-block12-visual-layoutfree-reactivation-lab-v20260804.yml
```

El checkout usó `fetch-depth: 80`; el baseline congelado estaba fuera del historial disponible. No se ejecutaron preflight, secretos, Firebase, Functions, Hosting, navegador o snapshots.

`0/4 Functions` significa `no ejecutado`, no fallo de Functions.

## 5. Root fix de provenance

Aplicado source-only en:

```text
ed655ef5221cf84c5930ba4ce07da586a6fca64f
```

Contrato corregido:

```text
fetch-depth: 0
git cat-file -e "$ORBIT360_SOURCE_BASELINE^{commit}"
git diff --quiet "$ORBIT360_SOURCE_BASELINE"..HEAD^
```

La corrección usa el workflow existente, no creó una variante y no disparó otro runtime.

## 6. STOP_RETRY obligatorio

Quedan prohibidos:

- rerun del run `30977831814`;
- modificación del request v3 consumido;
- otra ejecución runtime sin autorización explícita nueva;
- otro workflow visual;
- tocar producto o datos para resolver provenance;
- repetir los 18 escenarios funcionales;
- Rules, reimportación, producción, main o merge.

La candidata y los datos permanecen congelados e intactos.

## 7. Secuencia y estado vivo

| Microbloque | Gate | Estado |
|---|---|---|
| 1.0 Plan y ledger | `PASS_PLAN_PERSISTED` | PASS |
| 1.1 Baseline/owners/conteos | `PASS_CANONICAL_BASELINE` | PASS |
| 2.0 Arnés sintético aislado | `PASS_ISOLATED_ROUTE_HARNESS` | PASS |
| 2.1 Visual LAB | `GO_LAB_CANDIDATE_VISIBLE` | STOP_RETRY control plane |
| 2.2 Composición canónica source-only | `PASS_CANONICAL_PREFLIGHT_COMPOSITION` | PASS |
| 2.3 Visual LAB request v3 | `GO_LAB_CANDIDATE_VISIBLE` | STOP_RETRY provenance |
| 3.0 Ops/Leads durable | `OPS_LEADS_BACKEND_LAB_COMPLETE` | pendiente después de visualización |
| 4.0 Replay Cobros read-only | `PASS_COBROS_FULL_REPLAY` | pendiente |
| 4.1 Materialización Cobros | `COBROS_REAL_LEDGER_COMPLETE` | pendiente |
| 5.0 Integración acumulativa | `RC_ACCUMULATIVE_MODULES_COMPLETE` | pendiente |
| 6.0 Revisión visual | `RELEASE_CANDIDATE_ACCEPTED` | pendiente |
| 7.0 Go-live | `GO_PRODUCTION_A&S` | bloqueado hasta autorización |

## 8. Siguiente acción exacta

```text
NO_RERUN_MICROBLOQUE_2_3
PREPARAR_NUEVO_REQUEST_SOURCE_ONLY
```

Antes de una nueva autorización:

1. conservar el root fix de checkout completo;
2. preparar un nuevo path de request, sin modificar el v3 consumido;
3. vincularlo al HEAD vigente;
4. sincronizar workflow existente, lifecycle, ledger y request;
5. validar source-only request + provenance + outer router + inner engine;
6. demostrar cero secretos, Firebase, deploy y navegador;
7. solicitar una única autorización LAB nueva solo después del PASS source-only.

La futura ejecución mantendrá:

- preflight antes de secretos;
- cuatro Functions allowlisted;
- un Hosting preview retenido;
- ocho rutas aisladas/directas;
- snapshots before/after idénticos;
- cero escrituras;
- sin repetir los 18 escenarios.

## 9. Continuidad posterior

Después de obtener una URL LAB retenida:

1. revisión manual de frames;
2. cierre Ops/Leads durable;
3. replay completo read-only de Cobros;
4. materialización durable con atomicidad e idempotencia;
5. integración acumulativa de módulos aprobados;
6. revisión Dirección/Operativo/Asesor;
7. autorización productiva macro.

## 10. Regla de actualización

Cada iteración actualiza simultáneamente avance, fuente, evidencia, gate, estado, ledger, plan, Academia, acumulado Claude y PR. No se abre una auditoría general ni un bloque periférico para evitar la siguiente acción exacta.
