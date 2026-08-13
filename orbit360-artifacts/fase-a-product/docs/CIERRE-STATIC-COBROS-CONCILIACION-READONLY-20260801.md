# Cierre estático — Cobros/Conciliación read-only

Fecha: 2026-08-01  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Veredicto

`GO_STATIC_COBROS_CONCILIACION_READONLY`

Gate:

- gateId: `block10-cobros-conciliacion-readonly-static-v20260801`;
- contrato: `10.0.0`;
- run: `30678802532`;
- artifact: `8811458432`;
- digest: `sha256:618d292a65768d2ceeaff6d30b332dbf696276ed0ff4ea0e5ea295f40105dcac`;
- checks: 40/40 PASS.

## Causa raíz corregida

La primera ejecución `30678678193` se detuvo antes de evaluar Cobros porque el gate cerrado de Recibos fue invocado en fase `PREWRITE`. Su request autorizado permanece correctamente en el repo, por lo que el lifecycle esperaba una condición incompatible.

Clasificación: `VALIDATOR_STALE`.

Corrección:

- producto congelado;
- gate 9.1.0 verificado en su lifecycle cerrado `AUTHORIZED_WRITE`;
- gate 10.0.0 ejecutado exclusivamente con capacidades estáticas cero;
- no hubo tercer intento.

## Owner canónico

`modules/conciliaciones.js` ahora:

- usa `conciliaciones` como bandeja canónica;
- proyecta `conciliacionesPrimas` únicamente en lectura;
- evita duplicados y da precedencia a la propuesta canónica;
- bloquea `aplicarPago`, `validarReporte`, `conciliarFactura` y `lote` del módulo legacy;
- deshabilita los botones equivalentes cuando se renderizan;
- no ejecuta `postRecaudo`;
- no escribe `cobros`, `finmovs`, cartera ni actividades.

## FIFO probado

La función pura `simulateFifo` quedó protegida por pruebas sintéticas:

- obligación histórica exigible más antigua primero;
- continuación sobre vigencia actual;
- pago parcial;
- excedente preservado;
- monedas, clientes y aseguradoras no se mezclan;
- obligaciones futuras excluidas;
- pagos/obligaciones no se reutilizan;
- póliza vencida no se reactiva;
- writes: 0.

## Evidencia real histórica preservada

- reportes revisados: 2;
- filas pagadas: 9;
- candidatas one-to-one: 5;
- HOLD/no-match: 4;
- row-level replay: no disponible;
- cobros materializados: 0;
- finmovs materializados: 0.

No se reconstruyeron ni inventaron las nueve filas.

## Capacidades ejecutadas

- secrets: false;
- Firestore read: false;
- writes: false;
- browser: false;
- deploy: false;
- Rules/Functions/Storage: false;
- producción: false.

## Siguiente acción exacta

1. inventariar contratos y adaptadores existentes para `cobros_realizados`, `planilla_aseguradora`, `planilla_comisiones`, `estado_cuenta_bancario` y `documentos_soporte`;
2. preparar manifiesto de fuentes vigentes y trazabilidad archivo/hoja/fila/bloque/país/moneda/periodo;
3. construir dry-run crear/actualizar/omitir/HOLD sin escrituras;
4. recibir las fuentes vigentes cuando el motor esté listo para ejecutar datos reales;
5. no usar el archivo financiero histórico ni estados bancarios como cobro directo.
