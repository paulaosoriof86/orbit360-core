# ESTADO ACTIVO — BLOQUE 4.0 · REPLAY COMPLETO READ-ONLY DE COBROS

Actualizado: 2026-08-05  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate objetivo: `PASS_COBROS_FULL_REPLAY`  
Estado: `ACTIVE_READ_ONLY_PROGRESS_REQUIRES_MORE_EVIDENCE`

## Frente paralelo de revisión visual

La candidata vigente está disponible en:

```text
https://ays-orbit-360-lab.web.app/?orbitBackend=firestore-lab&tenant=alianzas-soluciones#/inicio
```

Auth autoadministrable está cerrado. La revisión visual humana continúa en paralelo y no altera este carril.

## Universo canónico

```text
pagos reportados: 365
cobros ya materializados preservados: 5
HOLD de calendario preservados: 44
Firestore/Auth/operational writes: 0
deploys: 0
reimportación: 0
producción/main/merge: no
```

Fuente privada canónica verificada:

```text
ORBIT360-AYS-RECIBOS-CARTERA-CANONICAL-PRIVATE-20260730
sizeBytes: 443105
pagos reportados: 365
cartera canónica: 641
```

Fuente privada normalizada de planillas:

```text
archivos recibidos: 19
paquetes: 10
filas: 67
elegibles CRM: 65
paquete incompleto: 1
planilla sin factura: 1
```

## Avance real del overlay

```text
secuencia de cartera: 128
pagos posteriores al corte: 2
propuestas únicas por planilla detallada: 2
pagos explicados: 132
pagos pendientes de evidencia adicional: 233
invariante: 128 + 2 + 2 + 233 = 365
```

Resultado vigente:

```text
stage: COBROS_OVERLAY_PROGRESS
classification: READ_ONLY_PROGRESS_REQUIRES_MORE_EVIDENCE
rowLedgerCount: 365
rowLedgerDigest: 3f129242c34934b3f87009a1d0cb4bded6861b376f3719349831d770b7825f5f
ok: false
```

`ok:false` es correcto: el gate no puede declararse PASS mientras queden 233 pagos sin evidencia suficiente.

## Causa raíz detectada y corregida

Clasificación:

```text
DATA_CONTRACT_FAILURE
```

El owner v1 podía aplicar la primera fila de una planilla cuando la combinación póliza/moneda/periodo aparecía repetida. Eso podía crear una propuesta falsa aunque la fuente no fuera unívoca.

Root fix:

```text
tools/orbit360-cobros-overlay-readonly-v2-20260805.mjs
tools/orbit360-test-cobros-overlay-source-v2-20260805.mjs
```

Regla v2:

- una clave de planilla repetida nunca genera conciliación;
- las filas repetidas quedan en `PLANILLA_DETAIL_AMBIGUOUS_HOLD`;
- solo una clave fuente única contra un único pago pendiente puede producir propuesta;
- reversos, ceros, coincidencias por periodo y fuentes incompletas permanecen separados;
- ninguna propuesta escribe datos.

Prueba source-only:

```text
PASS_COBROS_OVERLAY_SOURCE_ONLY_V2
16 PASS
0 FAIL
duplicateSourceKeyProtection: true
```

## Clasificación de las 67 filas de planilla

```text
PLANILLA_ZERO_OMIT: 2
PLANILLA_PERIOD_ONLY: 29
PLANILLA_REVERSAL_HOLD: 2
PLANILLA_DETAIL_AMBIGUOUS_HOLD: 10
PLANILLA_DETAIL_CANDIDATE: 24
```

Resultado del cruce:

```text
propuestas únicas: 2
filas con clave fuente ambigua: 10
claves destino ambiguas: 0
filas detalladas sin pago pendiente correspondiente: 22
```

Una planilla de comisiones prueba recaudo únicamente cuando existe detalle suficiente y enlace unívoco. Una factura o resumen agregado no crea cobros individuales.

## Segmentación de los 233 pendientes

```text
GTQ: 209
COP: 24
pólizas distintas: 124
fuente Recibos por fecha límite: 154
fuente Cobranza efectuada histórica: 79
```

Prioridad por aseguradora:

| Aseguradora | País | Pendientes |
|---|---:|---:|
| Aseguradora Guatemalteca | GT | 41 |
| Seguros El Roble | GT | 38 |
| Seguros Columna | GT | 30 |
| Mapfre Seguros Guatemala | GT | 22 |
| Seguros G&T | GT | 17 |
| Aseguradora General | GT | 16 |
| Aseguradora La Ceiba | GT | 16 |
| Seguros Ficohsa | GT | 14 |
| Seguros Universales | GT | 9 |
| Aseguradora Rural | GT | 8 |
| Resto GT/CO | Mixto | 22 |

Las tres primeras concentran 109 de los 233 casos.

## Readiness del importador recurrente

Estado vigente:

```text
GO_ASSISTED_MONTHLY_INTAKE
NOT_YET_GO_UNIVERSAL_SELF_SERVICE
```

Se conservan:

- staging y dry-run;
- hash e idempotencia;
- separación por tipo de fuente;
- confirmación humana;
- rollback antes del consumo;
- prohibición banco → cobro directo;
- prohibición histórico financiero → cobro;
- soporte agregado solo como HOLD/propuesta.

Pendientes de producto, sin bloquear este replay:

```text
DATA_CONTRACT_FAILURE
- identidad de fuente debe aceptar policyId, policyNumber, recibo o referencia de contraparte según contrato.

FUNCTIONAL_DEFECT
- editor completo de mapeo corregible y perfiles reutilizables por aseguradora/formato aún no demostrado end-to-end;
- extracción de documentos no tabulares aún no demostrada end-to-end.
```

## Evidencias vigentes

```text
runtime-gate-crm-v20260716/cobros-replay-inferencial-sanitizado-v20260804.json
runtime-gate-crm-v20260716/cobros-overlay-source-test-v2-sanitized-v20260805.json
runtime-gate-crm-v20260716/cobros-overlay-private-readonly-sanitized-v20260805.json
runtime-gate-crm-v20260716/cobros-unresolved-segmentation-sanitized-v20260805.json
```

## Criterio de salida

```text
PASS_COBROS_FULL_REPLAY
365 pagos explicados sin doble conteo
5 cobros existentes preservados
HOLD explícitos
cero escrituras
ledger sanitizado
```

## Siguiente acción exacta

1. Recuperar y cruzar únicamente reportes detallados de pago o recibo por aseguradora para los 233 pendientes.
2. Priorizar Aseguradora Guatemalteca, El Roble y Columna: 109 casos.
3. Mantener facturas, resúmenes agregados, banco e histórico financiero fuera de la aplicación automática de cobros.
4. Reejecutar el mismo owner v2 sobre la misma base canónica, sin crear otro algoritmo paralelo.
5. Solo con 365/365 preparar el Bloque 4.1 de materialización durable, sujeto a autorización explícita separada.
