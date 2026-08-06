# PLAN ÚNICO DE SALIDA — RC-AYS-LAB-CANONICA-01

Fecha de adopción: 2026-08-04  
Última actualización: 2026-08-05 18:35 GT  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción, `main` y merge: no autorizados

## 1. Carácter vinculante

Este plan, el estado vivo del PR/HEAD, el ledger y la evidencia reciente gobiernan una sola candidata acumulativa A&S.

Precedencia:

1. reglas maestras y addenda vigentes;
2. PR/HEAD vivo;
3. este Plan Único;
4. ledger y evidencia reciente.

No se reemplaza la candidata por una composición parcial, no se reabren auditorías cerradas sin insumo nuevo y no se repiten requests consumidos.

## 2. Objetivo

Cerrar en una sola RC:

```text
Cliente 360
Aseguradoras
Pólizas
Vehículos
Recibos
Cartera
Cobros
Conciliaciones
Comisiones
Equipo/Auth
Ops
Leads
Importador recurrente
multirol/scopes
Academia
```

## 3. Hechos cerrados

### Runtime funcional acumulativo

```text
run: 30962756387
PASS: 18
FAIL: 0
```

### Composición

```text
rutas aisladas: 8/8 PASS
composición canónica: 31/31 PASS
inner preflight: 32/32 PASS
request/provenance: 33/33 PASS
```

### Baseline protegido

```text
clientes: 430
aseguradoras: 30
pólizas: 1,375
vehículos: 1,033
recibos: 1,294
cartera: 673
cobros confirmados observados: 7
reimportación requerida: no
pérdida observada: no
```

### Ops/Leads backend

```text
Gate: OPS_LEADS_BACKEND_LAB_COMPLETE
Estado: PASS
```

Este PASS no sustituye una prueba viva desde la interfaz.

### Auth autoadministrable

```text
run: 31051061883
GO_GATE_CONTRACT: 43/43 PASS
usuarios/identidades/memberships/Equipo: 7/7
logins/cambio obligatorio: 7/7
CRM: VERIFIED_UNCHANGED
```

Auth solo se reabre si la revisión visual demuestra un defecto concreto.

## 4. Bloque 2.7 — revisión visual post-Auth y rootfix transversal

Candidata visible antes del rootfix:

```text
https://ays-orbit-360-lab.web.app/?orbitBackend=firestore-lab&tenant=alianzas-soluciones#/inicio
```

### 4.1 Evidencia humana real

La navegación humana del 5 de agosto de 2026 demostró que las verificaciones técnicas anteriores no cubrían la experiencia completa en navegador.

Hallazgos:

```text
rememberSessionMissing: FUNCTIONAL_DEFECT
deadLoginHelp: FUNCTIONAL_DEFECT
partialHydrationRenders: PIPELINE_MECHANISM_FAILURE
clientSummaryRepeatedScans: FUNCTIONAL_DEFECT
vehicleDetailMissing: FUNCTIONAL_DEFECT
receiptCobroDetailUnclear: FUNCTIONAL_DEFECT
responsiveTitles: FUNCTIONAL_DEFECT
opsLeadsNoLiveDiagnostic: FUNCTIONAL_DEFECT
emptyReconciliationCopy: DATA_CONTRACT_FAILURE
emptyCancellationCopy: FUNCTIONAL_DEFECT
```

Evidencia consolidada:

```text
orbit360-platform/docs/AUDITORIA-VISUAL-POST-AUTH-ROOTFIX-20260805.md
```

### 4.2 Causa raíz principal

El store abre snapshots independientes y cada fuente inicial emite un evento. El router podía renderizar Cliente 360, Pólizas y Cobros antes de que todas sus dependencias estuvieran listas. La vista mostraba datos parciales, después se recalculaba y reemplazaba la composición.

Cliente 360 además ejecutaba resúmenes repetidos por cliente, recorriendo varias colecciones en cada llamada.

Esto explica:

- bloqueos temporales al cambiar de módulo;
- KPIs que cambian dos veces;
- listados que se sustituyen;
- apertura lenta de clientes, pólizas y recibos;
- interacción sobre una vista que todavía podía ser reemplazada.

### 4.3 Rootfix source-only

```text
gate: block2.7-visual-runtime-rootfix-static-v20260805
contract: 2.7.1
run: 31059563973
source checks: 28/28 PASS
status: STATIC_SOURCE_PASS_NOT_DEPLOYED
```

Owners:

```text
orbit360-platform/core/visual-runtime-rootfix-v20260805.js
orbit360-platform/core/backend-lab-loader.js
tools/orbit360-test-visual-runtime-rootfix-source-v20260805.mjs
```

Incluye:

1. `Mantener sesión iniciada en este dispositivo`, sin almacenar contraseña;
2. eliminación de `¿Problemas al ingresar? → Limpiar sesión`;
3. render único cuando las dependencias del módulo están completas;
4. carga estable con progreso y sin KPIs parciales;
5. índice/cache para Cliente 360;
6. detalle propio de vehículo;
7. botones explícitos de detalle en recibos/cobros;
8. responsive en 1100, 760 y 520 px;
9. estados vacíos honestos de Conciliaciones y Cancelaciones;
10. botón `Ejecutar prueba en vivo` read-only para Ops/Leads.

Frontera:

```text
browser: 0
Firestore reads: 0
Firestore/Auth/operational writes: 0
Functions/Hosting/Rules deploy: 0
producción/main/merge: 0
```

El rootfix no está visible todavía en LAB. Requiere una autorización nueva y acotada para un único Hosting LAB deploy y prueba visual.

### 4.4 Matriz de revalidación

| Perfil | Viewport | Revisión |
|---|---:|---|
| Dirección | 1440 × 1000 | administración, Equipo, módulos acumulados |
| Operativo | 1024 × 768 | operación diaria, Cobros, Ops/Leads |
| Asesor | 390 × 844 | clientes propios, menú móvil, scopes |

Criterios:

- login real sin credenciales demo;
- persistencia elegible y sin guardar contraseña;
- cambio obligatorio de contraseña claro;
- acuerdo legal una sola vez;
- Cliente 360/Pólizas/Cobros no muestran cifras parciales;
- navegación y detalles responden sin bloqueo prolongado;
- vehículo, recibo y cobro tienen acción explícita;
- responsive sin títulos cortados;
- Ops/Leads ejecutan diagnóstico read-only y entregan resultado;
- Conciliaciones/Cancelaciones explican su estado;
- cero texto técnico, secretos o passwords;
- cero acceso indebido por ruta directa.

Salida:

```text
PASS_VISUAL_POST_AUTH
```

Ante hallazgo:

```text
STOP_RETRY
clasificación
owner
captura/viewport
causa raíz
corrección focalizada
una sola revalidación
```

## 5. Bloque 4.0 — Cobros read-only

```text
Gate: PASS_COBROS_FULL_REPLAY
Estado: CLOSED_PASS_READ_ONLY
```

Resultado:

```text
pagos canónicos: 365
propuestas por secuencia: 128
post-corte: 2
propuestas por planilla detallada: 2
HOLD sin enlace único a recibo: 233
requiere validación: 0
explicados: 365
sin categoría: 0
```

```text
128 + 2 + 2 + 233 = 365
```

Evidencia:

```text
rowLedgerCount: 365
rowLedgerDigest: 96d7105912234de14deb5ad0190e537c1b71570519d086616acc9122cb2ca381
cobros existentes preservados: 5
HOLD de calendario preservados: 44
writes/deploy/reimport: 0
```

El PASS significa que toda fila terminó vinculada, propuesta, HOLD, omitida o en validación. No significa que los 233 HOLD sean cobros confirmados.

### Causa raíz corregida

```text
DATA_CONTRACT_FAILURE
```

Correcciones:

1. una clave repetida póliza/moneda/periodo ya no toma la primera fila; queda en HOLD;
2. una fila SIGA de pago reportado, sin pendiente y fuera de cartera, pero sin enlace unívoco a recibo, queda en `HOLD_REPORTED_PAYMENT_NO_UNIQUE_RECEIPT_LINK`.

Owners:

```text
tools/orbit360-cobros-overlay-readonly-v2-20260805.mjs
tools/orbit360-cobros-overlay-hold-finalizer-v20260805.mjs
```

Cierre:

```text
orbit360-platform/docs/CIERRE-BLOQUE-4-0-COBROS-FULL-REPLAY-20260805.md
```

### Estado visible de las inferencias

Los pagos anteriores inferidos no aparecen todavía como cobros porque continúan como propuestas read-only. Esto es coherente con la frontera de seguridad: una inferencia no puede convertirse automáticamente en cobro confirmado.

## 6. Bloque 4.1 — materialización durable del ledger de Cobros

```text
Gate objetivo: COBROS_REAL_LEDGER_COMPLETE
Estado: PAUSADO HASTA PASS VISUAL
```

Preparación cerrada:

```text
contrato: 10.10.2
planner source: 18/18 PASS
static contract: 20/20 PASS
paquete privado V3: verificado
writer runtime: no creado
Firestore writes: 0
```

Topología prevista:

```text
run aislado
1,095 documentos de staging
manifest de run
transacción de activación del manifest + puntero
cero escrituras directas en colecciones visibles durante staging
máximo contractual: 1,098 escrituras
```

Alcance:

- 365 pagos reportados;
- 365 evidencias;
- 132 propuestas;
- 233 HOLD;
- cero cobros nuevos;
- cero cambios a recibos, pólizas o finmovs;
- 5 cobros existentes preservados;
- snapshot, idempotencia, verificación y rollback.

La preparación se pausó correctamente al recibir evidencia visual. No existe writer parcial persistido.

No se ejecuta antes de:

```text
PASS_VISUAL_POST_AUTH
+
autorización explícita separada de escritura LAB
```

## 7. Pólizas pendientes y criterio de corte

Las pólizas pendientes se separan en dos grupos.

### Correcciones bloqueantes antes de producción

- cliente o asesor incorrecto;
- estado incorrecto;
- vigencias incorrectas;
- prima, moneda o país incorrectos;
- calendario de recibos incorrecto;
- duplicados;
- errores que cambien cartera, cobros, permisos o indicadores.

### Delta no bloqueante post-go-live

- pólizas nuevas posteriores al corte verificado;
- renovaciones recibidas después del corte;
- datos complementarios no críticos;
- actualizaciones operativas normales posteriores al cierre del dataset.

La producción debe salir con un corte de datos explícito y un importador incremental listo. No se retrasa indefinidamente por cada póliza nueva que continúe llegando.

## 8. Bloque 5.0 — RC acumulativa

Se activa cuando existan:

```text
PASS_VISUAL_POST_AUTH
+
COBROS_REAL_LEDGER_COMPLETE
+
correcciones bloqueantes de pólizas cerradas
```

Objetivo:

- una sola candidata con todos los módulos;
- rutas y dependencias coherentes;
- Auth, CRM, Cobros, Comisiones, Ops/Leads e importador en la misma RC;
- multirol/scopes para Dirección, Operativo y Asesor;
- cero texto técnico o estado engañoso;
- Academia y documentación actualizadas.

Salida:

```text
RC_ACCUMULATIVE_MODULES_COMPLETE
```

## 9. Bloque 6.0 — aceptación de release candidate

Incluye:

1. visualización final A&S;
2. checklist funcional y visual por rol;
3. conteos e integridad;
4. corte de datos y delta post-corte;
5. pendientes diferidos no bloqueantes;
6. backup y rollback preparados;
7. aceptación explícita de Paula.

Salida:

```text
RELEASE_CANDIDATE_ACCEPTED
```

## 10. Bloque 7.0 — go-live

Permanece bloqueado hasta autorización expresa.

Macrobloque requerido:

```text
preflight canónico
backup
snapshot
verificación proyecto/tenant/rama/HEAD
deploy autorizado
smoke post-deploy
rollback listo
cierre sanitizado
```

Salida:

```text
GO_PRODUCTION_A&S
```

## 11. Carriles

### Carril A — frontend, UX y Academia

Rootfix visual source-only 28/28 PASS. Pendiente un único deploy Hosting LAB y prueba viva por rol/viewport.

### Carril B — backend, seguridad y acceso

Auth cerrado. Ops/Leads backend PASS técnico. No se despliegan Functions ni Rules. El diagnóstico visible será read-only.

### Carril C — datos reales y migración

Cobros 4.0 cerrado 365/365. Cobros 4.1 preparado estáticamente y pausado. Las correcciones críticas de pólizas se cierran antes de producción; el delta nuevo se carga después del corte.

## 12. Estado vivo

| Bloque | Gate | Estado |
|---|---|---|
| 1.0–1.1 | plan/baseline | PASS |
| 2.0–2.5 | composición/candidata LAB | PASS técnico |
| 2.6 | recaptura legal automática | diferido no bloqueante |
| 2.7A | auditoría visual humana | hallazgos clasificados |
| 2.7B | `block2.7-visual-runtime-rootfix-static-v20260805` | PASS 28/28 source-only |
| 2.7C | Hosting LAB + prueba viva | pendiente autorización |
| 3.0 | `OPS_LEADS_BACKEND_LAB_COMPLETE` | PASS técnico |
| 3.1 | Auth autoadministrable | PASS 7/7 |
| 4.0 | `PASS_COBROS_FULL_REPLAY` | PASS 365/365 read-only |
| 4.1 | `COBROS_REAL_LEDGER_COMPLETE` | preparado estático; pausado |
| 5.0 | `RC_ACCUMULATIVE_MODULES_COMPLETE` | pendiente |
| 6.0 | `RELEASE_CANDIDATE_ACCEPTED` | pendiente |
| 7.0 | `GO_PRODUCTION_A&S` | bloqueado |

## 13. Siguiente acción exacta

Solicitar una única autorización para:

```text
un Hosting LAB deploy
cero Functions
cero Rules
cero Firestore/Auth writes
prueba visual Dirección desktop, Operativo tablet y Asesor móvil
prueba de carga estable Cliente 360/Pólizas/Cobros
prueba de detalles Vehículo/Recibo/Cobro
prueba read-only Ops/Leads
Conciliaciones/Cancelaciones con estados honestos
STOP_RETRY ante cualquier fallo
```

Después:

1. cerrar `PASS_VISUAL_POST_AUTH`;
2. retomar Bloque 4.1;
3. cerrar correcciones críticas de pólizas;
4. separar delta post-corte;
5. cerrar RC acumulativa;
6. presentar candidata final;
7. autorizar go-live.

## 14. Pendientes diferidos no bloqueantes

- recaptura histórica del modal legal;
- incorporación visual de la lección Academia Auth/Cobros;
- prueba CRUD sintética Ops/Leads con rollback, si se requiere después del diagnóstico read-only;
- autoservicio universal del importador no tabular;
- liberación progresiva de los 233 HOLD cuando existan reportes detallados;
- pólizas nuevas posteriores al corte;
- rebranding Gravicentra conforme a nota rectora;
- mejoras cosméticas sin impacto operativo.

## 15. Academia y reutilización

```text
ACADEMIA_ACTUALIZAR
REPLICABLE_CLAUDE_INMEDIATO
```

Debe enseñar:

- hidratación estable antes del primer render;
- no mostrar KPIs parciales;
- diagnóstico read-only autoadministrable;
- estado vacío con alcance temporal;
- persistencia de sesión sin almacenar contraseña;
- diferencia entre propuesta, HOLD y cobro confirmado;
- diferencia entre corrección bloqueante y delta post-corte.

## 16. Regla de actualización

Cada iteración actualiza avance, fuente, implementación, evidencia, gate, estado, Plan, PR, Academia y acumulado Claude. Un problema del capturador no bloquea producto, una inferencia no se convierte en cobro por presión de cierre y una póliza nueva posterior al corte no reinicia toda la salida productiva.
