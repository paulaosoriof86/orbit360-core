# CONTINUIDAD DE INGESTA MENSUAL — FACTURAS, PLANILLAS Y ESTADOS DE CUENTA

Fecha: 2026-08-05  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Decisión operativa

La recepción mensual no debe esperar a que estén todos los archivos. Cada documento puede incorporarse a la cola de análisis desde el momento en que se recibe, individualmente o en un lote posterior.

```text
archivo individual: permitido
varios archivos juntos: permitido
esperar cierre mensual completo: no requerido
deduplicación: hash de archivo + periodo + tipo de fuente
aplicación automática de cobros: prohibida
```

## Cómo debe clasificar Orbit cada archivo

| Documento recibido | Tipo de fuente | Resultado inicial |
|---|---|---|
| Calendario o requerimientos de recibos | `receipt_schedule` | propone calendario y diferencias |
| Reporte de pagos del sistema o aseguradora | `reported_payments` / `insurer_payment_report` | crea evidencia y propuesta de conciliación |
| Estado de cartera | `portfolio_statement` | determina obligaciones pendientes y secuencias comprobables |
| Planilla de comisiones con detalle por póliza/recibo | `commission_statement` | reconoce evidencia de recaudo; no aplica cobro sin confirmación |
| Estado de cuenta bancario | `bank_statement` | soporte de contraparte; nunca crea cobro aislado |
| Factura de comisiones o resumen agregado | `supporting_document` | soporte agregado/HOLD; no crea cobros individuales |

## Flujo esperado dentro de la plataforma

1. Seleccionar el tipo de fuente.
2. Subir Excel, CSV, PDF, Word o imagen.
3. Calcular hash y conservar archivo, hoja, bloque y fila.
4. Detectar encabezados y sinónimos.
5. Proponer mapeo.
6. Ejecutar dry-run con `listo`, `requiere validación` y `omitir`.
7. Confirmar únicamente evidencia autorizada.
8. Revisar la propuesta en Conciliaciones.
9. Aplicar al recibo solo mediante confirmación separada.
10. Permitir rollback mientras la evidencia no haya sido consumida.

## Estado técnico verificado

Ya existen y están activos en LAB:

- cliente de importaciones recurrentes;
- extractor para Excel, CSV, PDF, Word e imágenes;
- hash de fuente e idempotencia;
- staging y dry-run;
- confirmación humana;
- rollback antes del consumo;
- Function LAB `orbit360RecurringInsuranceImportLabV20260804`;
- bandera `recurringInsuranceImportActive`;
- prohibición de convertir banco directamente en cobro o movimiento financiero.

## Diferencia que se corrige en paralelo

El flujo asistido está operativo, pero todavía no corresponde afirmar `GO_UNIVERSAL_SELF_SERVICE`.

Clasificación:

```text
DATA_CONTRACT_FAILURE
FUNCTIONAL_DEFECT
```

Hallazgos:

1. El contrato backend exige actualmente `policyId` de forma general. Una planilla suele traer número de póliza, un banco puede traer referencia de contraparte y una factura agregada puede no identificar una póliza individual. La validación debe depender del tipo de fuente.
2. La interfaz recurrente no demuestra todavía un editor completo para corregir el mapeo propuesto y guardar perfiles reutilizables por aseguradora/formato.
3. Un PDF no tabular puede quedar marcado para extracción backend, pero el circuito backend de esa extracción no está demostrado de extremo a extremo.

Estos puntos no bloquean la recepción desde ChatGPT ni los archivos estructurados que la plataforma ya puede procesar. Sí deben cerrarse antes de declarar que cualquier archivo variable puede importarse de forma totalmente autónoma.

## Primer avance del mes de agosto

La planilla detallada G&T correspondiente a julio contiene ocho filas y cruza exactamente contra ocho cuotas del calendario canónico.

```text
filas detalladas: 8
coincidencias exactas: 8
ya fuera de cartera: 7
nueva propuesta: 1
```

Nueva propuesta read-only:

```text
póliza: AUTO-519815
cuota: 10/10
moneda: GTQ
monto planilla: 600.31
estado previo calendario: futuro_pendiente
resultado: PROPOSE_COMMISSION_RECOGNITION_NO_WRITE
```

La factura de El Roble y el resumen de Aseguradora General son agregados. Se conservan como soporte documental/HOLD y no se usan para aplicar pagos individuales.

## Cómo enviar las nuevas fuentes

Paula puede enviarlas a medida que las recibe. Para cada envío basta con indicar, en lenguaje normal:

```text
“Nuevo archivo de agosto — planilla de comisiones de [aseguradora]”
“Nuevo estado de cartera de [aseguradora] — corte [fecha]”
“Nuevo estado de cuenta bancario — [banco] — periodo [mes]”
“Factura de comisiones de [aseguradora] — periodo [mes]”
```

No necesita preparar plantillas ni renombrar columnas. El proceso registra la fuente, evita duplicados, clasifica el documento y mantiene el acumulado mensual.

## Frontera vigente

```text
Firestore writes: 0
Auth writes: 0
cobros aplicados: 0
recibos modificados: 0
reimportación: 0
deploy: 0
Rules: no
producción/main/merge: no
```

## Siguiente acción exacta

1. Incorporar la planilla G&T al ledger sanitizado de propuestas.
2. Continuar la explicación exhaustiva de los 365 pagos reportados.
3. Mantener agregados en soporte/HOLD.
4. Preparar el root fix source-only del contrato de identidad por tipo de fuente, perfiles reutilizables y mapeo corregible.
5. Reservar cualquier escritura o deploy para un gate y autorización separados.
