# PLAN ÚNICO DE SALIDA — RC-AYS-LAB-CANONICA-01

Fecha de adopción: 2026-08-04  
Última actualización: 2026-08-05 17:45 GT  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Baseline funcional congelado: `548cffa50cddfd93ad2118f5a06e9bb420699bde`  
HEAD vivo de esta actualización: `d076bcae270e17e69eea4e07130cdd2190cd25d9`  
Producción, `main` y merge: no autorizados

## 1. Carácter vinculante

Este documento, el estado vivo del PR/HEAD, el ledger y la evidencia reciente rigen una sola candidata acumulativa A&S. Ninguna conversación sustituye estas fuentes.

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

Objetivo acumulativo: presentar y cerrar Cliente 360, Aseguradoras, Pólizas, Vehículos, Recibos, Cartera, Cobros, Conciliaciones, Comisiones, Equipo/onboarding, Ops, Leads, importador recurrente, Auth, memberships, multirol y scopes configurables, sin hardcode A&S en módulos genéricos.

## 3. Hechos cerrados

### 3.1 Runtime funcional acumulativo

```text
run: 30962756387
PASS: 18
FAIL: 0
```

No se repite sin cambio funcional de owner.

### 3.2 Baseline canónico

```text
clientes: 430
aseguradoras: 30
pólizas: 1,375
vehículos: 1,033
recibos: 1,294
cartera: 673
cobros confirmados: 7
reimportación requerida: no
pérdida observada: no
```

### 3.3 Composición y continuidad

```text
rutas aisladas: 30971707956 · 8/8 PASS
composición canónica: 30977179448 · 31/31 PASS
inner preflight: 32/32 PASS
request v4/provenance: 30979519198 · 33/33 PASS
```

### 3.4 Candidata LAB visible

```text
run: 31005103975
job: 92302991333
workflow: success
preflight: 32/32 PASS
Functions allowlisted: 4/4
Hosting preview: PASS y retenido
integridad: PASS
snapshots before/after: idénticos
Firestore/Auth writes: 0
```

URL vigente para revisión humana post-Auth:

```text
https://ays-orbit-360-lab.web.app/?orbitBackend=firestore-lab&tenant=alianzas-soluciones#/inicio
```

El modal legal se conserva y se acepta una sola vez. El incidente histórico del capturador no constituye defecto funcional del producto.

### 3.5 Ops/Leads durable

```text
Gate: OPS_LEADS_BACKEND_LAB_COMPLETE
Estado: PASS_REUSED_FUNCTIONAL_RUNTIME_AND_CURRENT_DEPLOY
```

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

### 3.6 Auth autoadministrable

```text
run: 31051061883
Gate: GO_GATE_CONTRACT · 43/43 PASS
AUTH_SELFMANAGED_CREDENTIALS_RUNTIME_PASS
GO_AUTH_SELFMANAGED_CREDENTIALS_COMPLETE
```

Resultado:

```text
usuarios activos: 7
identidades: 7/7
memberships: 7/7
Equipo vinculado: 7/7
contraseñas temporales: 7/7
logins verificados: 7/7
cambio obligatorio: 7/7
autoadministración desde Equipo: true
cambio personal de contraseña: true
sincronización nombre/correo: true
CRM: VERIFIED_UNCHANGED
```

Despliegues consumidos:

```text
orbit360ProvisionTeamAccess: 1
Hosting LAB: 1
otras Functions: 0
Rules: 0
reimportaciones: 0
producción/main/merge: 0
```

Seguridad:

- patrón temporal aprobado: `PrimerNombre123*`;
- contraseña actual no visible ni recuperable;
- contraseñas o hashes persistidos en repo/evidencia: 0;
- request consumido y sin replay;
- rollback y contención no requeridos.

Auth queda cerrado técnica y operacionalmente. Solo se reabre si la revisión visual demuestra un defecto funcional concreto.

## 4. Carriles vigentes

### Carril A — frontend, UX y Academia

Frente activo: revisión visual controlada post-Auth en LAB por Dirección desktop, Operativo tablet y Asesor móvil.

### Carril B — backend, seguridad y acceso

Auth cerrado. No hay nuevo desarrollo de arquitectura. En Cobros se corrigió source-only un `DATA_CONTRACT_FAILURE` del owner de overlay; no hubo runtime, secretos, Firestore ni deploy.

### Carril C — datos reales y migración

Continúa Bloque 4.0 de Cobros, exclusivamente read-only. Estado real: 132 pagos explicados y 233 pendientes de evidencia adicional.

## 5. Bloque visual activo — revisión post-Auth

```text
Gate lógico: AUTH_VISUAL_REVIEW_LAB
Estado: ACTIVE_READ_ONLY
Escrituras administrativas: 0
Deploys adicionales: 0
Producción/main/merge: 0
```

### 5.1 Matriz obligatoria

| Perfil | Viewport | Objetivo |
|---|---:|---|
| Dirección | 1440 × 1000 | administración completa, Equipo, módulos acumulados y navegación desktop |
| Operativo | 1024 × 768 | operación diaria, menús, cartera/cobros, Ops/Leads y tablet |
| Asesor | 390 × 844 | clientes propios, navegación móvil, menú móvil y restricciones honestas |

### 5.2 Flujo visual por perfil

1. pantalla de login sin credenciales demo;
2. inicio de sesión real con identidad y membership del tenant;
3. modal obligatorio `Crea tu contraseña personal`;
4. copia clara, campos legibles y acción de cerrar sesión;
5. aceptación legal una sola vez;
6. menú, rol activo, nombre, responsive y estados de carga;
7. rutas y permisos propios del perfil;
8. cero textos técnicos, contraseñas visibles o accesos indebidos.

### 5.3 Rutas mínimas

Dirección:

```text
Inicio
Cliente 360 · lista y ficha
Aseguradoras · directorio, ficha y conocimiento
Pólizas
Vehículos
Recibos
Cartera
Cobros
Conciliaciones
Comisiones
Equipo
Ops
Leads
Importar
Academia
```

Operativo:

```text
Inicio
Cliente 360
Aseguradoras
Pólizas
Recibos/Cartera
Cobros/Conciliaciones
Comisiones
Ops
Leads
Importar según permiso
```

Asesor:

```text
Inicio
Mis clientes
ficha de cliente relacionada
pólizas/recibos relacionados permitidos
Ops/gestiones propias
Leads propios
menú móvil
sin acceso indebido a Equipo, configuración global o datos de otros asesores
```

### 5.4 Resultado posible

```text
PASS_VISUAL_POST_AUTH
```

O, ante hallazgo:

```text
STOP_RETRY
clasificación exacta
owner exacto
captura y viewport
causa raíz
corrección focalizada
una sola revalidación
```

No se abre auditoría general ni se repite Auth.

## 6. Bloque 4.0 — replay completo read-only de Cobros

```text
Gate objetivo: PASS_COBROS_FULL_REPLAY
Estado: ACTIVE_READ_ONLY_PROGRESS_REQUIRES_MORE_EVIDENCE
```

Punto de partida protegido:

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

### 6.1 Avance real

```text
secuencia de cartera: 128
posteriores al corte: 2
propuestas únicas por planilla detallada: 2
pendientes de evidencia adicional: 233
invariante: 128 + 2 + 2 + 233 = 365
```

```text
stage: COBROS_OVERLAY_PROGRESS
classification: READ_ONLY_PROGRESS_REQUIRES_MORE_EVIDENCE
rowLedgerCount: 365
rowLedgerDigest: 3f129242c34934b3f87009a1d0cb4bded6861b376f3719349831d770b7825f5f
ok: false
```

No se declara PASS con 233 pendientes.

### 6.2 Root fix del owner

Clasificación:

```text
DATA_CONTRACT_FAILURE
```

El owner v1 podía tomar la primera fila cuando una misma clave póliza/moneda/periodo aparecía varias veces en planilla. El owner v2 exige correspondencia uno a uno; toda clave repetida queda en HOLD.

Owners vigentes:

```text
tools/orbit360-cobros-overlay-readonly-v2-20260805.mjs
tools/orbit360-test-cobros-overlay-source-v2-20260805.mjs
```

Prueba:

```text
PASS_COBROS_OVERLAY_SOURCE_ONLY_V2
16 PASS
0 FAIL
duplicateSourceKeyProtection: true
```

### 6.3 Clasificación de planillas

```text
filas recibidas: 67
elegibles CRM: 65
PLANILLA_ZERO_OMIT: 2
PLANILLA_PERIOD_ONLY: 29
PLANILLA_REVERSAL_HOLD: 2
PLANILLA_DETAIL_AMBIGUOUS_HOLD: 10
PLANILLA_DETAIL_CANDIDATE: 24
```

Cruce:

```text
propuestas únicas: 2
filas con clave fuente ambigua: 10
claves destino ambiguas: 0
filas detalladas sin pago pendiente correspondiente: 22
```

### 6.4 Segmentación de los 233 pendientes

```text
GTQ: 209
COP: 24
pólizas distintas: 124
Recibos por fecha límite: 154
Cobranza efectuada histórica: 79
```

Prioridad:

```text
Aseguradora Guatemalteca: 41
Seguros El Roble: 38
Seguros Columna: 30
Mapfre Seguros Guatemala: 22
Seguros G&T: 17
Aseguradora General: 16
Aseguradora La Ceiba: 16
Seguros Ficohsa: 14
resto: 39
```

Las primeras tres concentran 109 casos. La siguiente evidencia debe ser reporte detallado de pago o recibo por aseguradora.

### 6.5 Reglas no negociables

- fuentes detalladas se cruzan fila por fila;
- facturas o resúmenes agregados no crean cobros individuales;
- evidencia agregada sin detalle queda en HOLD;
- se preservan 5 cobros existentes y 44 HOLD;
- no se permite doble conteo;
- banco no crea cobro sin conciliación;
- histórico financiero no crea cobro;
- cobros/recaudos no son finmovs;
- ninguna propuesta actual escribe datos.

Cierre requerido:

1. categorías exhaustivas que expliquen 365/365;
2. trazabilidad por fuente sin PII en evidencia pública;
3. cada fila como crear, vincular, omitir, HOLD o requiere validación;
4. cero escrituras;
5. ledger sanitizado y digests.

## 7. Bloque 4.1 — materialización durable de Cobros

Estado: pendiente de cierre 4.0 y autorización explícita separada.

Debe incluir:

```text
snapshot previo
idempotencia
operación atómica
preservación de 5 cobros existentes
aplicación contra recibo/cartera correctos
post-verificación
rollback exacto antes de cualquier etapa irreversible
cero producción
```

No se autoriza por este plan.

## 8. Bloque 5.0 — candidata acumulativa de módulos

Se activa únicamente después de PASS visual post-Auth y cierre durable de Cobros.

Objetivo:

- consolidar una sola RC con todos los módulos cerrados;
- verificar composición, rutas y dependencias sin reimportar;
- confirmar Ops/Leads, Auth, CRM, Cobros, Comisiones e importador en la misma candidata;
- validar multirol/scopes para Dirección, Operativo y Asesor;
- cerrar textos técnicos y estados engañosos;
- actualizar Academia y documentación viva.

Salida:

```text
RC_ACCUMULATIVE_MODULES_COMPLETE
```

## 9. Bloque 6.0 — aceptación de release candidate

Incluye:

1. visualización final A&S;
2. checklist funcional y visual por rol;
3. datos y conteos protegidos;
4. backup y rollback preparados;
5. lista de pendientes diferidos no bloqueantes;
6. aceptación explícita de Paula.

Salida:

```text
RELEASE_CANDIDATE_ACCEPTED
```

## 10. Bloque 7.0 — go-live A&S

Permanece bloqueado hasta autorización expresa.

Cuando exista autorización deberá ejecutar un solo macrobloque con:

```text
preflight canónico
backup
snapshot
verificación de proyecto/tenant/rama/HEAD
merge/deploy solo si está expresamente autorizado
smoke post-deploy
rollback listo
cierre sanitizado
```

Salida:

```text
GO_PRODUCTION_A&S
```

## 11. Secuencia inmediata

### Acción 1 — revisión visual humana en paralelo

```text
Dirección desktop
Operativo tablet
Asesor móvil
```

### Acción 2 — carril C activo

```text
Cruzar reportes detallados de pago/recibo para los 233 pendientes
Prioridad: Aseguradora Guatemalteca → El Roble → Columna
Mismo owner v2
Cero escrituras
```

### Acción 3 — solo con 365/365

```text
Preparar una sola autorización para materialización durable de Cobros en LAB
```

### Acción 4

```text
Cerrar RC acumulativa de módulos
```

### Acción 5

```text
Presentar candidata final para aceptación visual A&S
```

### Acción 6

```text
Solicitar autorización única de go-live
```

## 12. Estado vivo

| Bloque | Gate | Estado |
|---|---|---|
| 1.0 | `PASS_PLAN_PERSISTED` | PASS |
| 1.1 | `PASS_CANONICAL_BASELINE` | PASS |
| 2.0 | `PASS_ISOLATED_ROUTE_HARNESS` | PASS |
| 2.1–2.4 | composición/provenance | PASS con incidentes de control plane ya cerrados |
| 2.5 | `GO_LAB_CANDIDATE_VISIBLE` | GO técnico |
| 2.6 | captura legal automática | diferido no bloqueante |
| 2.7 | `AUTH_VISUAL_REVIEW_LAB` | activo read-only; feedback humano pendiente |
| 3.0 | `OPS_LEADS_BACKEND_LAB_COMPLETE` | PASS |
| 3.1 | Auth autoadministrable | PASS 7/7 |
| 4.0 | `PASS_COBROS_FULL_REPLAY` | 132/365; 233 requieren evidencia |
| 4.1 | `COBROS_REAL_LEDGER_COMPLETE` | bloqueado hasta 365/365 y autorización de escritura |
| 5.0 | `RC_ACCUMULATIVE_MODULES_COMPLETE` | pendiente |
| 6.0 | `RELEASE_CANDIDATE_ACCEPTED` | pendiente |
| 7.0 | `GO_PRODUCTION_A&S` | bloqueado hasta autorización |

## 13. Pendientes diferidos no bloqueantes

- recaptura automática histórica del modal legal;
- actualización visual completa de la lección de Academia sobre Auth;
- autoservicio universal del importador para toda fuente no tabular;
- rebranding Gravicentra conforme a su nota rectora;
- mejoras cosméticas que no afecten operación, seguridad ni permisos.

## 14. Regla de actualización

Cada iteración actualiza avance, fuente, implementación, evidencia, gate, estado, ledger, plan, Academia, acumulado Claude y PR. No se reabre una auditoría general ni se convierte un problema de captura en bloqueo artificial del producto.
