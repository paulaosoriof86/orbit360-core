# ESTADO ACTIVO — BLOQUE 4.0 · REPLAY COMPLETO READ-ONLY DE COBROS

Fecha local: 2026-08-05 07:04 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate: `PASS_COBROS_FULL_REPLAY`  
Estado: `ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL`

## Punto de partida cerrado

Bloque 3.0 Ops/Leads durable quedó cerrado mediante evidencia funcional reutilizada y despliegue actual verificado. No se requiere otro runtime, deploy o visual para iniciar Cobros.

La revisión manual de la candidata continúa disponible en paralelo:

```text
https://ays-orbit-360-lab--orbit360-operational-block12-w8ibrr6w.web.app
```

El modal legal no bloquea la continuidad técnica. La aceptación se realiza una sola vez en la sesión humana.

## Universo vigente

```text
pagos reportados: 365
conciliaciones propuestas por secuencia de cartera: 128
pagos válidos posteriores al corte: 2
pendientes de overlay adicional: 235
cobros ya materializados: 5
HOLD conocidos: 44
```

Los 235 no son un resultado final. Deben cruzarse con las planillas vigentes y reportes directos, preservando los 128 + 2 ya explicados y los 5 cobros existentes, sin duplicidad.

## Avance visible de la ingesta mensual

La recepción de archivos mensuales queda activa sin esperar a que estén todos los documentos.

Fuente detallada procesada read-only:

```text
Planilla G&T julio
filas: 8
coincidencias exactas contra calendario: 8
filas ya fuera de cartera: 7
nueva propuesta de conciliación: 1
```

Nueva propuesta:

```text
póliza: AUTO-519815
cuota: 10/10
moneda: GTQ
monto planilla: 600.31
estado previo: futuro_pendiente
decisión: PROPOSE_COMMISSION_RECOGNITION_NO_WRITE
```

Fuentes agregadas:

```text
Aseguradora General julio: soporte agregado/HOLD
Factura El Roble julio: soporte de facturación de comisiones/HOLD
```

Ninguna de estas fuentes agregadas crea cobros individuales.

## Readiness del importador recurrente

Verificado en LAB:

- Excel, CSV, PDF, Word e imagen;
- hash e idempotencia;
- staging y dry-run;
- confirmación humana;
- rollback antes del consumo;
- tipos separados para calendario, pagos, cartera, comisiones, banco y soporte;
- prohibición de banco → cobro directo;
- Function LAB y feature flag activas.

Decisión honesta:

```text
GO_ASSISTED_MONTHLY_INTAKE
NOT_YET_GO_UNIVERSAL_SELF_SERVICE
```

Causas raíz abiertas, sin bloquear la recepción desde ChatGPT:

```text
DATA_CONTRACT_FAILURE
- el backend exige policyId de forma general, aunque algunas fuentes traen policyNumber, recibo o referencia de contraparte.

FUNCTIONAL_DEFECT
- no está demostrado el editor completo de mapeo corregible y perfiles reutilizables por aseguradora/formato;
- la extracción backend de documentos no tabulares no está demostrada de extremo a extremo.
```

Owners:

```text
functions/recurring-insurance-import.js
orbit360-platform/modules/importar-recurring-bridge-v20260804.js
orbit360-platform/core/recurring-insurance-document-extractor.js
```

## Alcance

1. Recuperar únicamente fuentes privadas vigentes ya disponibles.
2. Aplicar el replay inferencial completo sobre el mismo contrato.
3. Cruzar cartera, planillas y reportes directos por póliza, vigencia, moneda, cuota y evidencia.
4. Clasificar cada pago como confirmado, inferido, pendiente o HOLD.
5. Mantener trazabilidad y razón de cada decisión.
6. Emitir evidencia sanitizada y conteo final.
7. Preparar source-only el root fix del importador mensual sin alterar la candidata visible.

## Restricciones

```text
Firestore writes: 0
Auth writes: 0
aplicación de cobros: 0
modificación de recibos: 0
reimportación: 0
deploy Functions: 0
deploy Hosting: 0
Rules: no
producción/main/merge: no
```

No utilizar estados bancarios aislados para crear cobros. No convertir ausencia en conciliación. No escribir desde histórico financiero. No duplicar los cinco cobros existentes.

## Owners del replay

```text
replay completo: tools/orbit360-cobros-full-replay-v20260804.mjs
inferencia secuencial: tools/orbit360-cobros-inferencia-secuencial-v20260804.mjs
contrato: tools/orbit360-cobros-full-materialization-contract-v20260804.json
evidencia previa: runtime-gate-crm-v20260716/cobros-full-replay-*.json
readiness mensual: runtime-gate-crm-v20260716/bloque4-ingesta-mensual-readiness-sanitizada-v20260805.json
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

1. Incorporar la propuesta G&T al ledger sanitizado sin escritura.
2. Continuar la clasificación exhaustiva de los 365 pagos.
3. Mantener los agregados en soporte/HOLD.
4. Preparar el root fix source-only de identidad por tipo de fuente, mapeo corregible y perfiles reutilizables.
5. Solo después preparar el Bloque 4.1 de materialización durable, que requiere autorización separada de escritura.
