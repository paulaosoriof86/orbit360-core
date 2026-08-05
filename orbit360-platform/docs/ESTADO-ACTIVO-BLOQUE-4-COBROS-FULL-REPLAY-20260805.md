# ESTADO ACTIVO — BLOQUE 4.0 · REPLAY COMPLETO READ-ONLY DE COBROS

Actualizado: 2026-08-05 18:00 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado

```text
Gate: PASS_COBROS_FULL_REPLAY
Decisión: GO_COBROS_LEDGER_COMPLETE_NO_WRITES
Estado: CLOSED_PASS_READ_ONLY
```

## Universo cerrado

```text
pagos reportados canónicos: 365
propuestas por secuencia: 128
post-corte pendientes de confirmación: 2
propuestas por planilla detallada única: 2
HOLD sin enlace único a recibo: 233
requiere validación: 0
filas explicadas: 365
filas sin categoría: 0
```

```text
128 + 2 + 2 + 233 = 365
```

El PASS acredita censo, clasificación y trazabilidad de todas las filas. No convierte automáticamente los 233 HOLD en cobros.

## Fuentes

Fuente canónica privada:

```text
ORBIT360-AYS-RECIBOS-CARTERA-CANONICAL-PRIVATE-20260730
bytes: 443105
hojas: 8
pagos reportados: 365
cartera: 641
```

Planillas normalizadas:

```text
archivos recibidos: 19
paquetes: 10
filas: 67
elegibles CRM: 65
paquete incompleto: 1
planilla sin factura: 1
```

## Owners vigentes

```text
tools/orbit360-cobros-full-replay-v20260804.mjs
tools/orbit360-cobros-inferencia-secuencial-v20260804.mjs
tools/orbit360-cobros-overlay-readonly-v2-20260805.mjs
tools/orbit360-cobros-overlay-hold-finalizer-v20260805.mjs
```

Pruebas:

```text
PASS_COBROS_OVERLAY_SOURCE_ONLY_V2
PASS_COBROS_HOLD_FINALIZER_SOURCE_ONLY
```

## Correcciones de causa raíz

### Clave de planilla repetida

```text
clasificación: DATA_CONTRACT_FAILURE
```

Una misma combinación póliza/moneda/periodo no puede seleccionar arbitrariamente una fila. Toda clave repetida queda en `PLANILLA_DETAIL_AMBIGUOUS_HOLD`.

### Fila autoritativa sin enlace único

El contrato exige que toda fila termine vinculada, propuesta, HOLD, omitida o en validación. Una fila SIGA con pago reportado, sin pendiente y fuera de cartera, pero sin enlace unívoco a recibo, termina en:

```text
HOLD_REPORTED_PAYMENT_NO_UNIQUE_RECEIPT_LINK
```

No se aplica como cobro hasta que exista evidencia suficiente y autorización.

## Evidencia final

```text
rowLedgerCount: 365
rowLedgerDigest: 96d7105912234de14deb5ad0190e537c1b71570519d086616acc9122cb2ca381
cobros existentes preservados: 5
HOLD de calendario preservados: 44
```

Archivos:

```text
runtime-gate-crm-v20260716/cobros-full-replay-final-sanitized-v20260805.json
runtime-gate-crm-v20260716/cobros-hold-finalizer-source-test-sanitized-v20260805.json
docs/CIERRE-BLOQUE-4-0-COBROS-FULL-REPLAY-20260805.md
```

## Frontera

```text
Firestore writes: 0
Auth writes: 0
operational writes: 0
cobros aplicados: 0
recibos modificados: 0
reimportación: 0
deploys: 0
Rules: 0
producción/main/merge: 0
```

No se usó banco ni histórico financiero para crear cobros. Facturas y resúmenes agregados no producen aplicaciones individuales.

## Pendientes por fuente

Los 233 HOLD permanecen segmentados para futuras liberaciones:

```text
GTQ: 209
COP: 24
pólizas distintas: 124
Aseguradora Guatemalteca: 41
Seguros El Roble: 38
Seguros Columna: 30
```

Estos pendientes no reabren el censo. Los reportes detallados futuros podrán transformar HOLD concretos en propuestas mediante el mismo owner y trazabilidad.

## Carriles

### Carril A

Revisión visual post-Auth activa, pendiente feedback de Paula.

### Carril B

Owners source-only corregidos; backend desplegado no modificado.

### Carril C

Bloque 4.0 cerrado. Siguiente frontera: materialización durable limitada y autorizada.

## Siguiente acción exacta

```text
BLOQUE 4.1
COBROS_REAL_LEDGER_COMPLETE
PENDIENTE AUTORIZACIÓN EXPLÍCITA
```

Debe preparar y, solo tras autorización, materializar en LAB:

1. las propuestas autorizables del ledger;
2. los pagos post-corte en la categoría correspondiente;
3. los 233 HOLD sin convertirlos en cobros;
4. snapshot previo;
5. idempotencia;
6. operación atómica;
7. post-verificación;
8. rollback exacto;
9. cero producción.
