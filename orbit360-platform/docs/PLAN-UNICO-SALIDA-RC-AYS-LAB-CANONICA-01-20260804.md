# PLAN ÚNICO DE SALIDA — RC-AYS-LAB-CANONICA-01

Fecha de adopción: 2026-08-04  
Última actualización: 2026-08-05 06:24 GT  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Baseline funcional congelado: `548cffa50cddfd93ad2118f5a06e9bb420699bde`  
Producción, `main` y merge: no autorizados

## 1. Carácter vinculante

Este documento, el ledger vivo, el estado activo y la evidencia del gate rigen una sola candidata acumulativa A&S. Ninguna conversación sustituye estas fuentes.

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

### Arnés aislado

```text
run: 30971707956
rutas: 8/8
mecanismo: ONE_ISOLATED_BROWSER_CONTEXT_AND_DIRECT_URL_PER_ROUTE
```

### Composición canónica

```text
run: 30977179448
integrado: 31/31 PASS
inner preflight: 32/32 PASS
```

### Request v4 y provenance

```text
run: 30979519198
continuidad/provenance: 33/33 PASS
inner preflight: 32/32 PASS
outer router exit: 0
inner engine reached: true
```

Demostrado: baseline presente, ancestro del parent HEAD, producto idéntico al baseline y requests anteriores inmutables.

## 4. Historia de visualización LAB

### Microbloque 2.1

```text
Estado: STOP_RETRY_DEFINITIVE_CONTROL_PLANE
runs: 30974443335 y 30974745085
URL: no
```

Causa: lifecycle/harness mezclados y evidencia con contador literal. Resuelta en 2.2.

### Microbloque 2.2

```text
Estado: PASS_CANONICAL_PREFLIGHT_COMPOSITION
run: 30977179448
```

### Microbloque 2.3

```text
Estado: STOP_RETRY_DEFINITIVE_BASELINE_PROVENANCE
run: 30977831814
URL: no
```

Causa: checkout superficial sin el baseline congelado. Root fix:

```text
fetch-depth: 0
git cat-file -e "$ORBIT360_SOURCE_BASELINE^{commit}"
```

### Microbloque 2.4

```text
Estado: PASS_REQUEST_V4_PROVENANCE_COMPOSITION
run: 30979519198
runtime: no
```

### Microbloque 2.5

```text
run: 31005103975
job: 92302991333
workflow: success
preflight: 32/32 PASS
Functions: 4/4
Hosting: PASS y retenido
integridad: PASS
visual exit: 0
integridad exit: 0
snapshot before/after: idénticos
```

URL retenida:

```text
https://ays-orbit-360-lab--orbit360-operational-block12-w8ibrr6w.web.app
```

Decisiones separadas:

```text
Técnica: GO_LAB_CANDIDATE_VISIBLE
Final tras revisión manual: STOP_VISUAL_EVIDENCE_PREVIEW_RETAINED
```

Las ocho capturas mostraron el modal `Acuerdos legales` y no el contenido de Cliente 360, Aseguradoras, Pólizas, Cobros, Conciliaciones, Ops, Leads e Importar.

Clasificación:

```text
PIPELINE_MECHANISM_FAILURE
secundaria: VALIDATOR_STALE
```

Owner:

```text
tools/orbit360-block12-cumulative-visual-v20260804.mjs
```

El arnés validaba URL, autenticación, bytes y errores, pero no detectaba overlays bloqueantes. El root fix source-only quedó en:

```text
6c443d0f40e6874675f8c1980ef0cdb353120031
```

Ahora un modal legal bloqueante genera:

```text
PIPELINE_MECHANISM_FAILURE:ROUTE_<route>_LEGAL_MODAL_BLOCKING_CAPTURE
```

## 5. Frontera vigente

La URL, las cuatro Functions y el Hosting quedan retenidos. No se redepliegan para resolver un fallo exclusivo de captura.

Quedan prohibidos:

- rerun de `31005103975`;
- modificar el request runtime v4 consumido;
- redeploy de Functions o Hosting para la recaptura;
- otro workflow visual;
- crear usuarios o memberships sintéticos;
- tocar producto o datos para ocultar el modal;
- marcar una aceptación legal ficticia;
- repetir los 18 escenarios;
- Rules, reimportación, producción, main o merge.

## 6. Estado vivo

| Microbloque | Gate | Estado |
|---|---|---|
| 1.0 | `PASS_PLAN_PERSISTED` | PASS |
| 1.1 | `PASS_CANONICAL_BASELINE` | PASS |
| 2.0 | `PASS_ISOLATED_ROUTE_HARNESS` | PASS |
| 2.1 | `GO_LAB_CANDIDATE_VISIBLE` | STOP_RETRY control plane |
| 2.2 | `PASS_CANONICAL_PREFLIGHT_COMPOSITION` | PASS |
| 2.3 | `GO_LAB_CANDIDATE_VISIBLE` | STOP_RETRY provenance |
| 2.4 | `PASS_REQUEST_V4_PROVENANCE_COMPOSITION` | PASS |
| 2.5 | `GO_LAB_CANDIDATE_VISIBLE` | STOP visual; preview retenido |
| 2.6 | `PASS_LEGAL_READINESS_CAPTURE_CONTRACT` | pendiente autorización source-only |
| 3.0 | `OPS_LEADS_BACKEND_LAB_COMPLETE` | pendiente después de aprobación visual |
| 4.0 | `PASS_COBROS_FULL_REPLAY` | pendiente |
| 4.1 | `COBROS_REAL_LEDGER_COMPLETE` | pendiente |
| 5.0 | `RC_ACCUMULATIVE_MODULES_COMPLETE` | pendiente |
| 6.0 | `RELEASE_CANDIDATE_ACCEPTED` | pendiente |
| 7.0 | `GO_PRODUCTION_A&S` | bloqueado hasta autorización |

## 7. Siguiente acción exacta

Microbloque 2.6:

```text
PASS_LEGAL_READINESS_CAPTURE_CONTRACT
SOURCE_ONLY
```

Debe definir y validar:

1. owner canónico del estado legal;
2. presentación una sola vez;
3. cero hardcode de usuario, tenant o aceptación;
4. identidad visual lista sin escrituras reales de tenant ni Auth;
5. detección de overlays antes de aceptar evidencia;
6. reutilización de la URL retenida;
7. siguiente ejecución limitada a navegador;
8. prohibición de redeploy de Functions y Hosting.

Frontera 2.6:

```text
secretos: no
Firebase/Firestore/Auth: no
Functions/Hosting: no
navegador: no
deploy: no
Rules/reimportación: no
producción/main/merge: no
replay 18/18: no
```

Solo después de un PASS source-only podrá solicitarse una autorización nueva para recaptura exclusivamente de navegador contra la URL retenida.

## 8. Continuidad posterior

Después de obtener frames aprobables:

1. revisión visual Dirección/Operativo/Asesor;
2. cierre Ops/Leads durable;
3. replay completo read-only de Cobros;
4. materialización durable;
5. integración acumulativa;
6. release candidate;
7. go-live autorizado.

## 9. Regla de actualización

Cada iteración actualiza avance, fuente, implementación, evidencia, gate, estado, ledger, plan, Academia, acumulado Claude y PR. No se reabre una auditoría general ni se normaliza un falso GO visual.
