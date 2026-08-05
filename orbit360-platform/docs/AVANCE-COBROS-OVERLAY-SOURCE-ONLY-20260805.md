# AVANCE COBROS — OVERLAY MULTIFUENTE SOURCE-ONLY

Fecha: 2026-08-05 16:52 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Gate objetivo: `PASS_COBROS_FULL_REPLAY`

## Clasificación

```text
DATA_CONTRACT_FAILURE
```

El replay base clasificaba los 365 pagos de forma demasiado general y no podía empalmar de manera determinista la evidencia secuencial, los pagos posteriores al corte y las planillas detalladas. Esto impedía cerrar el universo sin mezclar comisiones, reversos, soportes agregados o coincidencias solamente por periodo.

## Implementación source-only

Owners incorporados:

```text
tools/orbit360-cobros-overlay-readonly-v20260805.mjs
tools/orbit360-test-cobros-overlay-source-v20260805.mjs
```

El overlay aplica esta precedencia:

1. pago identificado en ledger secuencial;
2. pago válido posterior al corte;
3. detalle de planilla con una sola coincidencia por póliza, moneda y periodo;
4. coincidencias ambiguas permanecen pendientes;
5. reversos permanecen en HOLD;
6. filas sin comisión se omiten como evidencia financiera;
7. coincidencias solo por periodo no aplican cobros;
8. fuentes incompletas o agregadas permanecen en HOLD.

## Prueba source-only

```text
PASS_COBROS_OVERLAY_SOURCE_ONLY
14 PASS
0 FAIL
```

La prueba de fixture confirmó:

```text
pagos canónicos: 365
secuencia preservada: 128
post-corte preservados: 2
propuesta detallada única de prueba: 1
explicados en fixture: 131
pendientes en fixture: 234
cobros materializados preservados: 5
HOLD de calendario preservados: 44
Firestore/Auth/operational writes: 0
deploys: 0
producción: 0
```

Esta evidencia no afirma que el overlay privado ya haya sido ejecutado. El fixture verifica el contrato, la precedencia y los bloqueos antes de usar las fuentes privadas.

## Fuentes privadas recuperadas

1. `DRY-RUN-RECIBOS-CARTERA-CONCILIADO-AYS-20260730.xlsx`.
2. `ORBIT360-COBROS-REPLAY-INFERENCIAL-SANITIZADO-20260804.xlsx`.
3. `DRY-RUN-PRIVADO-PLANILLAS-COMISIONES-20260801.xlsx`.

Conteos preservados:

```text
pagos reportados: 365
secuencia de cartera: 128
posteriores al corte: 2
pendientes antes del overlay: 235
planillas: 19 archivos / 10 paquetes / 67 filas / 65 elegibles CRM
cobros existentes: 5
HOLD conocidos: 44
```

## Frontera

```text
Firestore writes: 0
Auth writes: 0
cobros aplicados: 0
recibos modificados: 0
reimportación: 0
Functions/Hosting deploy: 0
Rules: 0
producción/main/merge: 0
```

## Siguiente acción exacta

Ejecutar el overlay read-only contra las tres fuentes privadas recuperadas, validar digest y unicidad, producir el ledger sanitizado de 365 filas y recalcular únicamente con evidencia real:

```text
explicados
pendientes
HOLD
omisiones
propuestas de conciliación
```

No preparar escritura durable hasta obtener `PASS_COBROS_FULL_REPLAY` con 365/365 clasificados sin doble conteo.
