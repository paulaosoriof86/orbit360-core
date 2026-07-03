# Plan de migración CRM real A&S — Orbit 360

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-continuidad-20260703`  
**Objetivo:** migrar la base real del CRM actual de A&S por bloques controlados y verificables.

## 1. Principio

La migración real debe servir para empezar a usar Orbit 360 en A&S, pero sin perder control ni contaminar el prototipo comercializable.

Reglas:

- pedir archivos uno por uno;
- importar por bloques;
- validar manualmente antes y después;
- no hardcodear datos;
- no usar `seed.js` para datos reales;
- no mezclar recaudo comercial con movimientos financieros reales;
- generar reporte de cada importación.

## 2. Doble validación obligatoria

Cada módulo crítico debe funcionar de dos formas:

### 2.1 Manual

Debe permitir crear/editar desde la plataforma:

- cliente;
- póliza;
- recibo/cobro;
- pago/recaudo;
- asesor;
- aseguradora;
- actividad;
- movimiento financiero real;
- comisión/liquidación.

### 2.2 Importador

Debe permitir cargar archivo real, revisar preview, remapear y aprobar.

Si un módulo solo funciona por importación pero no manualmente, no está listo para operación diaria.

Si solo funciona manualmente pero no importa, no está listo para migración masiva.

## 3. Orden de migración por bloques

### Bloque 0 — Configuración A&S

Objetivo:

- dejar tenant A&S listo;
- usuarios/asesores;
- país/moneda;
- IVA GT/CO;
- roles/módulos;
- aseguradoras base.

Fuentes:

- configuración actual;
- directorios aseguradoras;
- equipo interno.

Validación manual:

- crear asesor;
- editar porcentaje/modelo de comisión;
- crear aseguradora;
- agregar contacto.

### Bloque 1 — Clientes CRM actual

Objetivo:

- migrar clientes base.

Fuente que se solicitará a Paula:

- export del CRM actual o Excel/CSV de clientes.

Campos esperados:

- nombre;
- identificación/NIT;
- país;
- email;
- teléfono;
- WhatsApp;
- asesor;
- segmento;
- observaciones;
- estado.

Validación:

- deduplicar;
- marcar incompletos;
- consultar Cliente 360;
- crear cliente manual y verificar que entra igual que uno importado.

### Bloque 2 — Pólizas

Objetivo:

- migrar pólizas vigentes, por renovar e histórico.

Fuente que se solicitará:

- export CRM actual de pólizas;
- archivo pólizas vigente/renovaciones;
- reportes aseguradoras si aplica.

Campos esperados:

- número póliza;
- cliente;
- aseguradora;
- ramo/producto;
- estado;
- vigencia desde/hasta;
- forma de pago;
- moneda;
- prima neta;
- IVA;
- prima total;
- asesor.

Reglas:

- Vigente/Por renovar generan recibos/cobros.
- Cancelada/Vencida quedan histórico.

Validación manual:

- crear póliza manual;
- editar estado;
- revisar Cliente 360;
- verificar generación de cobros.

### Bloque 3 — Cobros/cartera vigente

Objetivo:

- cargar cartera real operativa.

Fuente que se solicitará:

- cartera actual;
- recibos pendientes;
- reporte de cobros por póliza.

Campos esperados:

- cliente;
- póliza;
- aseguradora;
- recibo/cuota;
- vencimiento;
- monto;
- prima neta;
- IVA;
- total;
- estado;
- moneda.

Regla:

- solo cartera de pólizas vigentes/por renovar del año actual.

Validación manual:

- crear cobro manual;
- aplicar pago;
- confirmar que no crea `finmov`;
- verificar Cliente 360 y producción recaudada.

### Bloque 4 — Cobros efectuados/histórico

Objetivo:

- cargar pagos ya realizados para analítica, comisiones y trazabilidad.

Fuente que se solicitará:

- cobros efectuados;
- reportes de pago por cliente/póliza;
- estados de cuenta de aseguradoras.

Regla:

- pago aplicado histórico tampoco debe crear `finmov` automático.
- solo conciliación financiera real crea `finmov`.

Validación:

- cruzar con póliza/cliente;
- marcar no encontrados;
- no duplicar ingresos.

### Bloque 5 — Vehículos, acreedores y documentos

Objetivo:

- completar expedientes.

Fuente que se solicitará:

- Excel/CRM de vehículos;
- tarjetas de circulación;
- acreedores;
- documentos por póliza/cliente si aplica.

Validación manual:

- crear vehículo manual;
- asociarlo a póliza;
- ver en Cliente 360.

### Bloque 6 — Siniestros/reclamos

Objetivo:

- histórico de reclamos.

Fuente que se solicitará:

- bitácora de siniestros;
- reportes multi-cliente.

Validación:

- crear reclamo manual;
- asociar cliente/póliza;
- registrar seguimiento.

### Bloque 7 — Comisiones, facturas y liquidaciones

Objetivo:

- operar CxC aseguradora y CxP asesores.

Fuente que se solicitará:

- planillas de comisión;
- facturas;
- estados de cuenta;
- movimientos financieros históricos.

Reglas A&S:

- Jan-May: reconciliar sin duplicar ingresos.
- Jun-Jul: generar desde estados/planillas.
- IVA separado.
- Asesor sobre base antes de IVA.
- USD con tasa y diferencia.

Validación manual:

- crear comisión manual;
- crear factura manual;
- liquidar asesor;
- registrar `finmov` real separado.

### Bloque 8 — Marketing/contenidos

Objetivo:

- cargar calendario comercial.

Prioridad:

- no bloquea uso operativo inicial.

## 4. Criterio de cada bloque

Cada bloque se considera completado solo si existe:

- archivo fuente recibido;
- mapping documentado;
- importación ejecutada o plantilla lista;
- reporte de importación;
- validación manual equivalente;
- errores/pendientes documentados;
- backlog Claude actualizado si afecta UI/prototipo.

## 5. Qué se le pedirá a Paula primero

Cuando estemos listos para cargar base real, el primer archivo a pedir será:

```txt
Export/listado actual de clientes del CRM actual A&S
```

Formato aceptado:

- Excel;
- CSV;
- export del CRM;
- si solo existe PDF/Word, se procesa con importador/IA, pero Excel/CSV es preferible.

No se pedirá todo al tiempo.

## 6. Estado

**Estado:** ACTIVO.  
**Siguiente acción:** validar manual CRUD mínimo y luego pedir a Paula el primer archivo real de clientes cuando corresponda.
