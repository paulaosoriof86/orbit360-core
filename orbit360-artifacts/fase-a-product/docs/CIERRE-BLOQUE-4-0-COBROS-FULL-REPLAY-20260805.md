# CIERRE BLOQUE 4.0 — REPLAY COMPLETO READ-ONLY DE COBROS

Fecha: 2026-08-05  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Decisión

```text
PASS_COBROS_FULL_REPLAY
GO_COBROS_LEDGER_COMPLETE_NO_WRITES
```

## Resultado

```text
pagos reportados canónicos: 365
propuestas por secuencia de cartera: 128
pagos posteriores al corte: 2
propuestas únicas por planilla detallada: 2
HOLD por pago reportado sin enlace único a recibo: 233
requiere validación: 0
filas explicadas: 365
filas sin categoría: 0
```

Invariante:

```text
128 + 2 + 2 + 233 = 365
```

## Interpretación operativa

El PASS significa que cada fila de la fuente quedó censada y terminó en una categoría contractual. No significa que existan 365 cobros confirmados ni que los 233 HOLD puedan aplicarse automáticamente.

Los 233 HOLD tienen evidencia de pago reportado en la fuente canónica, pero no una relación unívoca suficiente con un recibo operativo. Permanecen preservados para futura conciliación y no se escriben en `cobros`.

## Causa raíz y corrección

### Hallazgo 1

```text
DATA_CONTRACT_FAILURE
```

Una combinación repetida de póliza, moneda y periodo en planilla podía tomar arbitrariamente la primera fila.

Corrección:

```text
tools/orbit360-cobros-overlay-readonly-v2-20260805.mjs
```

Toda clave fuente repetida queda en `PLANILLA_DETAIL_AMBIGUOUS_HOLD`. Solo una fuente única contra un pago pendiente único puede producir propuesta.

### Hallazgo 2

Las filas autoritativas sin enlace único permanecían como `UNRESOLVED_NEEDS_ADDITIONAL_EVIDENCE`, aunque el contrato exige que toda fila termine vinculada, propuesta, HOLD, omitida o en validación.

Corrección terminal:

```text
tools/orbit360-cobros-overlay-hold-finalizer-v20260805.mjs
```

Regla:

```text
pago_reportado
+ no_pendiente
+ fuera de cartera
+ fuente SIGA
+ calidad SIGA_ESTADO_PAGO_O_HOLD
= HOLD_REPORTED_PAYMENT_NO_UNIQUE_RECEIPT_LINK
```

Esta clasificación preserva el pago reportado, exige evidencia adicional para aplicarlo y evita crear un cobro falso.

## Evidencia

```text
rowLedgerCount: 365
rowLedgerDigest: 96d7105912234de14deb5ad0190e537c1b71570519d086616acc9122cb2ca381
existingMaterializedCobrosPreserved: 5
calendarHoldsPreserved: 44
```

Owners y pruebas:

```text
tools/orbit360-cobros-overlay-readonly-v2-20260805.mjs
tools/orbit360-test-cobros-overlay-source-v2-20260805.mjs
tools/orbit360-cobros-overlay-hold-finalizer-v20260805.mjs
tools/orbit360-test-cobros-overlay-hold-finalizer-v20260805.mjs
```

Evidencias sanitizadas:

```text
runtime-gate-crm-v20260716/cobros-overlay-source-test-v2-sanitized-v20260805.json
runtime-gate-crm-v20260716/cobros-hold-finalizer-source-test-sanitized-v20260805.json
runtime-gate-crm-v20260716/cobros-full-replay-final-sanitized-v20260805.json
runtime-gate-crm-v20260716/cobros-unresolved-segmentation-sanitized-v20260805.json
```

## Frontera respetada

```text
Firestore writes: 0
Auth writes: 0
operational writes: 0
cobros aplicados: 0
recibos modificados: 0
reimportación: 0
Functions/Hosting deploy: 0
Rules: 0
producción/main/merge: 0
PII/secretos/passwords en evidencia: 0
```

## Carriles

### Carril A

La revisión visual post-Auth continúa en paralelo y espera feedback humano.

### Carril B

Los owners read-only y los validadores del replay quedaron corregidos. No se modificó backend desplegado.

### Carril C

El universo de 365 pagos quedó completamente clasificado y trazable. Las fuentes faltantes servirán para liberar HOLD futuros, no para reabrir el censo.

## Academia

Clasificación:

```text
ACADEMIA_ACTUALIZAR
```

Debe enseñar:

- diferencia entre pago reportado, propuesta de conciliación, HOLD y cobro confirmado;
- por qué una planilla, un banco o la desaparición de cartera no aplican un cobro automáticamente;
- correspondencia uno a uno;
- trazabilidad, confirmación humana y rollback;
- diferencia entre defecto funcional y contrato de datos insuficiente.

## Siguiente acción exacta

```text
BLOQUE 4.1
COBROS_REAL_LEDGER_COMPLETE
PENDIENTE AUTORIZACIÓN EXPLÍCITA DE ESCRITURA EN LAB
```

El Bloque 4.1 debe preparar y materializar únicamente las propuestas autorizables, conservar los 233 HOLD, usar snapshot, idempotencia, operación atómica, post-verificación y rollback. No se ejecuta por este cierre.
