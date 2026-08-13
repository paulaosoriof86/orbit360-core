# ACTUALIZACIÓN DELTA PARA CLAUDE — PÓLIZA, RECIBOS Y RECAUDO v1.199b

Fecha: 2026-07-11  
Base Claude: candidata v1.197  
Base viva: rama `ays/backend-tenant-lab-v99-20260703`.

## Propósito

Registrar los cambios locales posteriores a la candidata para que la siguiente entrega de Claude sea realmente incremental. La próxima candidata no debe reconstruir ni simplificar estos patrones.

## Archivos locales posteriores

```txt
core/access-ceilings-v1199.js
core/policy-receipts-engine.js
core/policy-receipts-v1199-refinements.js
modules/policy-receipts-v1199-bridge.js
modules/policy-receipts-v1199-detail-guard.js
data/academia-v1199-policy-receipts.js
```

Claude no debe copiar lógica backend exclusiva, pero sí reflejar los contratos de producto, UX y Academia.

## Patrones obligatorios para el prototipo

### Alta de póliza

- no generar números ficticios;
- exigir cliente, país, moneda, aseguradora vinculada, número, ramo, producto, estado y vigencia;
- mostrar prima neta, gastos, recargo, otros, IVA y total por separado;
- previsualizar recibos antes de guardar;
- Vigente/Por renovar genera cartera;
- estados históricos no generan cartera;
- mostrar errores operativos, no términos técnicos.

### Idempotencia y trazabilidad

- llave canónica de póliza;
- recibos con secuencia estable;
- reintento sin duplicados;
- identificador de operación;
- nunca borrar recibos pagados;
- recibos sustituidos deben quedar Anulados con motivo;
- cambios críticos requieren motivo y antes/después.

### Permisos

- rol y alcance son dimensiones separadas;
- Asesor puede consultar su cartera y completar faltantes;
- Asesor no modifica pólizas, pagos, conciliaciones, asignaciones o estados críticos;
- el sistema crea una gestión de corrección/endoso cuando el usuario no tiene permiso;
- la matriz configurable no puede abrir acciones que contradigan límites de seguridad del producto.

### Recaudo

- pago reportado no equivale a pago aplicado;
- pago aplicado no equivale a conciliado;
- recaudo no crea `finmovs`;
- el estado debe mostrar “pendiente de conciliación” hasta confirmar el cruce;
- los canales de envío solo se presentan como activos cuando están conectados.

### Conciliación

- banco/factura/planilla crea una propuesta;
- validar una propuesta no debe aplicar automáticamente el pago;
- conservar país, moneda, monto, cliente, póliza, recibo, fuente, archivo/fila y documento;
- `documentRef` en lugar de archivo embebido/Data URL;
- una propuesta activa por recibo;
- estado vacío y bloqueos honestos.

### KPI y navegación

- valores GTQ y COP separados;
- cada KPI abre los registros que lo componen;
- detalle permite abrir Póliza/Cliente/Recibo;
- conservar filtro y contexto al regresar;
- no presentar conversiones de referencia como cifras operativas oficiales.

### Academia

Incorporar las rutas v1.199 por rol activo:

- llave canónica;
- prima desglosada;
- estados que generan cartera;
- recibos no destructivos;
- endoso requerido cuando hay pagos;
- recaudo vs ingreso financiero;
- conciliación como propuesta;
- documentos por referencia;
- evaluación y errores frecuentes.

## Defectos que todavía deben documentarse en la candidata futura

1. Renovaciones mezcla monedas en “Prima en juego”.
2. Renovaciones afirma envío WhatsApp + correo aunque los canales pueden no estar conectados.
3. Renovaciones calcula primas deterministas de ejemplo; no deben presentarse como tarifa/propuesta real.
4. Falta flujo final de renovación con nueva póliza, vínculo a póliza anterior y no duplicación.
5. Falta editor de endosos por tipo.
6. Falta precargar y editar vehículo vinculado sin crear duplicados.
7. Falta evidencia visual responsive del cierre CRM.
8. Falta transacción backend durable; Claude solo debe mostrar estados honestos, no simularla.

## No entregar a Claude

```txt
payload real A&S
secretos
reglas Firebase/Auth
bóveda/OAuth real
URLs privadas
cuentas reales
configuración LAB
lógica exclusiva de seguridad backend
```

## Base incremental del próximo paquete

```txt
candidata v1.197 aceptada
+ empalme v1.197
+ cierre CRM v1.198
+ cierre Póliza/Recibos v1.199b
+ contratos y documentación posteriores
```

Estado: `ACUMULADO_PARA_PROXIMO_PAQUETE_CLAUDE`.
