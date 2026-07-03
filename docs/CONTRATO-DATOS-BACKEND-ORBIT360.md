# Contrato de datos backend — Orbit 360

**Fecha:** 2026-07-03  
**Proyecto:** Orbit 360 — A&S / core multi-tenant  
**Estado:** borrador operativo Fase 1  
**Objetivo:** fijar el contrato que el backend debe cumplir para que nuevos prototipos Claude no reinicien el trabajo.

## 1. Principio no negociable

Los módulos del frontend solo deben hablar con `Orbit.store`. El backend puede cambiar por dentro, pero la interfaz pública se conserva.

API mínima obligatoria:

```js
Orbit.store.all(collection)
Orbit.store.get(collection, id)
Orbit.store.where(collection, predicateOrField, value)
Orbit.store.insert(collection, data)
Orbit.store.update(collection, id, patch)
Orbit.store.remove(collection, id)
Orbit.store._emit(collection)
```

Extensiones existentes que deben mantenerse si el prototipo las usa:

```js
Orbit.store.find(collection, predicate)
Orbit.store.on(collection, handler)
Orbit.store.pref(key)
Orbit.store.setPref(key, value)
Orbit.store.raw()
```

## 2. Estructura multi-tenant Firestore propuesta

Ruta base:

```txt
tenants/{tenantId}/{collection}/{docId}
```

Ejemplo A&S LAB:

```txt
tenants/alianzas-soluciones/clientes/{clienteId}
tenants/alianzas-soluciones/polizas/{polizaId}
tenants/alianzas-soluciones/cobros/{cobroId}
```

Colecciones globales solo si son estrictamente necesarias:

```txt
global/catalogos
system/releases
system/audit
```

Regla: ninguna colección de operación debe quedar fuera del tenant.

## 3. Campos comunes obligatorios

Todo documento operativo debe incluir:

```js
{
  id: string,
  tenantId: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string|null,
  updatedBy: string|null,
  status: string|null,
  deletedAt: timestamp|null
}
```

Para auditoría de importación:

```js
{
  importBatchId: string|null,
  importSource: string|null,
  importRow: number|null,
  importConfidence: number|null,
  importReviewStatus: 'aprobado'|'por_revisar'|'rechazado'|null
}
```

## 4. Colecciones base core

### tenants

Configuración del cliente SaaS.

Campos mínimos:

```js
{
  id,
  nombre,
  slug,
  paisesActivos: ['GT','CO'],
  paisDefault: 'GT',
  monedaDefault: 'GTQ',
  logoUrl,
  paleta,
  plan,
  modulosActivos,
  integraciones,
  settings
}
```

### usuarios / asesores

En prototipo existe colección `asesores`. En backend puede existir `usuarios` y espejo/relación con `asesores`, pero se debe preservar compatibilidad con módulos que leen `asesores`.

Campos mínimos:

```js
{
  id,
  nombre,
  email,
  telefono,
  pais,
  rol,
  roles,
  modulos,
  activo,
  shareCom,
  comModo,
  comValor,
  metas,
  permisos
}
```

### clientes

Campos mínimos:

```js
{
  id,
  nombre,
  tipoPersona,
  identificacion,
  nit,
  email,
  telefono,
  whatsapp,
  pais,
  moneda,
  asesorId,
  segmento,
  origen,
  estado,
  driveUrl,
  notas
}
```

Índices sugeridos:

- tenantId + identificacion;
- tenantId + nit;
- tenantId + nombre_normalizado;
- tenantId + asesorId;
- tenantId + pais.

### polizas

Campos mínimos:

```js
{
  id,
  numero,
  clienteId,
  aseguradoraId,
  asesorId,
  pais,
  moneda,
  ramo,
  producto,
  estado,
  vigenciaDesde,
  vigenciaHasta,
  formaPago,
  primaNeta,
  iva,
  primaTotal,
  tasaCambio,
  monedaOriginal,
  primaOriginal,
  vehiculoId,
  acreedorId,
  renovacionDe,
  documentos
}
```

Regla:

- Vigente/Por renovar generan recibos/cobros y entran a cartera.
- Cancelada/Vencida son histórico, no cartera vigente.

### cobros / recibos

La colección puede llamarse `cobros` para compatibilidad con prototipo. Conceptualmente representa recibos/cartera.

Campos mínimos:

```js
{
  id,
  clienteId,
  polizaId,
  aseguradoraId,
  asesorId,
  pais,
  moneda,
  numeroRecibo,
  cuota,
  totalCuotas,
  fechaVencimiento,
  fechaPago,
  estado,
  primaNeta,
  iva,
  primaTotal,
  montoPagado,
  metodoPago,
  conciliado,
  fuentePago,
  estadoCuentaId,
  facturaId,
  observaciones
}
```

Estados sugeridos:

```txt
Pendiente | Por vencer | Vencido | Pagado | Anulado | En revisión
```

Regla crítica:

- Marcar cobro como Pagado no crea `finmov`.
- Sí actualiza cartera, producción recaudada, recibos y comisión estimada.

### aseguradoras

Campos mínimos:

```js
{
  id,
  nombre,
  paises,
  nit,
  codigo,
  contactos,
  accesos,
  cuentasBancarias,
  driveUrl,
  tarifas,
  productos,
  activo
}
```

### vehiculos

Campos mínimos:

```js
{
  id,
  clienteId,
  placa,
  marca,
  linea,
  modelo,
  tipo,
  chasis,
  motor,
  valorAsegurado,
  pais,
  documentos
}
```

### actividades / historial

Campos mínimos:

```js
{
  id,
  clienteId,
  polizaId,
  cobroId,
  reclamoId,
  tipo,
  titulo,
  descripcion,
  fecha,
  usuarioId,
  canal,
  resultado,
  metadata
}
```

### comisiones

Campos mínimos:

```js
{
  id,
  clienteId,
  polizaId,
  cobroId,
  aseguradoraId,
  asesorId,
  pais,
  moneda,
  primaNetaRecaudada,
  porcentajeAseguradora,
  comisionIntermediarioBase,
  iva,
  comisionIntermediarioTotal,
  porcentajeAsesor,
  comisionAsesorBase,
  estado,
  facturaId,
  liquidacionId,
  estadoCuentaId
}
```

Regla:

- Comisión se calcula sobre prima neta recaudada.
- Comisión asesor sobre base antes de IVA, salvo configuración expresa.

### finmovs

Movimientos financieros reales de empresa.

Campos mínimos:

```js
{
  id,
  tipo, // ingreso|egreso|ajuste
  categoria,
  subcategoria,
  fecha,
  pais,
  moneda,
  monto,
  montoOriginal,
  monedaOriginal,
  tasaCambio,
  diferenciaCambio,
  cuenta,
  banco,
  referencia,
  facturaId,
  liquidacionId,
  aseguradoraId,
  asesorId,
  clienteId,
  descripcion,
  conciliado
}
```

Regla:

- Solo registra caja/banco real.
- No registrar automáticamente por pago aplicado de cliente.

### facturas

Campos mínimos:

```js
{
  id,
  numero,
  aseguradoraId,
  pais,
  moneda,
  periodoDocumento,
  periodoRecaudo,
  fechaEmision,
  fechaPago,
  subtotal,
  iva,
  total,
  estado,
  archivoUrl,
  tasaCambio,
  monedaOriginal,
  totalOriginal
}
```

### liquidaciones

Campos mínimos:

```js
{
  id,
  asesorId,
  pais,
  moneda,
  periodo,
  fechaCorte,
  fechaPago,
  subtotalBase,
  ajustes,
  totalPagar,
  estado,
  comisionesIds,
  archivoUrl,
  historialCambios
}
```

### documentos

Campos mínimos:

```js
{
  id,
  clienteId,
  polizaId,
  aseguradoraId,
  reclamoId,
  tipo,
  nombre,
  url,
  mimeType,
  size,
  fechaCarga,
  usuarioId,
  metadata
}
```

### import_batches

Campos mínimos:

```js
{
  id,
  tipo,
  fuente,
  archivoNombre,
  archivoUrl,
  usuarioId,
  fecha,
  estado,
  totalFilas,
  aprobadas,
  rechazadas,
  porRevisar,
  mapping,
  errores
}
```

## 5. Colecciones adicionales del prototipo

Mantener compatibilidad con:

- reclamos;
- gestiones;
- negocios;
- contenidos;
- cursos;
- acreedores;
- presupuesto;
- metas;
- plantillas;
- correos;
- notifs;
- reportes_prog;
- tareas;
- cancelaciones.

Si una colección aún no tiene backend final, debe mapearse como colección tenant y no quedar global.

## 6. Reglas de importación A&S

Todo importador debe producir:

```js
{
  batchId,
  rows: [
    {
      raw,
      mapped,
      confidence,
      action: 'crear'|'actualizar'|'omitir'|'revisar',
      targetCollection,
      targetId,
      errors,
      warnings
    }
  ]
}
```

El usuario debe poder:

- aprobar fila;
- aprobar todo;
- excluir;
- remapear columna a campo;
- iterar/mejorar;
- revisar duplicados;
- descargar reporte.

## 7. Reglas Firestore preliminares

- Todo acceso operativo filtra por `tenantId`.
- Usuario debe pertenecer al tenant.
- Rol define módulos y acciones.
- Admin tenant puede gestionar configuración de su tenant.
- Super admin Orbit puede ver tenants según soporte, con auditoría.
- Documentos financieros tienen permisos más restrictivos.
- No exponer secrets de integraciones al frontend.

## 8. Smoke mínimo Fase 2

Prueba obligatoria:

1. Crear cliente ficticio.
2. Crear póliza vigente.
3. Generar cobro/recibo.
4. Aplicar pago.
5. Verificar cobro `Pagado`.
6. Verificar producción recaudada.
7. Verificar comisión estimada.
8. Confirmar que no se creó `finmov`.
9. Crear `finmov` manual por comisión efectivamente recibida.
10. Ver Cliente 360.

## 9. Criterio para empalme con frontend Claude

El frontend nuevo puede conectarse a este backend si:

- conserva nombres de colecciones o se crea adaptador;
- no rompe `Orbit.store`;
- no accede directo a almacenamiento;
- no cambia regla recaudo/finmov;
- no mezcla moneda;
- respeta tenant;
- no hardcodea A&S.

## 10. Estado

**Estado:** BORRADOR OPERATIVO.  
**Siguiente acción:** validar contra código actual del ZIP y preparar smoke Firestore LAB.
