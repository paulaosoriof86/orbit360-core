# Validación CRUD manual antes de migrar A&S — Orbit 360

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-continuidad-20260703`  
**Objetivo:** garantizar que la plataforma sirva para operar diariamente, no solo para importar datos.

## 1. Principio

Antes de cargar masivamente la base real, cada módulo crítico debe permitir creación y edición manual desde la plataforma. Esto valida que A&S pueda seguir operando después de la migración.

La importación masiva acelera el arranque, pero la operación diaria dependerá de:

- crear nuevos clientes;
- actualizar pólizas;
- aplicar pagos;
- corregir datos;
- registrar actividades;
- emitir reportes;
- gestionar comisiones.

## 2. Módulos mínimos a validar manualmente

### 2.1 Configuración / Equipo

Validar:

- crear asesor;
- editar asesor;
- definir país;
- definir rol;
- definir módulos visibles;
- definir modelo de comisión;
- guardar cambios.

Resultado esperado:

- datos guardan en backend/store;
- cambios se reflejan en pólizas/comisiones;
- no se hardcodea nada.

### 2.2 Aseguradoras

Validar:

- crear aseguradora;
- editar aseguradora;
- agregar contacto;
- agregar teléfono/WhatsApp/email;
- agregar acceso/web/app;
- guardar país GT/CO.

Resultado esperado:

- aseguradora disponible para pólizas, cotizador, comparativo, cobros y comisiones.

### 2.3 Clientes

Validar:

- crear cliente;
- editar cliente;
- agregar contacto;
- asignar asesor;
- cambiar país/segmento;
- abrir Cliente 360.

Resultado esperado:

- cliente aparece en Cliente 360;
- no se duplica si se actualiza;
- asesor visible;
- país/moneda correctos.

### 2.4 Pólizas

Validar:

- crear póliza manual;
- asociar cliente;
- asociar aseguradora;
- asociar asesor;
- definir ramo/producto;
- definir vigencia;
- definir forma de pago;
- editar estado;
- guardar prima neta/IVA/total.

Resultado esperado:

- aparece en Pólizas;
- aparece en Cliente 360;
- si está vigente/por renovar, puede generar cobros/recibos;
- si está vencida/cancelada, queda histórico.

### 2.5 Cobros/recibos

Validar:

- crear cobro manual;
- editar vencimiento;
- editar monto;
- marcar pendiente/vencido/pagado;
- aplicar pago;
- registrar fecha/método.

Resultado esperado:

- cobro pagado actualiza recaudo comercial;
- no crea `finmov` automático;
- Cliente 360 refleja el pago;
- cartera vigente excluye vencidas/canceladas históricas.

### 2.6 Finanzas

Validar:

- crear movimiento financiero real;
- clasificar ingreso/egreso;
- asociar aseguradora/factura/comisión si aplica;
- registrar banco/caja;
- no mezclar con recaudo comercial.

Resultado esperado:

- `finmov` solo representa dinero real en empresa;
- no duplica cobros aplicados.

### 2.7 Comisiones / liquidaciones

Validar:

- calcular comisión desde prima neta recaudada;
- comisión aseguradora;
- comisión asesor sobre base antes de IVA;
- cambiar asesor y seleccionar alcance;
- crear liquidación preliminar;
- registrar historial.

Resultado esperado:

- trazabilidad completa cliente/póliza/cobro/comisión/liquidación.

### 2.8 Actividades / historial

Validar:

- registrar actividad manual;
- asociar cliente/póliza/cobro;
- ver en Cliente 360.

## 3. Criterio de aprobación

Un módulo pasa validación manual si:

- permite crear;
- permite editar;
- persiste en backend/store;
- se ve en Cliente 360 o módulo relacionado;
- no rompe tenant;
- no usa datos hardcodeados;
- queda trazabilidad de cambios.

## 4. Criterio de rechazo

Rechazar si:

- solo funciona con importación;
- no se puede editar desde UI;
- guarda en localStorage desde módulo;
- crea `finmov` al aplicar pago;
- mezcla monedas;
- duplica registros sin deduplicación;
- requiere tocar código para crear un registro normal.

## 5. Relación con Claude

Claude debe asegurar que el prototipo soporte estas operaciones manuales con UX clara. ChatGPT/Codex debe asegurar que backend/tenant/store las persista correctamente.

Este documento debe incluirse en el próximo paquete para Claude.

## 6. Estado

**Estado:** LISTO PARA VALIDAR.  
**Siguiente acción:** validar flujo manual mínimo antes de cargar la base real completa.
