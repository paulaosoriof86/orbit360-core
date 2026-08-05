# PLAN ÚNICO DE SALIDA — RC-AYS-LAB-CANONICA-01

Fecha de adopción: 2026-08-04  
Última actualización: 2026-08-05 18:00 GT  
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

### Ops/Leads

```text
Gate: OPS_LEADS_BACKEND_LAB_COMPLETE
Estado: PASS
```

### Auth autoadministrable

```text
run: 31051061883
GO_GATE_CONTRACT: 43/43 PASS
usuarios/identidades/memberships/Equipo: 7/7
logins/cambio obligatorio: 7/7
CRM: VERIFIED_UNCHANGED
```

Auth solo se reabre si la revisión visual demuestra un defecto concreto.

## 4. Candidata visual vigente

```text
https://ays-orbit-360-lab.web.app/?orbitBackend=firestore-lab&tenant=alianzas-soluciones#/inicio
```

### Bloque 2.7 — revisión visual post-Auth

```text
Gate lógico: AUTH_VISUAL_REVIEW_LAB
Estado: ACTIVE_READ_ONLY
```

Matriz:

| Perfil | Viewport | Revisión |
|---|---:|---|
| Dirección | 1440 × 1000 | administración, Equipo, módulos acumulados |
| Operativo | 1024 × 768 | operación diaria, Cobros, Ops/Leads |
| Asesor | 390 × 844 | clientes propios, menú móvil, scopes |

Criterios:

- login real sin credenciales demo;
- cambio obligatorio de contraseña claro;
- acuerdo legal una sola vez;
- rol, identidad, menú y scopes correctos;
- Cliente 360 y Aseguradoras completos;
- responsive sin recortes críticos;
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

## 6. Bloque 4.1 — materialización durable de Cobros

```text
Gate objetivo: COBROS_REAL_LEDGER_COMPLETE
Estado: PENDIENTE AUTORIZACIÓN EXPLÍCITA
```

Alcance permitido a preparar, no ejecutar:

1. snapshot previo de colecciones objetivo;
2. censo de los 5 cobros existentes;
3. idempotencia por fuente/fila/recibo;
4. materialización de las 128 propuestas de secuencia solo si el gate las valida como autorizables;
5. tratamiento separado de los 2 post-corte;
6. tratamiento separado de las 2 propuestas de planilla;
7. creación/preservación de 233 HOLD, sin aplicarlos como cobros;
8. operación atómica;
9. post-verificación;
10. rollback exacto;
11. cero Rules, reimportación, producción, main o merge.

La autorización deberá distinguir:

```text
propuesta de conciliación
HOLD
cobro confirmado
```

No se hará una autorización por fila. Será un macrobloque único y acotado.

## 7. Bloque 5.0 — RC acumulativa

Se activa cuando existan:

```text
PASS_VISUAL_POST_AUTH
+
COBROS_REAL_LEDGER_COMPLETE
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

## 8. Bloque 6.0 — aceptación de release candidate

Incluye:

1. visualización final A&S;
2. checklist funcional y visual por rol;
3. conteos e integridad;
4. pendientes diferidos no bloqueantes;
5. backup y rollback preparados;
6. aceptación explícita de Paula.

Salida:

```text
RELEASE_CANDIDATE_ACCEPTED
```

## 9. Bloque 7.0 — go-live

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

## 10. Carriles

### Carril A

Revisión visual post-Auth activa; feedback humano pendiente.

### Carril B

Auth cerrado. Owners read-only de Cobros corregidos. Backend desplegado sin cambios posteriores.

### Carril C

Bloque 4.0 cerrado 365/365. Preparación source-only del gate 4.1 es la siguiente acción técnica.

## 11. Estado vivo

| Bloque | Gate | Estado |
|---|---|---|
| 1.0–1.1 | plan/baseline | PASS |
| 2.0–2.5 | composición/candidata LAB | PASS técnico |
| 2.6 | recaptura legal automática | diferido no bloqueante |
| 2.7 | `AUTH_VISUAL_REVIEW_LAB` | activo; feedback pendiente |
| 3.0 | `OPS_LEADS_BACKEND_LAB_COMPLETE` | PASS |
| 3.1 | Auth autoadministrable | PASS 7/7 |
| 4.0 | `PASS_COBROS_FULL_REPLAY` | PASS 365/365 read-only |
| 4.1 | `COBROS_REAL_LEDGER_COMPLETE` | pendiente autorización |
| 5.0 | `RC_ACCUMULATIVE_MODULES_COMPLETE` | pendiente |
| 6.0 | `RELEASE_CANDIDATE_ACCEPTED` | pendiente |
| 7.0 | `GO_PRODUCTION_A&S` | bloqueado |

## 12. Siguiente acción exacta

En paralelo:

```text
A. recibir feedback visual y clasificar cada hallazgo
B. preparar source-only el contrato/gate del Bloque 4.1
```

No ejecutar escrituras ni deploy hasta recibir autorización explícita.

## 13. Pendientes diferidos no bloqueantes

- recaptura histórica del modal legal;
- incorporación visual de la lección Academia Auth/Cobros;
- autoservicio universal del importador no tabular;
- liberación progresiva de los 233 HOLD cuando existan reportes detallados;
- rebranding Gravicentra conforme a nota rectora;
- mejoras cosméticas sin impacto operativo.

## 14. Regla de actualización

Cada iteración actualiza avance, fuente, implementación, evidencia, gate, estado, Plan, PR, Academia y acumulado Claude. Un problema del capturador no bloquea producto y un HOLD no se convierte en cobro por presión de cierre.
