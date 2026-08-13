# PLAN ÚNICO DE SALIDA — RC-AYS-LAB-CANONICA-01

Fecha de adopción: 2026-08-04  
Última actualización: 2026-08-05 21:35 GT
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción, `main` y merge: no autorizados

## 1. Carácter vinculante

Este Plan Único, el estado vivo del PR/HEAD, los lifecycle y la evidencia sanitizada reciente gobiernan una sola candidata acumulativa A&S.

Precedencia:

1. reglas maestras y addenda vigentes;
2. PR/HEAD vivo;
3. este Plan Único;
4. lifecycle, ledger y evidencia reciente.

No se reemplaza la candidata por una composición parcial, no se repiten requests consumidos y no se reintenta el mismo mecanismo cuando una etapa o familia de fallo ya se repitió.

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

La salida será progresiva. Cotizador, Comparativo y el backend completo de Renovaciones no bloquean la primera salida, siempre que no existan accesos engañosos ni funciones que interrumpan el núcleo operativo.

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

### 5.1 Rootfix transversal source-only

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
clasificación: VALIDATOR_STALE
```

El capturador no identificó el checkpoint exacto. Ese request está consumido y no se repite.

### 5.3 Run observable 2.7.3

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

Causa raíz cerrada:

```text
DATA_CONTRACT_FAILURE
```

Antes del timeout estaban listos Firebase Auth, usuario de producto, membresía activa, tenant, ruta `inicio`, rootfix, 29 snapshots y las siete colecciones canónicas.

El rootfix declaró la colección legacy `asesores` como dependencia obligatoria de `Inicio`. `asesores` permaneció en `snapshotErrors`; `hydrationStatus` y `wrapModule` mantuvieron una carga bloqueante:

```text
4 de 5 fuentes listas · falta asesores
```

Owner:

```text
orbit360-platform/core/visual-runtime-rootfix-v20260805.js
MODULE_DEPS.inicio
hydrationStatus
wrapModule
```

No se atribuye a Auth, credenciales, memberships, tenant, Rules ni entorno.

## 6. Correctivo required/optional — SOURCE PASS

Se preparó un overlay de lectura que no modifica `data/store.js`, Firestore, Auth ni los datos operativos:

```text
orbit360-platform/core/visual-runtime-hydration-contract-v20260805.js
orbit360-platform/core/backend-lab-loader.js
```

Contrato:

- las fuentes canónicas esenciales gobiernan readiness;
- las fuentes legacy opcionales no bloquean el render;
- la información auxiliar ausente produce un estado degradado honesto;
- los responsables se proyectan visualmente desde la membresía activa y relaciones canónicas;
- no existen usuarios hardcodeados, identidades demo ni escrituras;
- Inicio, Aseguradoras, Cliente 360, Pólizas, Cobros, Conciliaciones, Cancelaciones, Ops y Leads comparten el mismo criterio.

Validación:

```text
gate: block2.7-visual-hydration-required-optional-source-v20260805
contract: 2.7.4
status: PASS_DIRECT_SOURCE_VALIDATION
checks: 24/24 PASS
browser/secrets/Firestore/deploy: 0
Firestore/Auth/operational writes: 0
```

Evidencia:

```text
orbit360-platform/runtime-gate-crm-v20260716/visual-hydration-direct-source-validation-sanitized-v20260805.json
```

El `DATA_CONTRACT_FAILURE` del producto queda corregido en fuente, pero el rootfix todavía no está vivo ni visualmente aprobado.

## 7. Gate observable v2 — autorización reservada y pipeline detenido

Gate preparado:

```text
gate: block2.7-visual-observable-rootfix-v2-lab-v20260805
contract: 2.7.5
source prerequisite: PASS 24/24
```

Alcance autorizado:

```text
GO_GATE_CONTRACT antes de secretos
backup Hosting LAB
máximo un deploy exclusivo de Hosting
precheck Auth/membresía/ruta/hidratación
matriz solo con precheck PASS
Dirección 1440×1000
Operativo 1024×768
Asesor 390×844
cero writes/Functions/Rules/reimport/production/main/merge
rollback ante fallo
```

Estado gobernante:

```text
STOP_RETRY
classification: PIPELINE_MECHANISM_FAILURE
checkpoint: ACTIONS_TRIGGER_NOT_CREATED
workflow runs creados: 0
gate ejecutado: NO
GO_GATE_CONTRACT producido: NO
secretos leídos: NO
Firestore leído: NO
backup creado: NO
Hosting deploys: 0
navegador ejecutado: NO
autorización runtime consumida: NO
```

Se probaron sin éxito los siguientes transportes:

1. workflow source nuevo;
2. relay source mediante workflow conocido;
3. request runtime v2 con patrón nuevo;
4. request runtime v2 con patrón histórico.

Ninguno creó un workflow run ni evidencia de ejecución. La misma familia falló más de dos veces; se prohíben nuevos archivos request o reintentos del mecanismo push-path.

Owner de la causa:

```text
.github/workflows/orbit360-visual-observable-rootfix-lab-v20260805.yml
GitHub Actions trigger/dispatch del repositorio
```

Solución requerida:

- exponer o reparar un mecanismo soportado de dispatch para el runner v2 ya versionado; o
- ejecutar el runner mediante un workflow registrado fuera de esta rama no fusionada;
- conservar la autorización actual, sin solicitar otra, porque no fue consumida;
- no tocar producto, datos, Hosting, Functions o Rules para resolver este bloqueo.

Evidencia:

```text
orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-v2-pipeline-stop-sanitized-v20260805.json
```

## 8. Política de pruebas directamente desde la plataforma

Cada módulo tendrá dos niveles distintos.

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

Con autorización separada de escritura:

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

Salida: `RC_ACCUMULATIVE_MODULES_COMPLETE`.

### Bloque 6.0 — aceptación

Incluye visualización final A&S, checklist funcional por rol, conteos, corte de datos, pendientes diferidos, backup, rollback y aceptación explícita.

Salida: `RELEASE_CANDIDATE_ACCEPTED`.

### Bloque 7.0 — go-live

Permanece bloqueado hasta autorización expresa.

Salida: `GO_PRODUCTION_A&S`.

## 13. Carriles

### Carril A — frontend, UX y Academia

```text
rootfix transversal source-only: PASS 28/28
required/optional source-only: PASS 24/24
rootfix vivo: NO
PASS_VISUAL_POST_AUTH: NO
pipeline runtime: STOP_RETRY · ACTIONS_TRIGGER_NOT_CREATED
```

### Carril B — backend, seguridad y acceso

```text
Auth: PASS
memberships: PASS
Ops/Leads backend: PASS técnico
Functions/Rules desplegados en este bloque: 0
secretos leídos en intento v2: 0
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
| 2.7F | hydration source 2.7.4 | PASS 24/24 source-only |
| 2.7G | runtime observable v2 2.7.5 | STOP_RETRY · PIPELINE_MECHANISM_FAILURE · autorización no consumida |
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
orbit360-platform/runtime-gate-crm-v20260716/visual-hydration-direct-source-validation-sanitized-v20260805.json
orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-v2-pipeline-stop-sanitized-v20260805.json
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
- diferencia entre defecto funcional, contrato de datos, validador obsoleto y fallo de pipeline;
- requests consumidos frente a autorizaciones reservadas no ejecutadas;
- releases progresivos post-go-live.

## 17. Siguiente acción exacta

```text
1. mantener Hosting LAB en la versión previa restaurada
2. conservar el source fix required/optional 24/24 PASS
3. mantener la autorización runtime v2 reservada y no consumida
4. no crear más request files ni reintentar el push-path
5. reparar o exponer un mecanismo Actions dispatch soportado
6. ejecutar el runner v2 ya versionado únicamente después de GO_GATE_CONTRACT
7. con PASS del precheck, ejecutar la matriz Dirección/Operativo/Asesor
8. cerrar PASS_VISUAL_POST_AUTH o STOP_RETRY con checkpoint exacto
9. después preparar CRUD sintético y retomar Cobros 4.1
```

## 18. Regla de actualización

Cada iteración actualiza avance, fuente, implementación, evidencia, gate, estado, Plan, PR, Academia y acumulado Claude. Un fallo del capturador no se atribuye al producto sin checkpoint; una dependencia opcional no bloquea un módulo; un fallo de Actions no consume una autorización que nunca llegó al gate; una inferencia no se convierte en cobro confirmado por presión de cierre; y una póliza nueva posterior al corte no reinicia toda la salida productiva.


## 19. Ejecución visual v2 y causa raíz gobernante

```text
run: 31067506016
gate: block2.7-visual-observable-rootfix-v2-lab-v20260805
contract: 2.7.5
GO_GATE_CONTRACT: 26/26 PASS
backup Hosting: PASS
Hosting LAB deploys: 1
precheck: PASS · INICIO_READY_PASS
Dirección / Inicio: PASS
matriz: STOP_RETRY
checkpoint exacto: DIRECCION_SCREENSHOT_FULLPAGE_TIMEOUT
clasificación: PIPELINE_MECHANISM_FAILURE
rollback: PASS
snapshot: VERIFIED_UNCHANGED
writes/Functions/Rules/reimport/production/main/merge: 0
```

El rootfix required/optional superó el precheck y Dirección/Inicio cargó. La matriz se detuvo exclusivamente porque la captura `fullPage` agotó 30 segundos. La evidencia auxiliar no puede gobernar el resultado funcional.

Correctivo source-only:

```text
PASS_VISUAL_CAPTURE_SOURCEFIX · 20/20
captura viewport · 12000 ms · no bloqueante
runtime/deploy: 0
```

La autorización fue consumida; no se permite replay. `PASS_VISUAL_POST_AUTH` sigue pendiente.

## 20. Siguiente acción exacta vigente

```text
1. mantener Hosting LAB restaurado y no repetir el run 31067506016
2. conservar como evidencia cruda el último checkpoint DIRECCION_ROUTE_INICIO_PASS
3. gobernar con el checkpoint exacto DIRECCION_SCREENSHOT_FULLPAGE_TIMEOUT
4. revisar source-only el warning no causal "Cannot assign to read only property render"
5. validar source-only el capturador acotado y no bloqueante
6. solicitar autorización nueva únicamente para una futura prueba runtime
7. no reanudar Cobros 4.1 hasta PASS_VISUAL_POST_AUTH
```

Este bloque reemplaza cualquier “siguiente acción” anterior incompatible con el run 31067506016.


## 21. Warning no causal de módulos inmutables

El precheck del run 31067506016 registró:

```text
Cannot assign to read only property 'render' of object '#<Object>'
```

Clasificación:

```text
FUNCTIONAL_DEFECT no causal
owner: core/visual-runtime-rootfix-v20260805.js · wrapModule
sourcefix: PASS_READONLY_MODULE_WRAPPER_SOURCEFIX · 15/15
runtime/deploy: 0
```

El rootfix ya no escribe directamente sobre módulos congelados. Usa proxy de registro o fallback observable. Todos los defectos source-only conocidos del run 31067506016 quedan cerrados; una futura matriz requiere autorización nueva.
