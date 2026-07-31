# DRY-RUN / AUDITORÍA SANITIZADA — ENRIQUECIMIENTO DE DETALLE DE PÓLIZAS

Fecha: 2026-07-31  
Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Modo: `READ_ONLY_SOURCE_AUDIT / ZERO_WRITES`

## Objetivo

Determinar, sin reimportar Pólizas ni tocar Firestore, qué información útil ya existe en las fuentes SIGA/operativas recibidas y quedó fuera del paquete canónico de 1,373 pólizas.

La ficha operativa de Póliza no puede limitarse a primas. Debe mostrar todo dato útil disponible y distinguir claramente entre:

1. dato ya persistido pero no proyectado;
2. dato disponible en fuente, pero omitido por el contrato canónico inicial;
3. dato que no existe en las fuentes tabulares actuales y requiere documento/otra fuente, sin inventarlo.

## 1. Paquete canónico exacto auditado

Paquete privado utilizado en el WRITE_PASS de Pólizas:

`ORBIT360-AYS-POLIZAS-CANONICAL-PRIVATE-20260730`

Hoja `PoliciesToCreate`: **1,373 pólizas**.

Campos con cobertura canónica actual:

- `numero`: 1,373/1,373;
- `clienteId`: 1,373/1,373;
- `aseguradoraId`: 1,373/1,373;
- `asesorId`: 1,370/1,373;
- `vigenciaInicio`: 1,373/1,373;
- `vigenciaFin`: 1,373/1,373;
- `estado`: 1,373/1,373;
- `pais`: 1,373/1,373;
- `moneda`: 1,373/1,373;
- `primaNeta`: 1,373/1,373;
- `primaTotal`: 1,373/1,373;
- `formaPago`: 1,335/1,373;
- `conductoPago`: 1,217/1,373;
- `frecuencia`: 1,335/1,373;
- `ramo`: 1,370/1,373;
- `subramo`: 1,370/1,373;
- `producto`: 1,254/1,373;
- calidad/provenance: preservada en las 1,373.

El paquete canónico inicial **no contiene columnas generales** para:

- gastos de expedición/emisión;
- gastos financieros;
- otros/asistencias;
- base gravable;
- IVA/impuestos desglosados;
- suma asegurada;
- tipo de póliza operativo;
- comisión aseguradora/vendedor;
- bien asegurado;
- plan/coberturas;
- comentarios de póliza;
- concepto/riesgo.

Por tanto, esos faltantes no deben presentarse como `undefined`, `NaN` ni como cero inventado.

## 2. Fuentes tabulares existentes revisadas

Se revisaron de forma read-only fuentes ya disponibles de Pólizas/Renovaciones, sin publicar PII ni valores de filas.

### Fuente histórica principal

Cobertura agregada relevante sobre 1,362 filas útiles:

- frecuencia de pago: 1,324;
- conducto de pago: 1,199;
- ramo/subramo: 1,360;
- tipo ramo/producto: 1,244;
- prima neta/total: 1,362;
- tipo de emisión: 1,362;
- bien asegurado: **1,104**;
- plan coberturas: **59**;
- comentarios de póliza: **57**;
- concepto: **3**.

### Fuente de altas desde julio 2026

Sobre 23 filas útiles:

- frecuencia/conducto: 23;
- ramo/subramo/tipo ramo: 23;
- prima neta/total: 23;
- tipo de emisión: 23;
- bien asegurado: **22**;
- comentarios de póliza: **2**.

### Fuente de renovaciones

Sobre 105 filas útiles:

- frecuencia: 104;
- forma de pago explícita: 104;
- prima neta/total: 105;
- ramo/subramo: 105;
- tipo ramo: 103;
- comentarios: 3;
- plan coberturas: 4;
- concepto: 1.

### Reporte de emisión

Confirma principalmente póliza/cliente/ramo/aseguradora/vigencia/vendedor/prima neta/prima total. No agrega el detalle faltante de impuestos, gastos, suma asegurada o comisiones.

## 3. Emparejamiento sanitizado contra las 1,373 pólizas canónicas

Se usó identidad fail-closed basada en:

`numero + vigenciaInicio + aseguradoFuente + aseguradoraFuente`

Resultado agregado preliminar:

- pólizas canónicas: **1,373**;
- emparejadas con al menos una fuente detallada: **1,361**;
- sin match exacto de cuatro componentes: **12**;
- con más de una fuente coincidente: **122**; no se selecciona arbitrariamente un valor si existe conflicto.

Información recuperable sin inventar para las pólizas emparejadas:

- tipo de emisión: hasta **1,361**;
- bien asegurado: hasta **1,106**;
- plan coberturas: hasta **59**;
- comentarios de póliza: hasta **57**;
- concepto: hasta **3**.

Los números anteriores son cobertura potencial de fuente, no autorización de escritura.

## 4. Clasificación de causa raíz

### `FUNCTIONAL_DEFECT`

Campos ya persistidos bajo nombres canónicos no eran consumidos por el frontend (`primaTotal/primaNeta`, aliases de Vehículos, etc.). Esto se corrige en read-model, sin tocar datos.

### `DATA_CONTRACT_FAILURE`

El contrato canónico de Pólizas utilizado para la migración descartó campos útiles que sí existen en la fuente, principalmente `Tipo de Emisión`, `Bien Asegurado`, `Plan Coberturas`, `Comentarios Póliza` y, en pocos casos, `Concepto`.

### No clasificar como defecto de fuente

Gastos/IVA/base gravable/suma asegurada/comisiones no aparecen de forma general en las fuentes tabulares revisadas. No se deben inferir. Si existen en documentos de póliza u otra fuente operativa se incorporarán mediante el importador/document intelligence con diff y confirmación.

## 5. Implementación reusable preparada

Se agregó:

`tools/orbit360-policies-detail-enrichment-dryrun-v20260731.mjs`

Contrato:

- recibe el paquete canónico y una lista de fuentes privadas;
- detecta encabezados;
- empareja por identidad fuerte;
- consolida múltiples fuentes solo cuando el valor es consistente;
- conflicto = HOLD/fail-closed;
- propone exclusivamente campos ausentes;
- no sobrescribe un canónico distinto;
- genera diff privado efímero;
- evidencia pública solo agregada;
- `firestoreWrites = 0`;
- `operationalWrites = 0`;
- no toca Recibos/Cartera/Cobros/finmovs.

Campos de enriquecimiento propuestos por el dry-run:

- `tipoEmision`;
- `bienAsegurado`;
- `planCoberturas`;
- `comentariosPoliza`;
- `concepto`;
- `formaPagoFuente` cuando sea explícita;
- `conductoPagoFuente` como provenance, sin confundirlo con forma de pago.

## 6. Regla de UI

La ficha full-page debe mostrar inmediatamente lo que ya existe en el store y, cuando un campo no exista todavía, `Pendiente de completar`. Luego del enriquecimiento autorizado, la misma ficha debe poblarse sin cambiar de renderer ni agregar otro parche.

## 7. Estado

`SOURCE_DETAIL_AUDIT_PASS / ENRICHMENT_DRYRUN_OWNER_PREPARED / ZERO_WRITES / NO_DEPLOY`

No se pide autorización todavía. Antes de cualquier escritura se deben cerrar:

1. prueba de coexistencia read-model v1.199c + proyección Recibos/Cartera v9.1.0;
2. dry-run ejecutado sobre los paquetes exactos y evidencia sanitizada;
3. diff/conflictos exactos;
4. gate canónico;
5. una sola autorización macro si finalmente hace falta modificar documentos de Pólizas.
