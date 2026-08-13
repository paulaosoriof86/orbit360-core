# Cierre — separación prototipo/tenant e importaciones recurrentes

Fecha: 2026-08-04  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Decisión

```text
CLAUDE_GENERIC_PACKAGE_NOT_BLOCKED_BY_TENANT_RECONCILIATION
TENANT_DATA_REMAINS_PRIVATE_OPERATIONAL_LANE
RECURRING_IMPORT_CONTRACT_SOURCE_IMPLEMENTED
RECURRING_IMPORT_SOURCE_VALIDATION_PASS_11_OF_11
AUGUST_AND_FUTURE_PERIODS_REUSE_SAME_PIPELINE
```

## 1. Separación obligatoria de carriles

### Prototipo comercializable

Recibe exclusivamente arquitectura, UX, contratos, estados, validadores, configuración y Academia reutilizables. No recibe datos, cifras, nombres, archivos, aseguradoras, clientes, pólizas, pagos ni resultados concretos de ningún tenant.

La preparación y entrega del paquete genérico a Claude no depende de cerrar conciliaciones privadas de A&S.

### Operación del tenant

Usa fuentes privadas para validar el contrato, descubrir defectos, completar datos y cerrar periodos. Sus conteos, hashes, archivos y resultados permanecen en el carril privado y no entran al paquete comercializable.

## 2. Contrato mensual reusable

```text
Fuente
→ detección de formato y encabezado
→ perfil/mapping por tenant y tipo de fuente
→ normalización
→ deduplicación
→ calidad y HOLD
→ dry-run
→ confirmación de evidencia
→ conciliación directa o inferencial
→ confirmación de aplicación
→ recibo/cartera/comisión
→ trazabilidad y rollback
```

La confirmación del lote crea evidencia canónica. No crea cobros, comisiones pagadas ni movimientos financieros automáticamente. La aplicación ocurre después en el dominio de Conciliaciones.

## 3. Fuentes admitidas

```text
receipt_schedule
reported_payments
insurer_payment_report
portfolio_statement
commission_statement
bank_statement
supporting_document
```

Formatos preparados en el extractor cliente:

- Excel y CSV;
- PDF con texto u OCR;
- Word;
- imagen con OCR;
- extracción estructurada asistida cuando el servicio inteligente está disponible.

Cuando la extracción no tiene confianza suficiente, el documento permanece en validación y no escribe registros operativos.

## 4. Garantías para agosto y periodos posteriores

- perfiles por tenant, aseguradora y tipo de fuente;
- mappings editables y reutilizables;
- idempotencia por tenant, tipo, hash y periodo;
- trazabilidad archivo/hoja/fila/bloque;
- país, moneda y periodo obligatorios;
- deduplicación dentro del lote;
- calidad y HOLD;
- dry-run obligatorio;
- confirmación humana;
- evidencia separada de la aplicación;
- rollback antes de consumo;
- banco sin contraparte no concilia;
- reversos y negativos no se aplican;
- ninguna aseguradora o persona está hardcodeada;
- el mismo contrato sirve tanto desde la plataforma como desde una ejecución asistida de emergencia.

## 5. Owners

### Backend protegido

- `functions/recurring-insurance-import.js`
- `functions/cobros-reconciliation-domain.js`
- `functions/bootstrap.js`

### Contratos y UX reusable

- `orbit360-platform/core/recurring-insurance-import-client.js`
- `orbit360-platform/core/recurring-insurance-document-extractor.js`
- `orbit360-platform/modules/importar-recurring-bridge-v20260804.js`
- `tools/orbit360-recurring-import-contract-v20260804.mjs`
- `tools/orbit360-validar-recurring-import-source-v20260804.mjs`

## 6. Validación source

Resultado local:

```text
checks: 11
passed: 11
failed: 0
networkCalls: 0
Firestore writes: 0
Auth writes: 0
deploy: 0
```

Controles cubiertos:

1. tipos de fuente completos;
2. idempotencia estable;
3. mapping configurable;
4. banco sin contraparte en validación;
5. reversos bloqueados;
6. duplicados omitidos;
7. evidencia antes de cobro o finmov;
8. rollback bloqueado después de consumo;
9. cliente sin escritura directa al store;
10. extractor y bridge sin escritura directa;
11. paquete Claude sin datos A&S y con candidata acumulativa.

## 7. Estado runtime

```text
source implementado: sí
validación source local: PASS 11/11
compuerta LAB: recurringInsuranceImportActive=false
Functions desplegadas: no
prueba runtime desde la plataforma: pendiente
operación privada histórica: carril separado
paquete Claude genérico: habilitado para entrega
```

## 8. Claude y candidata acumulativa

La candidata de Claude debe ser única y acumulativa. Debe conservar el mejor estado aceptado de todos los módulos y empalmar selectivamente sobre el baseline vivo.

No puede:

- utilizar datos A&S;
- reconstruir desde un ZIP viejo;
- entregar un shell reducido;
- crear una plataforma paralela;
- sobrescribir backend, Auth, Rules, `Orbit.store` o importadores protegidos;
- omitir Ops, Leads, Cobros, Conciliaciones, Importar, Academia, responsive, multirol o scopes.

## 9. Siguiente frontera

```text
1. Generar y entregar el paquete genérico acumulativo a Paula.
2. Mantener en paralelo el cierre privado de julio, sin bloquear el prototipo.
3. Ejecutar el preflight contractual del gate de activación LAB.
4. Con autorización expresa, desplegar una sola candidata LAB con:
   - Ops del Asesor;
   - importaciones recurrentes;
   - Cobros/Conciliaciones;
   - configuración del tenant.
5. Probar un lote mensual end-to-end y rollback.
6. Pasar inmediatamente a visualización acumulativa.
```
