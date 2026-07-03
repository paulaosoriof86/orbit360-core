# Matriz de importación inicial A&S — Orbit 360

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-continuidad-20260703`  
**Objetivo:** definir el primer corte de carga A&S para LAB interno usable.  
**Estado:** operativo inicial, sin importar datos reales al prototipo.

## 1. Principio de importación

Los datos reales o semi-reales de A&S no se deben hardcodear en `seed.js` ni en módulos del prototipo. La carga debe ir a backend/tenant A&S o a dataset controlado/anonimizado para LAB.

Ruta propuesta:

```txt
tenants/alianzas-soluciones/{coleccion}/{docId}
```

## 2. Fuentes revisadas disponibles

### 2.1 Directorio Aseguradoras Guatemala 2026

Archivo local revisado:

```txt
Directorio Aseguradoras Guatemala 2026.xlsx
```

Estructura detectada:

- Hoja `ÍNDICE`: resumen de aseguradoras GT.
- Hojas por aseguradora: `EL ROBLE`, `MAPFRE SEGUROS`, `GENERAL`, `G&T SEGUROS`, `COLUMNA`, `LA CEIBA`, `GUATEMALTECA`, `UNIVERSALES`, `RURAL`, `BAM`, `BANTRAB`, `FICOHSA`, `PRIVANZA`, `ÓLE`, entre otras.
- Hoja `📋 DIAGNÓSTICO`: estado de completitud por aseguradora.

Campos detectados:

- aseguradora;
- código;
- NIT;
- teléfonos oficina;
- emergencias/asistencias;
- WhatsApp;
- dirección;
- app;
- web;
- contactos;
- cargo;
- área;
- extensión;
- email;
- celular;
- observaciones;
- diagnóstico de completitud.

Destino backend:

```txt
aseguradoras
```

Subcolecciones o campos anidados:

```txt
contactos[]
accesos[]
cuentasBancarias[]
diagnostico
```

Prioridad: **alta**, porque alimenta cotizador, comparativo, cobros, comisiones, correo, WhatsApp y Cliente 360.

### 2.2 Directorio Aseguradoras Colombia 2024

Archivo local revisado:

```txt
Directorio - Aseguradoras Colombia 2024.xlsx
```

Estructura detectada:

- Hoja `Indice`: resumen de aseguradoras CO.
- Hojas por aseguradora/canal: `Synergias`, `Solidaria`, `AXA`, `Estado`, `HDI`, `Equidad`, `Chub`, `SMI`, `Previsora`, `SBS`, `Zurich`, `Mapfre`, `Bolivar`, `Chubb`, `Qualitas`, `Solidaria 1.0`.

Campos detectados:

- aseguradora;
- clave/código;
- NIT;
- dirección;
- oficina;
- teléfono oficina;
- teléfono emergencias;
- app;
- WhatsApp;
- contactos;
- cargo;
- área;
- extensión;
- email;
- celular;
- observaciones.

Destino backend:

```txt
aseguradoras
```

Regla:

- `pais: CO`.
- `moneda: COP`.
- No mezclar con GT en totales crudos.

Prioridad: **alta**.

### 2.3 Movimientos Ingresos/Egresos Alianzas Guatemala y Colombia 2026

Archivo local revisado:

```txt
Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx
```

Estructura detectada:

- Hojas por país y mes, ejemplo:
  - `AyS GT Ene 25`;
  - `AyS Col Ene 25`;
  - `AyS GT Jul  25`;
  - `AyS Col Jul 25`.
- GT y CO tienen columnas similares pero no idénticas.
- Desde algunos meses aparece columna `CLASIFICACIÓN`.

Campos detectados GT:

- concepto;
- pagador;
- día;
- clasificación;
- valor;
- IVA;
- observaciones;
- saldo;
- efectivo/banco;
- presupuesto mensual;
- resumen ingresos mes.

Campos detectados CO:

- concepto;
- pagador;
- día;
- clasificación;
- valor;
- ISR;
- IVA;
- observaciones;
- saldo;
- impuestos;
- provisiones;
- presupuesto mensual;
- resumen ingresos mes.

Destino backend:

```txt
finmovs
facturas
comisiones
import_batches
```

Regla crítica:

- Este archivo corresponde a movimientos financieros/históricos de empresa.
- No debe mezclarse con cobros de pólizas como si fueran recaudo aplicado.
- Jan-May debe servir para reconciliar comisiones/facturas ya registradas y evitar duplicidad.
- Jun-Jul en adelante debe relacionarse con planillas/estados de cuenta si existen.

Prioridad: **media-alta**, pero debe entrar después de clientes/pólizas/cobros base o con revisión fuerte.

### 2.4 Calendario Maestro Contenidos 2026

Archivo local revisado:

```txt
AyS — Calendario Maestro Contenidos 2026 — Flujo híbrido.xlsx
```

Estructura detectada:

- Hoja `Cronograma 90D`.
- 92 piezas planificadas.
- Canales activos: FB GT, FB CO, IG GT, LinkedIn, WA GT, WA CO.
- Campos detectados:
  - ID;
  - estado general;
  - fecha programada;
  - fecha real/reprogramada;
  - día;
  - semana;
  - mes;
  - hora sugerida;
  - funnel;
  - campaña.

Destino backend:

```txt
contenidos
```

Prioridad: **baja para LAB urgente**. No debe bloquear clientes/pólizas/cobros.

## 3. Orden de carga recomendado para LAB urgente

### Paso 1 — Aseguradoras

Colección:

```txt
aseguradoras
```

Campos mínimos:

```js
{
  tenantId,
  pais,
  nombre,
  codigo,
  nit,
  direccion,
  telefonoOficina,
  telefonoEmergencias,
  whatsapp,
  app,
  web,
  contactos,
  diagnostico,
  activo: true
}
```

Resultado esperado:

- Directorio GT/CO consultable.
- Aseguradoras disponibles para pólizas, cobros, comisiones, correo y comparativo.

### Paso 2 — Clientes base

Fuente pendiente de confirmar/cargar.

Colección:

```txt
clientes
```

Campos mínimos:

```js
{
  tenantId,
  pais,
  nombre,
  identificacion,
  nit,
  email,
  telefono,
  whatsapp,
  asesorId,
  segmento,
  estado,
  origen,
  observaciones
}
```

Regla:

- Deduplicar por identificación/NIT/email/nombre normalizado.
- Si falta identificación, marcar `importReviewStatus: por_revisar`.

### Paso 3 — Pólizas

Fuente pendiente de confirmar/cargar.

Colección:

```txt
polizas
```

Campos mínimos:

```js
{
  tenantId,
  pais,
  clienteId,
  aseguradoraId,
  asesorId,
  numero,
  ramo,
  producto,
  estado,
  vigenciaDesde,
  vigenciaHasta,
  moneda,
  primaNeta,
  iva,
  primaTotal,
  formaPago
}
```

Regla:

- Vigente/Por renovar generan cobros/recibos y entran en cartera.
- Cancelada/Vencida quedan histórico.

### Paso 4 — Cobros/recibos

Colección:

```txt
cobros
```

Campos mínimos:

```js
{
  tenantId,
  pais,
  clienteId,
  polizaId,
  aseguradoraId,
  asesorId,
  numeroRecibo,
  cuota,
  totalCuotas,
  fechaVencimiento,
  estado,
  moneda,
  primaNeta,
  iva,
  primaTotal,
  montoPagado,
  fechaPago,
  metodoPago,
  conciliado
}
```

Regla:

- Aplicar pago marca cobro como pagado y recaudo comercial.
- No crea `finmov`.

### Paso 5 — Comisiones base

Colección:

```txt
comisiones
```

Campos mínimos:

```js
{
  tenantId,
  pais,
  clienteId,
  polizaId,
  cobroId,
  aseguradoraId,
  asesorId,
  primaNetaRecaudada,
  porcentajeAseguradora,
  comisionIntermediarioBase,
  iva,
  comisionIntermediarioTotal,
  porcentajeAsesor,
  comisionAsesorBase,
  estado
}
```

Regla:

- Base de cálculo: prima neta recaudada.
- Asesor sobre base antes de IVA.

### Paso 6 — Movimientos históricos/financieros

Colección:

```txt
finmovs
```

Regla:

- Solo caja/banco real.
- Cargar como histórico financiero, no como cartera.
- Reconciliar con facturas/comisiones para evitar duplicidad.

## 4. Campos de control de importación

Toda fila importada debe guardar:

```js
{
  importBatchId,
  importSource,
  importSheet,
  importRow,
  importStatus,
  importWarnings,
  importErrors,
  importConfidence,
  reviewedBy,
  reviewedAt
}
```

## 5. Reporte requerido por importación

Cada importación debe producir:

- total filas leídas;
- creadas;
- actualizadas;
- omitidas;
- por revisar;
- duplicadas;
- errores;
- advertencias;
- archivo fuente;
- fecha;
- usuario.

## 6. Lo que falta para cargar datos A&S

Para LAB urgente se requiere fuente o extracción de:

- clientes base;
- pólizas vigentes/por renovar;
- recibos/cobros;
- vehículos si aplica;
- asesores/usuarios;
- tarifas de comisión si no están completas en el prototipo.

## 7. Estado

**Estado:** EN PROGRESO.  
**Siguiente acción:** preparar smoke mínimo y/o plantilla de importación controlada para clientes/pólizas/cobros.
