# PLAN ÚNICO DE SALIDA — RC-AYS-LAB-CANONICA-01

Fecha de adopción: 2026-08-04  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Baseline funcional congelado: `548cffa50cddfd93ad2118f5a06e9bb420699bde`  
Producción, `main` y merge: no autorizados

## 1. Carácter vinculante

Este documento es el plan operativo rector para cerrar la primera candidata única, acumulativa y verificable de A&S. No crea un plan paralelo ni reemplaza las fuentes maestras. Las aplica y convierte en una secuencia ejecutable con gates de salida.

Precedencia:

1. fuentes maestras y addenda vigentes;
2. este plan único de salida;
3. ledger vivo `rc-ays-lab-canonica-01-ledger-v20260804.json`;
4. HEAD incremental de la rama obligatoria;
5. evidencia reciente del microbloque activo.

Una conversación, comentario, workflow o candidata posterior no puede alterar este orden sin una decisión explícita documentada, causa raíz y actualización conjunta de este plan y del ledger.

## 2. Objetivo final invariable

Cerrar y presentar una sola candidata:

```text
RC-AYS-LAB-CANONICA-01
```

Debe integrar, sobre la mejor versión aprobada y sin reemplazo total:

- Cliente 360;
- Aseguradoras;
- Pólizas;
- Vehículos;
- Recibos;
- Cartera;
- Cobros;
- Conciliaciones;
- Comisiones;
- Equipo/onboarding;
- Ops;
- Leads;
- importador recurrente;
- Auth, memberships, multirol y scopes configurables por tenant.

La salida final del plan es una release candidate aprobada visualmente y preparada para una única autorización productiva macro. El rebranding GRAVICENTRA, nuevas integraciones y mejoras cosméticas no bloqueantes quedan fuera de la ruta crítica.

## 3. Hechos cerrados que no se reabren

### 3.1 Runtime funcional

El run LAB `30962756387` cerró:

- 18 escenarios PASS / 0 FAIL;
- Ops/Leads PASS;
- scopes de Asesor PASS;
- notificaciones PASS;
- importación recurrente PASS;
- Cobros/Conciliación sintético PASS;
- rollback sintético exacto;
- snapshot real A&S before/after idéntico.

No se repite esa batería salvo cambio funcional posterior en sus owners.

### 3.2 Causa raíz visual vigente

El último fallo demostrado pertenece al instrumento de validación:

```text
PIPELINE_MECHANISM_FAILURE
ROUTE_ASEGURADORAS_NAVIGATION_TIMEOUT
```

Owner: navegación por hash dentro de una SPA mantenida en una sola sesión.

Mecanismo reemplazante único:

```text
ONE_ISOLATED_BROWSER_CONTEXT_AND_DIRECT_URL_PER_ROUTE
```

No se vuelven a crear variantes basadas en `fullPage`, layout probes, CDP, hash navigation acumulativa o workflows visuales paralelos.

### 3.3 Cobros reales

El universo preservado es:

```text
pólizas vigentes: 224
pólizas con calendario: 223
recibos calendario: 1,261
cartera pendiente: 641
exigible/vencido: 99
futuro: 542
pagos reportados: 365
sin saldo pendiente según aseguradora: 211
HOLD: 44
programaciones superadas/excluidas: 20
cobros confirmados materializados en el corte source-only: 5
```

Cinco cobros escritos nunca vuelven a presentarse como el universo completo. Los 365 pagos reportados deben clasificarse y materializarse en sus colecciones correctas.

## 4. Soluciones de raíz obligatorias

### 4.1 Candidata inmutable

Se separan tres conceptos:

- `sourceBaseline`: commit funcional congelado;
- `documentationHead`: commits documentales y de control;
- `candidateHead`: commit acumulativo que solo avanza mediante microbloques cerrados.

Nunca se reemplaza una candidata por otra para corregir un validador. El validador se corrige contra la misma candidata.

### 4.2 Producto separado del instrumento de evidencia

Un fallo exclusivo de captura no invalida ni elimina automáticamente una candidata cuyo runtime, autenticación e integridad pasaron.

El preview o las Functions solo se retiran automáticamente por:

- `SECURITY_FAILURE`;
- `FUNCTIONAL_DEFECT` demostrado;
- cross-tenant;
- escritura no autorizada;
- snapshot before/after distinto;
- rollback fallido.

### 4.3 Datos separados de visualización

No se reimportan Clientes, Aseguradoras, Pólizas, Vehículos, Recibos o Cartera para resolver navegación, cache, permisos, proyección o capturas.

### 4.4 Un solo owner y un solo gate por cierre

Cada ruta, dominio y gate debe tener un propietario único. Si cambia owner, bootstrap, ruta, selector o bridge, se actualizan juntos código, registro, preflight, workflow, documentación, Claude y Academia.

### 4.5 STOP_RETRY real

Si reaparece la misma etapa o familia de fallo:

```text
STOP_RETRY
```

Acciones obligatorias:

1. detener reintentos;
2. no crear otro workflow, parche, gate o candidata;
3. clasificar la causa;
4. identificar owner exacto;
5. reproducir fuera de riesgo cuando sea posible;
6. corregir el mecanismo reusable;
7. probar estática/sintéticamente;
8. reabrir una sola ejecución sobre la misma candidata.

## 5. Contrato anti-descarrilamiento por iteración

Toda iteración debe dejar simultáneamente:

1. microbloque activo;
2. source/base exacta;
3. cambio implementado;
4. evidencia;
5. clasificación;
6. gate y resultado;
7. estado del candidato;
8. impacto Carril A/B/C;
9. acumulado Claude;
10. impacto Academia;
11. pendiente único;
12. siguiente acción exacta.

Si una iteración no actualiza el ledger o no deja avance verificable, no puede abrir el siguiente microbloque.

No se permite:

- una nueva auditoría general sin insumo nuevo;
- repetir pruebas ya cerradas;
- cambiar de rama;
- crear otro PR;
- crear una candidata paralela;
- pedir PowerShell o pruebas manuales a Paula;
- mezclar rebranding con la ruta crítica;
- afirmar producción o visualización aprobada sin evidencia.

## 6. Secuencia inalterable de macrobloques y gates

### MACROBLOQUE 1 — Baseline canónico y control

#### Microbloque 1.0 — Plan y ledger

- documentar este plan;
- crear ledger machine-readable;
- congelar `sourceBaseline`;
- actualizar estado vivo del PR;
- registrar que no hubo deploy, secretos, Firebase ni escrituras.

Gate:

```text
PASS_PLAN_PERSISTED
```

#### Microbloque 1.1 — Reconciliación forense focalizada

Resolver únicamente:

- owners activos por módulo/ruta;
- scripts realmente cargados por `index.html`;
- bridges activos, obsoletos o duplicados;
- diferencia entre baseline histórico 414/26 y conteos observados posteriores;
- mejor versión aceptada de cada módulo;
- contradicción documental entre runtime 18/18 PASS y cuerpo antiguo del PR.

No ejecuta Firebase ni cambia datos.

Gate:

```text
PASS_CANONICAL_BASELINE
```

### MACROBLOQUE 2 — Visualización canónica retenida

#### Microbloque 2.0 — Validador sintético aislado

- ejecutar preflight contractual sin secretos;
- ejecutar las ocho rutas en contextos aislados y URL directa;
- comprobar ausencia de mecanismos prohibidos.

Gate:

```text
PASS_ISOLATED_ROUTE_HARNESS
```

#### Microbloque 2.1 — Visual LAB read-only

- desplegar únicamente cuatro Functions allowlisted y un Hosting preview;
- snapshot A&S before;
- autenticar identidades existentes;
- verificar rutas directas;
- snapshot A&S after idéntico;
- cero escrituras y cero reimportación;
- retener URL si producto e integridad pasan.

Gate:

```text
GO_LAB_CANDIDATE_VISIBLE
```

### MACROBLOQUE 3 — Backend Ops/Leads durable

- conservar Functions versionadas después del PASS;
- verificar configuración por tenant, idempotencia, event ledger, outbox, scopes y resolución durable;
- usar registros sintéticos reversibles;
- cero hardcode de personas.

Gate:

```text
OPS_LEADS_BACKEND_LAB_COMPLETE
```

### MACROBLOQUE 4 — Cobros y conciliaciones reales

#### Microbloque 4.0 — Replay completo read-only

Clasificar los 365 pagos como:

- vinculado directo;
- propuesta;
- HOLD;
- requiere validación;
- sin contraparte;
- duplicado por hash.

Gate:

```text
PASS_COBROS_FULL_REPLAY
```

#### Microbloque 4.1 — Gate de materialización durable

Escribir únicamente con diff, idempotencia, operación atómica, postverificación y rollback exacto:

- `pagosReportados`;
- `evidenciasCobro`;
- `propuestasConciliacion`;
- `conciliacionHolds`;
- `cobros`, solo confirmados.

Gate:

```text
COBROS_REAL_LEDGER_COMPLETE
```

### MACROBLOQUE 5 — Integración de módulos aprobados

- comparar cada módulo contra su última evidencia aprobada;
- empalmar solo deltas concretos;
- retirar duplicidades;
- conservar backend protegido;
- registrar hash por módulo.

Gate:

```text
RC_ACCUMULATIVE_MODULES_COMPLETE
```

### MACROBLOQUE 6 — Revisión visual acumulativa

Roles/viewports mínimos:

- Dirección desktop;
- Operativo tablet;
- Asesor móvil.

Gate:

```text
PAULA_VISUAL_APPROVAL
RELEASE_CANDIDATE_ACCEPTED
```

### MACROBLOQUE 7 — Producción

Una autorización macro cubre backup, restore point, secrets, tenant, Auth/memberships, Rules, Functions, Hosting, datos autorizados, smoke, escritura reversible, rollback y go-live.

Gate:

```text
GO_PRODUCTION_A&S
```

## 7. Tablero inicial

| Bloque | Estado inicial | Gate | Siguiente acción |
|---|---|---|---|
| 1.0 Plan/ledger | EN EJECUCIÓN | `PASS_PLAN_PERSISTED` | crear ledger y actualizar PR |
| 1.1 Baseline focalizado | PENDIENTE | `PASS_CANONICAL_BASELINE` | inventario owners/scripts/bridges/conteos |
| 2 Visual LAB | PENDIENTE | `GO_LAB_CANDIDATE_VISIBLE` | solo tras 1.1 |
| 3 Ops/Leads | FUNCIONAL PASS / persistencia pendiente | `OPS_LEADS_BACKEND_LAB_COMPLETE` | después de URL LAB |
| 4 Cobros reales | source-only preparado | `COBROS_REAL_LEDGER_COMPLETE` | replay 365 y materialización |
| 5 Integración módulos | PENDIENTE | `RC_ACCUMULATIVE_MODULES_COMPLETE` | misma candidata |
| 6 Aprobación visual | PENDIENTE | `RELEASE_CANDIDATE_ACCEPTED` | tres roles/viewports |
| 7 Producción | BLOQUEADO | `GO_PRODUCTION_A&S` | autorización macro final |

## 8. Intervenciones de Paula

Solo se requieren:

1. revisión visual de la URL acumulativa;
2. decisión sobre casos reales `REQUIERE_VALIDACION` que no puedan resolverse automáticamente;
3. autorización única de producción después de aprobar la release candidate.

## 9. Regla de continuidad entre conversaciones

Toda conversación nueva debe comenzar leyendo:

1. este plan;
2. el ledger vivo;
3. el HEAD actual de PR #5;
4. la evidencia del microbloque activo.

La respuesta inicial debe declarar:

```text
RC activa
microbloque activo
gate pendiente
último PASS
último STOP y causa raíz
siguiente acción exacta
```

No se reconstruye el estado desde memoria ni se reabre una decisión cerrada.