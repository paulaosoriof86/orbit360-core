# Smoke mínimo LAB A&S — Orbit 360

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-continuidad-20260703`  
**Objetivo:** validar el primer LAB interno usable de A&S sin esperar producción completa.

## 1. Alcance del smoke

Este smoke no valida producción final. Solo valida que A&S pueda empezar a usar una base interna controlada para:

- clientes;
- aseguradoras;
- pólizas;
- cobros/recibos;
- comisiones base;
- Cliente 360;
- recaudo sin duplicar ingresos.

## 2. Precondiciones

- Rama correcta: `ays/backend-tenant-continuidad-20260703`.
- Tenant: `alianzas-soluciones`.
- No usar ramas de prototipo.
- No reemplazar `data/store.js` backend.
- No cargar datos reales en `seed.js`.
- No hacer deploy público.
- No activar producción.

## 3. Dataset mínimo

### 3.1 Aseguradoras

Mínimo:

- 3 GT;
- 3 CO;
- con código/NIT/contacto/teléfono/email si existe.

Fuente preferida:

- Directorio GT 2026;
- Directorio CO 2024.

### 3.2 Clientes

Mínimo:

- 5 clientes GT;
- 5 clientes CO o solo GT si el primer uso será Guatemala.

Campos mínimos:

- nombre;
- identificación/NIT si existe;
- país;
- teléfono/WhatsApp;
- email;
- asesor.

### 3.3 Pólizas

Mínimo:

- 5 pólizas vigentes;
- 2 por renovar;
- 1 vencida/cancelada para validar histórico.

Campos mínimos:

- número;
- cliente;
- aseguradora;
- ramo/producto;
- vigencia;
- forma de pago;
- prima neta;
- IVA;
- prima total;
- moneda.

### 3.4 Cobros/recibos

Mínimo:

- recibos pendientes;
- recibos vencidos;
- recibos pagados.

Campos mínimos:

- póliza;
- cliente;
- fecha vencimiento;
- cuota;
- prima neta;
- IVA;
- total;
- estado.

## 4. Casos de prueba

### S1 — Crear/leer aseguradora

Acción:

1. Crear aseguradora GT.
2. Crear contacto.
3. Leer desde módulo Aseguradoras.

Esperado:

- aparece en directorio;
- contactos visibles;
- no queda hardcodeada;
- `tenantId = alianzas-soluciones`.

### S2 — Crear cliente

Acción:

1. Crear cliente A&S LAB.
2. Asignar asesor.
3. Leer en Cliente 360.

Esperado:

- cliente visible;
- asesor visible;
- país y moneda correctos;
- actividad inicial registrada si aplica.

### S3 — Crear póliza vigente

Acción:

1. Crear póliza para cliente.
2. Asociar aseguradora.
3. Definir forma de pago.

Esperado:

- póliza visible en módulo Pólizas;
- visible en Cliente 360;
- genera recibos/cobros si corresponde;
- moneda según país.

### S4 — Cartera vigente

Acción:

1. Consultar Cobros.
2. Filtrar pendientes.
3. Revisar póliza vencida/cancelada.

Esperado:

- solo cobros pendientes de pólizas vigentes/por renovar del año actual están en cartera;
- vencidas/canceladas quedan histórico;
- no aparecen como cartera vigente.

### S5 — Aplicar pago

Acción:

1. Aplicar pago a un recibo.
2. Guardar fecha/método.
3. Revisar cobro, Cliente 360 y Finanzas.

Esperado:

- cobro queda `Pagado`;
- aparece como recaudo comercial;
- producción recaudada se actualiza;
- comisión estimada se puede calcular;
- NO se crea `finmov` automático.

### S6 — Crear movimiento financiero real

Acción:

1. Registrar comisión efectivamente recibida de aseguradora o ingreso bancario real.

Esperado:

- se crea `finmov`;
- queda asociado a factura/comisión/aseguradora si aplica;
- no duplica el pago aplicado del cliente.

### S7 — Comisión base

Acción:

1. Calcular comisión sobre prima neta recaudada.
2. Calcular comisión asesor sobre base antes de IVA.

Esperado:

- comisión intermediario calculada;
- comisión asesor calculada;
- estado `Por liquidar` o equivalente;
- trazabilidad a cobro/póliza/cliente.

### S8 — Cliente 360

Acción:

1. Abrir cliente.
2. Revisar tabs/datos.

Esperado:

- datos generales;
- pólizas;
- cobros;
- historial;
- comisiones relacionadas;
- documentos si existen;
- país/moneda correctos.

## 5. Criterio de aprobación del Corte 1

El LAB interno básico queda aprobado si:

- se puede consultar al menos un cliente completo;
- ese cliente tiene una póliza;
- esa póliza tiene cobro/recibo;
- se puede aplicar pago sin crear `finmov`;
- se puede registrar un `finmov` real aparte;
- aseguradoras GT/CO cargan desde backend/dataset controlado;
- existe reporte de importación o carga;
- todo queda documentado.

## 6. Criterio de rechazo

Rechazar el corte si:

- se mezclan GTQ/COP en totales crudos;
- se crea `finmov` automáticamente al aplicar pago;
- se cargan datos reales en `seed.js`;
- se pierde tenant isolation;
- se toca rama de prototipo para backend;
- no existe reporte de qué se cargó.

## 7. Reporte esperado

Al terminar el smoke se debe documentar:

```txt
Fecha:
Rama:
Tenant:
Datos cargados:
Casos aprobados:
Casos fallidos:
Errores:
Pendientes:
Archivos tocados:
¿Aplica a Claude?: sí/no
¿Aplica a core?: sí/no
¿Aplica solo A&S?: sí/no
```

## 8. Estado

**Estado:** LISTO PARA EJECUTAR.  
**Siguiente acción:** preparar dataset/plantilla de carga o adapter LAB para ejecutar casos S1–S8.
