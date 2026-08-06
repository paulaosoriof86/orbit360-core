# PLAN ÚNICO DE SALIDA — RC-AYS-LAB-CANONICA-01

Fecha de adopción: 2026-08-04  
Última actualización: 2026-08-05 19:42 GT  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción, `main` y merge: no autorizados

## 1. Carácter vinculante

Este Plan Único, el estado vivo del PR/HEAD, el lifecycle y la evidencia sanitizada reciente gobiernan una sola candidata acumulativa A&S.

Precedencia:

1. reglas maestras y addenda vigentes;
2. PR/HEAD vivo;
3. este Plan Único;
4. lifecycle, ledger y evidencia reciente.

No se reemplaza la candidata por una composición parcial, no se repiten requests consumidos y no se ejecuta nuevamente una etapa fallida sin cerrar primero su causa raíz.

## 2. Alcance del primer go-live

El primer go-live operativo prioriza:

```text
Orbit Ops
Orbit Leads
Orbit Aseguradoras
Cliente 360
Pólizas
Vehículos relacionados
Recibos
Cobros y cartera
Equipo/Auth
multirol/scopes
```

La salida será progresiva. Cotizador, Comparativo y el backend completo de Renovaciones no bloquean la primera salida, siempre que no existan accesos engañosos o funciones que interrumpan el núcleo operativo.

Después del go-live, cada módulo o función adicional se incorporará mediante release incremental con prueba técnica, prueba viva, aceptación, backup y rollback.

## 3. Baseline protegido

```text
clientes: 430
aseguradoras: 30
pólizas: 1,375
vehículos: 1,033
recibos esperados: 1,294
cartera: 673
cobros confirmados observados: 7
memberships observadas: 8
reimportación requerida por el rootfix visual: no
pérdida observada: no
```

## 4. Hechos cerrados

### 4.1 Composición funcional acumulativa

```text
runtime funcional: 18/18 PASS
rutas aisladas: 8/8 PASS
composición canónica: 31/31 PASS
inner preflight: 32/32 PASS
request/provenance: 33/33 PASS
```

### 4.2 Auth autoadministrable

```text
run: 31051061883
GO_GATE_CONTRACT: 43/43 PASS
usuarios/identidades/memberships/Equipo: 7/7
logins/cambio obligatorio: 7/7
CRM: VERIFIED_UNCHANGED
```

Auth no es la causa del bloqueo visual actual.

### 4.3 Ops/Leads backend

```text
Gate: OPS_LEADS_BACKEND_LAB_COMPLETE
Estado: PASS técnico
```

Este PASS no sustituye la prueba viva desde la interfaz.

### 4.4 Cobros 4.0 read-only

```text
Gate: PASS_COBROS_FULL_REPLAY
pagos canónicos explicados: 365/365
propuestas por secuencia: 128
post-corte: 2
propuestas por planilla detallada: 2
HOLD sin enlace único: 233
sin categoría: 0
```

```text
128 + 2 + 2 + 233 = 365
```

Evidencia:

```text
rowLedgerCount: 365
rowLedgerDigest: 96d7105912234de14deb5ad0190e537c1b71570519d086616acc9122cb2ca381
writes/deploy/reimport: 0
```

Una propuesta o un HOLD no es un cobro confirmado.

## 5. Rootfix visual post-Auth

### 5.1 Rootfix source-only

```text
gate: block2.7-visual-runtime-rootfix-static-v20260805
contract: 2.7.1
run: 31059563973
source checks: 28/28 PASS
```

Incluye:

- persistencia opcional de sesión sin almacenar contraseña;
- eliminación de ayuda de login sin función;
- carga estable antes del render;
- índice/cache de Cliente 360;
- detalle de vehículo, recibo y cobro;
- responsive transversal;
- estados vacíos honestos;
- diagnóstico read-only de Ops/Leads.

### 5.2 Primer run visual consumido

```text
run: 31061214801
preflight: GO_GATE_CONTRACT 20/20
Hosting deploy: 1
resultado: STOP_RETRY
rollback: PASS
snapshot: VERIFIED_UNCHANGED
clasificación inicial: VALIDATOR_STALE
```

Ese capturador no identificó el checkpoint exacto. El request está consumido y no se repite.

### 5.3 Precheck observable y matriz 2.7.3

Registro del gate:

```text
gate: block2.7-visual-observable-rootfix-lab-v20260805
contract: 2.7.3
registro/perfil: 7/7 PASS source-only
```

Ejecución autorizada:

```text
run: 31063000137
preflight: GO_GATE_CONTRACT 24/24
backup Hosting: PASS
Hosting LAB deploy: 1
precheck: FAIL
checkpoint: INICIO_READY_TIMEOUT
matriz Dirección/Operativo/Asesor: no ejecutada
rollback Hosting: PASS
Firestore/Auth/operational writes: 0
Functions/Rules deploys: 0
producción/main/merge: 0
```

Estado actual:

```text
PASS_VISUAL_POST_AUTH: NO
rootfix vivo y aprobado: NO
Hosting LAB: restaurado a la versión previa
request: CONSUMED_STOP_RETRY
replay: prohibido
```

## 6. Causa raíz cerrada

Clasificación:

```text
DATA_CONTRACT_FAILURE
```

Checkpoint:

```text
INICIO_READY_TIMEOUT
```

Antes del timeout estaban listos:

```text
Firebase Auth
usuario de producto
membresía activa
vínculo con tenant
ruta inicio
rootfix cargado
29 snapshots conectados
7 colecciones canónicas
```

Las siete colecciones canónicas disponibles eran:

```text
clientes
aseguradoras
polizas
vehiculos
recibosEsperados
carteraPrimas
cobros
```

La colección legacy `asesores` permaneció en `snapshotErrors`.

El rootfix declaró:

```text
MODULE_DEPS.inicio = clientes + polizas + cobros + asesores + aseguradoras
```

`hydrationStatus` consideró que la vista no estaba lista y `wrapModule` reemplazó el render original por una pantalla bloqueante. La evidencia visible fue:

```text
4 de 5 fuentes listas · falta asesores
```

El módulo original puede operar con `asesores=[]`; por tanto, el bloqueo fue introducido por un contrato de hidratación incompatible con el estado vivo del runtime.

Owner exacto:

```text
orbit360-platform/core/visual-runtime-rootfix-v20260805.js
MODULE_DEPS.inicio
hydrationStatus
wrapModule
```

No se atribuye a Auth, credenciales, membresía, tenant, Rules ni entorno porque esas etapas ya habían pasado. Tampoco se modifican Rules sin evidencia de que sean la causa.

## 7. Correctivo obligatorio antes de otro runtime

Debe prepararse y pasar primero un gate source-only que:

1. separe dependencias canónicas obligatorias y fuentes legacy opcionales;
2. no bloquee `Inicio` por `asesores`;
3. proyecte asesores visualmente desde memberships/Equipo, sin escritura y sin hardcode;
4. muestre un estado degradado honesto para leaderboard y metas si no existe proyección opcional;
5. revise el contrato required/optional en Cliente 360, Pólizas, Cobros, Ops, Leads, Conciliaciones y Cancelaciones;
6. conserve cero escrituras y cero datos tenant en código genérico;
7. actualice owner, validador, workflow, documentación y Academia juntos.

Solo después de PASS source-only podrá solicitarse una nueva autorización runtime. No se abre otra ejecución visual antes.

## 8. Política de pruebas directamente desde la plataforma

Cada módulo tendrá dos niveles distintos:

### 8.1 Prueba viva read-only

- login y sesión;
- permisos y scopes;
- navegación real;
- carga e hidratación;
- KPIs estables;
- filtros y detalles;
- responsive;
- estados honestos;
- cero escrituras.

### 8.2 Gate CRUD sintético con rollback

Cuando exista autorización separada de escritura:

- crear;
- leer;
- editar;
- eliminar o archivar según contrato;
- comprobar relaciones;
- revertir exactamente;
- verificar cero registros sintéticos residuales.

Cobertura prevista:

```text
Cliente 360
Pólizas
Recibos
Cobros
Ops
Leads
```

El gate CRUD no se ejecuta dentro de una autorización read-only.

## 9. Bloque 4.1 — materialización durable de Cobros

```text
Gate objetivo: COBROS_REAL_LEDGER_COMPLETE
Estado: PAUSADO HASTA PASS_VISUAL_POST_AUTH
```

Preparación cerrada:

```text
contrato: 10.10.2
planner source: 18/18 PASS
static contract: 20/20 PASS
writer runtime: no creado
Firestore writes: 0
```

Topología prevista:

```text
1,095 documentos de staging
manifest de run
activación atómica del manifest y puntero
máximo contractual: 1,098 escrituras
snapshot, idempotencia, verificación y rollback
```

No se ejecuta sin autorización explícita separada.

## 10. Pólizas y criterio de corte

### Bloqueantes antes de producción

- cliente o asesor incorrecto;
- estado o vigencia incorrectos;
- prima, moneda o país incorrectos;
- calendario de recibos incorrecto;
- duplicados;
- errores que cambien cartera, cobros, permisos o indicadores.

### Delta no bloqueante post-go-live

- pólizas nuevas posteriores al corte;
- renovaciones posteriores al corte;
- datos complementarios no críticos;
- actualizaciones normales de operación.

La llegada de nuevas pólizas no reinicia toda la salida productiva.

## 11. Cotizador, Comparativo y Renovaciones

No bloquean el primer go-live, pero permanecen como release incremental obligatorio.

Decisiones vigentes:

- auditar y reponer la última versión aprobada v110 de Cotizador/Comparativo con todos sus razonamientos;
- Dirección/Admin/Operativo: elegir entre abrir Cotizador o solicitar gestión de cotización;
- Asesor: generar gestión de cotización;
- `Comparar` en Renovaciones solo se habilita después de verificar backend durable, relaciones, idempotencia y scopes.

Documento:

```text
orbit360-platform/docs/BACKLOG-POST-GOLIVE-COTIZADOR-COMPARATIVO-RENOVACIONES-Y-PRUEBAS-VIVAS-20260805.md
```

## 12. RC acumulativa, aceptación y go-live

### Bloque 5.0 — RC acumulativa

Requiere:

```text
PASS_VISUAL_POST_AUTH
+
COBROS_REAL_LEDGER_COMPLETE
+
correcciones bloqueantes de pólizas cerradas
```

Salida:

```text
RC_ACCUMULATIVE_MODULES_COMPLETE
```

### Bloque 6.0 — aceptación

Incluye visualización final A&S, checklist funcional por rol, conteos, corte de datos, pendientes diferidos, backup, rollback y aceptación explícita.

Salida:

```text
RELEASE_CANDIDATE_ACCEPTED
```

### Bloque 7.0 — go-live

Permanece bloqueado hasta autorización expresa.

Salida:

```text
GO_PRODUCTION_A&S
```

## 13. Carriles

### Carril A — frontend, UX y Academia

```text
rootfix source-only: PASS 28/28
run observable: STOP_RETRY
causa: DATA_CONTRACT_FAILURE
checkpoint: INICIO_READY_TIMEOUT
rollback: PASS
```

Siguiente: contrato required/optional de hidratación source-only.

### Carril B — backend, seguridad y acceso

```text
Auth: PASS
memberships: PASS
Ops/Leads backend: PASS técnico
Functions/Rules desplegados en este bloque: 0
```

No se reabre Auth ni se cambian Rules por este fallo.

### Carril C — datos reales y migración

```text
Cobros 4.0: PASS 365/365 read-only
Cobros 4.1: preparado y pausado
pólizas: correcciones críticas antes del corte
reimportación causada por rootfix: no
```

## 14. Estado vivo

| Bloque | Gate | Estado |
|---|---|---|
| 1.0–1.1 | plan/baseline | PASS |
| 2.0–2.5 | composición/candidata | PASS técnico |
| 2.6 | recaptura legal histórica | diferido no bloqueante |
| 2.7A | auditoría visual humana | hallazgos clasificados |
| 2.7B | rootfix static 2.7.1 | PASS 28/28 |
| 2.7C | run 31061214801 | STOP_RETRY · VALIDATOR_STALE · rollback PASS |
| 2.7D | registro observable 2.7.3 | PASS 7/7 source-only |
| 2.7E | run 31063000137 | STOP_RETRY · DATA_CONTRACT_FAILURE · INICIO_READY_TIMEOUT · rollback PASS |
| 3.0 | Ops/Leads backend | PASS técnico |
| 3.1 | Auth autoadministrable | PASS 7/7 |
| 4.0 | Cobros full replay | PASS 365/365 read-only |
| 4.1 | Cobros durable | preparado; pausado |
| 5.0 | RC acumulativa | pendiente |
| 6.0 | aceptación | pendiente |
| 7.0 | producción | bloqueado |

## 15. Evidencias gobernantes

```text
orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-final-sanitized-v20260805.json
orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-governing-stop-sanitized-v20260805.json
orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootcause-closure-sanitized-v20260805.json
orbit360-platform/docs/CIERRE-VISUAL-OBSERVABLE-ROOTFIX-LAB-20260805.md
```

## 16. Academia y reutilización

```text
ACADEMIA_ACTUALIZAR
REPLICABLE_CLAUDE_INMEDIATO
```

Debe enseñar:

- required vs optional hydration;
- no bloquear una vista por una fuente auxiliar;
- no mostrar KPIs parciales;
- estados degradados honestos;
- proyección visual desde memberships sin escritura;
- diferencia entre prueba técnica, prueba viva y CRUD con rollback;
- diferencia entre defecto funcional, contrato de datos y validador obsoleto;
- releases progresivos post-go-live.

## 17. Siguiente acción exacta

```text
1. mantener Hosting LAB restaurado y congelar nuevas ejecuciones visuales
2. preparar contrato source-only required/optional de hidratación
3. corregir MODULE_DEPS/hydrationStatus/wrapModule sin hardcode ni datos tenant
4. proyectar asesores desde memberships/Equipo sin escritura
5. validar transversalmente Inicio, Cliente 360, Pólizas, Cobros, Ops, Leads, Conciliaciones y Cancelaciones
6. actualizar owner, gate, workflow, Plan y Academia juntos
7. solo con PASS source-only solicitar nueva autorización runtime
8. después de PASS_VISUAL_POST_AUTH preparar CRUD sintético y retomar Cobros 4.1
```

## 18. Regla de actualización

Cada iteración actualiza avance, fuente, implementación, evidencia, gate, estado, Plan, PR, Academia y acumulado Claude. Un fallo del capturador no se atribuye al producto sin checkpoint; una dependencia opcional no debe bloquear un módulo; una inferencia no se convierte en cobro confirmado por presión de cierre; y una póliza nueva posterior al corte no reinicia toda la salida productiva.
