# Contrato canónico — Cobros/Conciliación read-only

Fecha: 2026-08-01  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block10-cobros-conciliacion-readonly-static-v20260801`

## Propósito

Abrir Cobros/Conciliación sin confundir recibos, cartera, pagos reportados, propuestas, cobros conciliados y movimientos financieros. Este contrato es read-only/dry-run y no autoriza escrituras.

## Owner de propuestas

La bandeja canónica de revisión es:

`conciliaciones`

La colección de dominio:

`conciliacionesPrimas`

se conserva como detalle de conciliación de primas y se proyecta en lectura hacia la bandeja. No se duplica la propuesta escribiendo en ambas colecciones. Cuando existe una propuesta canónica con la misma identidad, prevalece `conciliaciones`.

## Fase activa

`READ_ONLY_DRYRUN`

Durante esta fase:

- las propuestas solo pueden verse;
- no se validan, rechazan, bloquean ni anulan mediante escritura;
- no se confirma ningún cobro;
- no se carga factura para marcar conciliado;
- no se ejecuta `postRecaudo`;
- no se crean actividades ni automatizaciones por pago;
- no se modifica cartera;
- no se crean `cobros` ni `finmovs`.

El owner `modules/conciliaciones.js`, cargado después de `modules/cobros.js`, bloquea las acciones directas legacy mientras la fase read-only esté vigente.

## Contrato de identidad y conciliación

- Una sola fuente no auto-concilia.
- El match exige fuentes autoritativas distintas y relación one-to-one.
- Núcleo: aseguradora, póliza, moneda y monto dentro de tolerancia.
- Desambiguadores: recibo canónico, número de requerimiento, cuota/serie, fecha límite, fecha de pago y cliente.
- Un pago CRM no puede utilizarse dos veces.
- Empate, conflicto o identidad insuficiente pasa a `REQUIERE_VALIDACION`.
- Las diferencias de fecha y centavos se conservan en `sourceDifferences`.

## FIFO puro

El owner expone `simulateFifo(payment, obligations, options)` como función pura sin escrituras.

Reglas:

1. Aplica primero la obligación exigible aplicable más antigua.
2. Incluye cartera histórica exigible de vigencias recientemente vencidas.
3. Puede continuar con la obligación activa posterior del mismo cliente, aseguradora y moneda.
4. No mezcla monedas, clientes ni aseguradoras.
5. No incluye obligaciones futuras salvo opción explícita de simulación.
6. Soporta pago parcial.
7. Conserva excedente sin aplicarlo silenciosamente.
8. No reutiliza una obligación duplicada.
9. No reactiva una póliza vencida.
10. Devuelve `writes: 0` y `operationalWrites: 0`.

## Evidencia histórica disponible

La auditoría real sanitizada conserva únicamente el resultado agregado:

- reportes de aseguradora: 2;
- filas revisadas: 9;
- candidatas one-to-one: 5;
- HOLD/no-match: 4;
- cobros materializados: 0;
- finmovs materializados: 0.

No existe fixture sanitizado fila por fila. Las nueve filas no deben reconstruirse ni inventarse. Un nuevo dry-run de datos requiere las fuentes autoritativas vigentes.

## No regresión

El gate estático debe probar:

- `conciliaciones` como bandeja canónica;
- proyección read-only de `conciliacionesPrimas`;
- deduplicación con preferencia canónica;
- bloqueo físico de acciones legacy;
- FIFO histórico→activo;
- pagos parciales y excedentes;
- separación de monedas;
- exclusión de obligaciones futuras;
- cero reactivación de póliza;
- evidencia histórica 2/9/5/4 sin fabricar filas;
- cero escrituras, browser, secretos, deploy y producción.

## Frontera siguiente

Después del gate estático se podrá realizar un inventario read-only de fuentes vigentes y un dry-run real crear/actualizar/omitir/HOLD. La aplicación de cobros requerirá un gate y autorización distintos, con rollback exacto y auditoría before/after.
