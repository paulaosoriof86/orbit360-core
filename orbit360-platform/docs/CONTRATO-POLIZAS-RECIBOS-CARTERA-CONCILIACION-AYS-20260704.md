# Contrato técnico — Pólizas, recibos/cartera, estados y conciliación A&S

**Fecha:** 2026-07-04  
**Proyecto:** Orbit 360 A&S  
**Tenant principal:** `alianzas-soluciones`  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy, sin main  
**Estado:** contrato/documentación viva. No carga datos reales, no modifica Firestore y no habilita escritura automática.

---

## 0. Actualización post auditoría de candidata activa

Se auditó la candidata activa real:

```txt
Prototype Development Request - 2026-07-04T152321.882.zip
```

La candidata ya trae mejoras que deben conservarse:

- `normPais()` sin default GT;
- moneda sugerida separada de moneda escrita;
- `planillas-comision` en importador;
- `documentos` como `parchesPendientes`;
- `estados-banco` como `conciliacionBanco`;
- `financiero-historico` separado de cobros/cartera;
- trazabilidad por hoja/fila/bloque/periodo;
- `SCOPE` por fuente;
- Academia v1.118-v1.123.

Este contrato sigue vigente para backend real, pero los hallazgos sobre defaults peligrosos aplican principalmente a la rama GitHub antes del empalme; el ZIP actual ya resuelve parte de ellos y debe empalmarse sin pisar backend protegido.

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

## 2. Reglas maestras vigentes

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

---

## 3. Modelo mínimo esperado

### 3.1 `polizas`

```txt
id
tenantId
clienteId
aseguradoraId
asesorId
numero
ramo
producto
estado
pais
moneda
vigenciaIni
vigenciaFin
renovable
frecuencia
formaPago
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
qualityStatus
createdAt
updatedAt
```

### 3.2 `cobros`

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

### 3.3 `conciliaciones`

Colección sugerida para backend real:

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
sourceRef
reglasAplicadas
observaciones
```

---

## 4. Flujo de generación de cartera

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

Regla:

```txt
Vigente / Por renovar → genera recibos/cartera.
Cancelada / Vencida / Anulada / Rechazada → histórico, sin cartera.
Sin estado confiable → REQUIERE_VALIDACION, sin recibos automáticos.
```

---

## 5. Conciliación con aseguradoras

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

Salidas:

```txt
CONCILIADO_ASEGURADORA
PAGO_CONFIRMADO_NO_APLICADO
RECIBO_FALTANTE
DIFERENCIA_MONTO
MONEDA_INCONSISTENTE
REQUIERE_VALIDACION
BLOQUEADO
```

---

## 6. Conciliación con planillas de comisiones

Junio y julio 2026 deben tratarse como caso de migración porque no están cubiertos por el archivo financiero revisado.

Regla:

- si la planilla confirma pago aplicado y Orbit no lo tiene aplicado, crear propuesta de aplicación;
- aplicar automáticamente solo si existe regla aprobada, país/moneda confiable, póliza/recibo confiable, monto dentro de tolerancia y fuente trazada;
- si no hay coincidencia suficiente: `REQUIERE_VALIDACION`.

Impactos:

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

## 7. Pendientes backend/Codex

1. Empalmar mejoras del ZIP activo sin pisar backend protegido.
2. Crear backend/parser con manifest y dry-run real.
3. Crear score de confianza para conciliación.
4. Crear colección `conciliaciones` o equivalente.
5. Separar cartera activa de histórico en queries.
6. Reemplazar KPIs monetarios fijos por moneda país activo o tarjetas separadas.
7. Conservar `writeToStore` deshabilitado hasta aprobación LAB real.
8. Documentar reglas junio/julio 2026 como configuración de migración.

---

## 8. Pendientes Claude/prototipo

1. UI de Pólizas debe mostrar prima neta/gastos/IVA/total, no solo prima.
2. Pólizas/Cobros/Cliente360/Comisiones/Finanzas no deben mostrar GTQ fijo en totales mixtos.
3. Portal debe mostrar pago reportado/en revisión/aplicado/conciliado.
4. Cliente360 debe mostrar origen de aplicación/conciliación y trazabilidad.
5. Notificaciones debe registrar alertas de recibo faltante, pago reportado, validación, conciliación y diferencias.
6. Academia debe incluir esta lógica en rutas Administrativo/Operativo y Cliente nuevo.
7. Documentación debe unificar versión candidata activa/v1.117/v1.123.
