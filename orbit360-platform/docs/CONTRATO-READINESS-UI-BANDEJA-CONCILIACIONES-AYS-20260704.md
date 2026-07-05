# Contrato backend/frontend — Readiness UI/Bandeja `conciliaciones`

**Fecha:** 2026-07-04  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** generador de readiness agregado. Sin writes, sin pagos, sin mutación de `cobros`.

---

## 1. Objetivo

Definir el contrato mínimo para una futura bandeja visual de `conciliaciones` conectada a backend LAB.

El bloque transforma documentos `conciliaciones/auditLog` en un reporte de readiness UI con:

- columnas obligatorias;
- estados visibles;
- acciones permitidas por estado;
- acciones bloqueadas siempre;
- validaciones de país/moneda;
- trazabilidad de fuente;
- errores y advertencias.

---

## 2. Herramientas agregadas

```txt
tools/orbit360-generar-readiness-bandeja-conciliaciones-ays.mjs
tools/orbit360-test-generar-readiness-bandeja-conciliaciones-ays.mjs
```

---

## 3. Entrada esperada

Puede operar con:

```txt
--mirror _orbit360_reports/LAB-MIRROR-CONCILIACIONES-AYS.local.json
```

o sin mirror, usando datos sintéticos internos.

El mirror debe contener:

```txt
conciliaciones[]
auditLog[]
meta
```

---

## 4. Columnas obligatorias para la bandeja

```txt
estado_bandeja
estado_revision
score
decision_score
fuente
archivo
fila
pais_moneda
cliente_poliza_recibo
monto
accion_propuesta
responsable
ultima_actualizacion
acciones_permitidas
bloqueos
```

---

## 5. Estados de bandeja soportados

```txt
PROPUESTA
EN_REVISION
VALIDADA
RECHAZADA
BLOQUEADA
ANULADA
APLICADA
```

Regla: `APLICADA` solo debe aparecer como histórico/consulta. No debe ofrecer acciones de aplicación desde la bandeja.

---

## 6. Estados de revisión soportados

```txt
PENDIENTE
REQUIERE_VALIDACION
VALIDADA
RECHAZADA
BLOQUEADA
```

---

## 7. Matriz de acciones permitidas

```txt
PROPUESTA   -> ver_detalle, tomar_en_revision, bloquear, anular
EN_REVISION -> ver_detalle, validar, rechazar, bloquear, anular
VALIDADA    -> ver_detalle, preparar_aplicacion_controlada, rechazar, anular
RECHAZADA   -> ver_detalle
BLOQUEADA   -> ver_detalle
ANULADA     -> ver_detalle
APLICADA    -> ver_detalle
```

`preparar_aplicacion_controlada` no aplica pago. Solo prepara el paso posterior, que exige transición validada y autorización explícita.

---

## 8. Acciones bloqueadas siempre

```txt
aplicar_pago_directo
marcar_cobro_pagado_desde_bandeja
mutar_cobros_sin_transicion
editar_payload_fuente
cambiar_moneda_sin_validacion
mezclar_fuentes
```

---

## 9. Validaciones

El readiness bloquea si:

- falta `id/proposal_id`;
- tenant distinto de `alianzas-soluciones`;
- estado de bandeja inválido;
- score inválido;
- score_decision inválido;
- falta país/moneda;
- país/moneda incoherente;
- falta fuente;
- falta archivo/fila de trazabilidad;
- aparece `APLICADA` como elemento operativo.

Advierte si:

- `VALIDADA` todavía necesita validación de transición antes de preparar aplicación;
- `BLOQUEADO` no está alineado con `queue_state: BLOQUEADA`;
- hay estado de revisión no estándar.

---

## 10. Uso

```bash
node tools/orbit360-generar-readiness-bandeja-conciliaciones-ays.mjs
node tools/orbit360-generar-readiness-bandeja-conciliaciones-ays.mjs --mirror _orbit360_reports/LAB-MIRROR-CONCILIACIONES-AYS.local.json
```

Pruebas sintéticas:

```bash
node tools/orbit360-test-generar-readiness-bandeja-conciliaciones-ays.mjs
```

---

## 11. Decisiones posibles

```txt
READINESS_OK
READINESS_OK_CON_ADVERTENCIAS
READINESS_BLOQUEADO
```

---

## 12. Alcance honesto

Este bloque no crea todavía el módulo visual. Define el contrato backend/frontend y el reporte de readiness para que la futura UI no improvise columnas, estados ni acciones.

No hace:

- writes Firestore;
- cambios en `cobros`;
- aplicación de pagos;
- cambios en comisiones;
- notificaciones;
- render visual en navegador;
- deploy;
- merge.

---

## 13. Siguiente bloque recomendado

Crear módulo/bridge de bandeja:

```txt
readiness -> módulo/bandeja -> tabla segura -> detalle -> acciones de revisión sin aplicar pagos
```

Si Claude tiene capacidad, este contrato puede entregarse para que construya la UI visual respetando la matriz y sin tocar backend protegido.