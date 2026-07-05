# Contrato técnico — Pólizas, recibos/cartera, estados y conciliación A&S

**Fecha:** 2026-07-04  
**Proyecto:** Orbit 360 A&S  
**Tenant principal:** `alianzas-soluciones`  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy, sin main  
**Estado:** contrato/documentación viva. No carga datos reales, no modifica Firestore y no habilita escritura automática.

---

## 1. Objetivo del bloque

Definir el contrato operativo y técnico para que Orbit 360 maneje correctamente:

- pólizas;
- estados de póliza;
- prima neta, gastos, IVA/impuestos y prima total;
- recibos/cuotas;
- cartera activa;
- cobros reportados/aplicados;
- conciliación con estados de cuenta de aseguradoras;
- conciliación con planillas mensuales de comisiones;
- impacto transversal en Cliente360, Portal Cliente, analíticas, metas, comisiones, liquidaciones, novedades/notificaciones y reportes.

Este contrato complementa el plan de parser por fuentes separadas y debe guiar la siguiente fase backend/importador real.

---

## 2. Baseline vivo revisado

Se revisaron las reglas documentadas y el código actual de la rama activa.

### 2.1 Reglas maestras vigentes

- Producción, metas y comisiones se calculan sobre **prima neta recaudada**.
- La prima debe separarse en:
  - prima neta;
  - gastos;
  - IVA/impuestos;
  - prima total.
- Solo generan cartera las pólizas en estado:
  - `Vigente`;
  - `Por renovar`.
- Son histórico, no cartera:
  - `Cancelada`;
  - `Vencida`;
  - `Anulada`;
  - `Rechazada`.
- Cartera activa = cobros pendientes de pólizas vigentes o por renovar del año actual.
- Cobros/recaudos no son `finmovs`.
- Financiero histórico solo alimenta `finmovs` históricos.
- Estado bancario sirve para conciliación, no para crear clientes, pólizas ni cobros directamente.
- Planillas de comisión deben leerse desde filas reales, sin simular tarifas o pagos.
- Si falta país/moneda confiable: `REQUIERE_VALIDACION`.

### 2.2 Código actual auditado para este bloque

#### `core/primas.js`

Ya existe motor de primas y recibos con:

- `desglose(primaNeta, pais, opciones)`;
- `recibos(desglose, opciones)`;
- cuotas por frecuencia;
- IVA por país vía `Orbit.paisCfg`;
- recargo financiero por fraccionamiento;
- desglose por recibo: neta, gastosEmision, gastosFinan, otros, IVA, total, comisión aseguradora y comisión vendedor.

#### `core/importa.js`

Ya existe importador transversal con soporte para:

- CSV/TSV/TXT;
- Excel vía librería;
- PDF/texto/imagen con fallback heurístico/IA;
- mapeo por sinónimos;
- preview y remapeo manual;
- `IMPORT_MAP` para clientes, pólizas, vehículos, estados de cuenta, estados banco, facturas, documentos, aseguradoras, bitácora de reclamos y calendario marketing.

Puntos útiles existentes:

- Al importar pólizas, crea recibos automáticos solo si la póliza queda `Vigente` o `Por renovar`.
- Al importar pólizas canceladas/vencidas, no crea cartera.
- Estados de cuenta detectan recibos no creados y pagos no aplicados.
- Portal permite reportar pagos y adjuntar soporte.
- Cobros permite aplicar pago, cargar factura y dejar actividad.

### 2.3 Riesgos/hallazgos que deben corregirse antes de escritura real

1. **Default peligroso de país en importador.**  
   `normPais()` devuelve `GT` cuando no reconoce país. Esto contradice la regla actual: no asumir Guatemala por defecto para escrituras. Debe cambiarse en backend/parser real para devolver `REQUIERE_VALIDACION` o metadata pendiente.

2. **Generación de recibos con país default.**  
   En `afterInsert` de pólizas se usa `rec.pais || 'GT'`. En backend real, si falta país/moneda, no se deben generar recibos ni cartera. Debe bloquearse con `REQUIERE_VALIDACION`.

3. **Módulos con KPIs monetarios fijos en GTQ.**  
   `polizas`, `cobros`, `cliente360` y `comisiones` tienen zonas que muestran agregados con `GTQ` aunque haya país activo o moneda CO. Deben usar moneda por país o separar totales por país, nunca sumar crudo.

4. **Conciliación demasiado permisiva.**  
   `conciliarRows()` cruza estado de cuenta por `polizaId` + monto aproximado. Para producción debe requerir score de confianza con número de recibo/cuota/periodo/moneda/país/aseguradora, no solo monto.

5. **Planillas de comisiones existen como sección visible, pero no como contrato técnico completo en `IMPORT_MAP`.**  
   `KINDS` tiene `planillas-comision`, pero no hay `IMPORT_MAP['planillas-comision']` con normalización, validación, dry-run y aplicación. Debe agregarse como fuente separada real.

6. **Portal reporta pago con fecha fija en UI.**  
   `reportarPago()` usa un valor de fecha fijo. Debe reemplazarse por fecha actual o campo vacío con validación, y nunca usar fechas estáticas en prototipo/base.

7. **Estados de cuenta de clientes vs planillas.**  
   El sistema debe diferenciar si un estado del cliente muestra pendientes o pagos realizados. No debe tomar un estado del cliente como pago aplicado si la fuente realmente lista pendientes.

8. **Junio y julio 2026 requieren regla especial de conciliación.**  
   Dado que no hay movimientos financieros en el archivo financiero para esos meses, las planillas de comisiones y estados de cuenta de aseguradora pasan a ser fuentes críticas para confirmar pagos aplicados, con trazabilidad y reglas de confianza.

---

## 3. Modelo de datos esperado

### 3.1 `polizas`

Campos mínimos esperados:

```txt
id
tenantId
clienteId
aseguradoraId
asesorId
numero
ramo
subramo/producto
estado
pais
moneda
vigenciaIni
vigenciaFin
renovable
frecuencia
formaPago/conducto
primaNeta
gastosEmision
gastosFinancieros
otros
iva/impuestos
primaTotal
sumaAsegurada
comAseguradoraPct
comVendedorPct
sourceRef
createdFromImportId
qualityStatus
createdAt
updatedAt
```

Reglas:

- `primaNeta` es la base para producción/metas/comisiones.
- `primaTotal` es valor informativo/cobro total.
- Si el archivo solo trae `prima total`, el importador debe marcar el registro como `REQUIERE_VALIDACION` salvo que exista desglose confiable.
- Si falta país o moneda: no generar cartera.
- Si falta cliente/aseguradora: crear propuesta o pendiente de vinculación, no cartera final.

### 3.2 `cobros` / recibos

Campos mínimos esperados:

```txt
id
tenantId
polizaId
clienteId
aseguradoraId
asesorId
cuota
numeroRecibo
periodo
pais
moneda
neta
gastosEmision
gastosFinan
otros
iva
montoTotal
vence
fechaLimite
estado
fechaPago
fechaReal
metodo
conducto
conciliado
conciliacionEstado
facturaId
soporteId
sourceRef
aplicadoPor
aplicadoDesde
confidenceScore
createdAt
updatedAt
```

Estados sugeridos:

```txt
Pendiente
Vencido
ReportadoPorCliente
EnRevision
Pagado
Conciliado
Anulado
RequiereValidacion
```

Estados de conciliación:

```txt
NO_CONCILIADO
PROPUESTO
CONCILIADO_ASEGURADORA
CONCILIADO_PLANILLA_COMISIONES
CONCILIADO_BANCO
REQUIERE_VALIDACION
BLOQUEADO
```

### 3.3 `conciliaciones`

Colección nueva sugerida para producción/LAB real.

```txt
id
tenantId
tipo
fuente
archivo
hoja
fila
bloque
periodo
pais
moneda
aseguradoraId
clienteId
polizaId
cobroId
comisionId
montoFuente
montoOrbit
diferencia
estadoFuente
estadoOrbit
confidenceScore
resultado
accionPropuesta
accionAplicada
aplicadoPor
aplicadoAt
sourceRef
reglasAplicadas
observaciones
```

Tipos:

```txt
estado_cuenta_aseguradora
planilla_comisiones
estado_cuenta_bancario
cobro_reportado_cliente
factura_soporte
```

Resultados:

```txt
MATCH_EXACTO
MATCH_PROBABLE
PAGO_CONFIRMADO_NO_APLICADO
RECIBO_FALTANTE
COMISION_DIFERENTE
MONEDA_INCONSISTENTE
PAIS_INCONSISTENTE
SIN_MATCH
REQUIERE_VALIDACION
BLOQUEADO
```

### 3.4 `sourceRefs` / trazabilidad de importación

Cada registro creado, actualizado o propuesto debe guardar referencia de fuente:

```txt
sourceRef: {
  importId,
  sourceType,
  fileName,
  sheetName,
  rowNumber,
  blockId,
  pageNumber,
  period,
  country,
  currency,
  rowHash,
  confidenceByField,
  detectedAt,
  validatedBy,
  validatedAt
}
```

---

## 4. Fuentes y permisos de escritura

### 4.1 `clientes`

Puede crear/actualizar clientes solo si identidad mínima confiable.

No puede generar pólizas ni cobros.

### 4.2 `polizas`

Puede crear/actualizar pólizas, recibos y cartera si:

- número de póliza confiable;
- cliente vinculado o confirmado;
- aseguradora vinculada;
- estado confiable;
- país y moneda confiables;
- desglose de prima confiable o validado;
- vigencia/frecuencia suficiente para generar recibos.

Si falta cualquiera: `REQUIERE_VALIDACION`.

### 4.3 `cobros_realizados`

Puede aplicar pagos a recibos existentes si hay coincidencia confiable.

No crea clientes ni pólizas.

No duplica ingreso en `finmovs`.

### 4.4 `planilla_aseguradora`

Puede proponer:

- recibos faltantes;
- actualización de estado;
- conciliación de recibos;
- diferencias por monto/moneda/estado;
- validación de cartera por aseguradora.

Debe guardar periodo, aseguradora, país, moneda, archivo/hoja/fila.

### 4.5 `planilla_comisiones`

Puede confirmar pago/cobro/aplicación cuando la fila real indique pago aplicado o comisión pagada/cobrada.

Debe distinguir:

- comisión esperada;
- comisión pagada;
- prima neta base;
- recibo/póliza vinculada;
- diferencia;
- retenciones;
- ajustes;
- periodo;
- asesor si aplica.

Si confirma pago aplicado y Orbit no lo tiene aplicado:

- con score alto: crear propuesta de aplicación o aplicar si la regla aprobada lo permite;
- con score medio/bajo: `REQUIERE_VALIDACION`;
- con país/moneda faltante: bloquear.

### 4.6 `estado_cuenta_bancario`

Sirve para conciliación bancaria.

No crea clientes, pólizas, cobros ni cartera.

Puede marcar depósitos no asociados, desviaciones o diferencias para revisión.

### 4.7 `financiero_historico`

Solo alimenta `finmovs` históricos.

Prohibido crear:

- clientes;
- pólizas;
- cobros;
- cartera;
- aseguradoras;
- producción.

### 4.8 `documentos_soporte`

Puede proponer datos con diff.

No crea ni modifica clientes/pólizas sin confirmación explícita.

---

## 5. Flujo de generación de cartera

### 5.1 Entrada de póliza

1. Leer fuente.
2. Clasificar fuente.
3. Construir manifest.
4. Validar país/moneda/periodo.
5. Normalizar póliza.
6. Validar estado.
7. Validar prima/desglose.
8. Validar cliente/aseguradora/asesor.
9. Ejecutar dry-run.
10. Mostrar diff y registros listos/bloqueados.
11. Escribir solo si está aprobado en LAB real.

### 5.2 Regla de estado

```txt
Vigente / Por renovar → genera recibos/cartera.
Cancelada / Vencida / Anulada / Rechazada → histórico, sin cartera.
Sin estado confiable → REQUIERE_VALIDACION, sin recibos automáticos.
```

### 5.3 Regla de año actual

La cartera activa debe incluir únicamente cobros pendientes de pólizas vigentes o por renovar del año actual.

Histórico:

- sirve para analítica;
- sirve para segmentación;
- sirve para campañas;
- no altera cartera activa.

---

## 6. Flujo de conciliación con aseguradoras

### 6.1 Entrada

Fuente: `planilla_aseguradora` o estado de cuenta de aseguradora.

Campos críticos:

```txt
aseguradora
periodo
poliza/recibo
cliente si existe
prima neta
monto total
estado
pais
moneda
fecha
```

### 6.2 Validaciones

El sistema debe validar si el recibo:

- existe en Orbit;
- pertenece a la misma póliza;
- pertenece al mismo cliente;
- corresponde a la misma aseguradora;
- tiene mismo país y moneda;
- coincide en monto, cuota, periodo o vencimiento;
- tiene estado coherente;
- está pagado, pendiente, anulado o requiere validación;
- debe proponerse como recibo faltante.

### 6.3 Salidas

- `CONCILIADO_ASEGURADORA`.
- `PAGO_CONFIRMADO_NO_APLICADO`.
- `RECIBO_FALTANTE`.
- `DIFERENCIA_MONTO`.
- `MONEDA_INCONSISTENTE`.
- `REQUIERE_VALIDACION`.
- `BLOQUEADO`.

---

## 7. Flujo de conciliación con planillas de comisiones

### 7.1 Caso especial junio/julio 2026

Como para junio y julio no existe movimiento en el archivo financiero revisado, las planillas de comisiones son fuente crítica para detectar pagos aplicados del mes anterior o pagos/cobros confirmados por aseguradora.

Regla:

- si la planilla confirma pago aplicado y Orbit no lo tiene aplicado, crear propuesta de aplicación;
- aplicar automáticamente solo si existe regla aprobada, país/moneda confiable, póliza/recibo confiable, monto dentro de tolerancia y fuente trazada;
- si no hay coincidencia suficiente: `REQUIERE_VALIDACION`.

### 7.2 Impactos obligatorios

Una aplicación o propuesta validada debe impactar:

- Cobros/cartera;
- Cliente360;
- Portal Cliente;
- Comisiones;
- Finanzas si corresponde;
- Liquidaciones;
- Analíticas;
- Producción sobre prima neta recaudada;
- Metas y proyecciones;
- Novedades/notificaciones;
- Reportes;
- Historial/actividades.

---

## 8. Portal Cliente y Cliente360

### 8.1 Cliente360 debe mostrar

Por cada póliza/recibo:

- póliza relacionada;
- recibos pagados y pendientes;
- prima neta/gastos/IVA/total;
- facturas/soportes adjuntos;
- estado de pago;
- estado de conciliación;
- origen de aplicación;
- fuente de importación;
- historial de cambios;
- usuario/proceso que aplicó o validó;
- excepciones y pendientes de validación.

### 8.2 Portal Cliente debe mostrar

- pólizas y detalle;
- recibos pagados y pendientes;
- facturas/documentos visibles;
- pagos reportados;
- estados de validación;
- próximas renovaciones;
- gestiones activas;
- documentos faltantes;
- alertas relevantes.

El cliente puede reportar pago y adjuntar soporte, pero el pago queda en revisión hasta validación interna.

---

## 9. Notificaciones/novedades

Eventos mínimos:

```txt
poliza_importada_requiere_validacion
recibos_generados
recibo_vencido
pago_reportado_cliente
pago_aplicado
pago_conciliado_aseguradora
pago_confirmado_planilla_no_aplicado
recibo_faltante_detectado
moneda_pais_inconsistente
comision_diferente
liquidacion_lista
```

Cada evento debe generar actividad, notificación interna y, cuando corresponda, notificación al cliente.

---

## 10. Pendientes backend/Codex

1. Crear contrato real `IMPORT_MAP`/backend para `planilla_comisiones`.
2. Eliminar defaults peligrosos de país/moneda en rutas de escritura.
3. Bloquear generación de recibos si falta país, moneda, estado, prima neta o cliente/aseguradora confiable.
4. Crear colección `conciliaciones` o equivalente.
5. Crear score de confianza para conciliación por:
   - póliza;
   - recibo/cuota;
   - cliente;
   - aseguradora;
   - país;
   - moneda;
   - monto;
   - periodo;
   - fuente.
6. Separar cartera activa de histórico en queries.
7. Cambiar KPIs monetarios fijos `GTQ` por moneda de país activo o tarjetas separadas por país.
8. Generar dry-run por fuente con diff antes de escritura.
9. Crear reglas especiales junio/julio 2026 como configuración de migración, no hardcode productivo.
10. Conservar `writeToStore` deshabilitado hasta aprobación LAB real.

---

## 11. Pendientes para Claude/prototipo

1. UI de Pólizas debe mostrar claramente prima neta/gastos/IVA/total, no solo prima.
2. UI de Pólizas/Cobros/Cliente360/Comisiones no debe mostrar GTQ fijo en totales mixtos.
3. Importar debe tener fuente `planilla_comisiones` alineada al documento maestro.
4. Importar debe diferenciar:
   - estado de cuenta de aseguradora;
   - planilla de comisiones;
   - estado bancario;
   - documentos soporte;
   - financiero histórico.
5. Importar no debe presentar aplicación automática como productiva si backend no está conectado.
6. Portal debe mostrar estado de validación del pago reportado y soporte adjunto visible.
7. Cliente360 debe mostrar origen de aplicación/conciliación y trazabilidad.
8. Notificaciones debe registrar alerta grande si hay pago pendiente, pago reportado sin validar, recibo conciliado, recibo faltante o documento faltante.
9. Academia debe incluir esta lógica en ruta Administrativo/Operativo y Cliente nuevo.
10. El nuevo candidato de Claude debe ser auditado contra esta lista antes de empalmar.

---

## 12. Criterio de aceptación del bloque

Este bloque no queda cerrado hasta que exista:

- contrato backend por fuente;
- dry-run real;
- normalizador país/moneda sin defaults peligrosos;
- conciliación con score y trazabilidad;
- UI honesta de propuestas vs aplicaciones reales;
- Cliente360 y Portal mostrando estado de pago/validación/conciliación;
- documentación de pendientes Claude actualizada;
- smoke visual/operativo cuando haya candidato nuevo.
