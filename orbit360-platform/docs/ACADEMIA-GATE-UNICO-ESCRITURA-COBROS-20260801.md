# Academia — Gate único de escritura de Cobros

Fecha: 2026-08-01  
Bloque: Cobros/Conciliación 10.9

## Flujo que debe comprender cada rol

```text
evidencia conciliada
→ decisión de Dirección
→ preflight estático
→ autorización explícita de ejecución LAB
→ snapshot
→ escritura atómica
→ verificación
→ cierre o rollback
```

## Dirección / AdminTenant

- aprueba o rechaza cada caso;
- aprueba el histórico de manera separada;
- comprende que aprobar casos no ejecuta todavía la escritura;
- debe emitir una segunda autorización para armar y ejecutar el mismo gate en LAB;
- producción y deploy se autorizan después y por separado.

## Operativo

- verifica los cinco snapshots antes de escribir;
- confirma que las idempotencias no existan;
- ejecuta cada grupo de forma atómica;
- detiene el lote ante fallo;
- verifica el resultado o activa rollback;
- no crea movimientos financieros desde cobros.

## Asesor

- puede consultar el estado de sus clientes dentro de sus scopes;
- no arma ni ejecuta el gate;
- no aprueba cobros;
- no crea recibos históricos;
- reporta inconsistencias mediante una gestión.

## Diferencia clave

`Caso aprobado` no significa `escritura autorizada`. El preflight demuestra que el plan es ejecutable y reversible, pero mantiene `writeEligible=0` hasta una autorización LAB explícita.

## Caso histórico

El grupo histórico debe:

1. comprobar que la póliza permanece vencida o no renovada;
2. comprobar que no existe ya el recibo histórico;
3. crear el recibo histórico exigible;
4. insertar y aplicar el cobro;
5. no reactivar la póliza;
6. no crear `finmov`;
7. eliminar cobro y recibo histórico si la operación debe revertirse.

## Error funcional versus validador obsoleto

Un defecto funcional cambia datos o comportamiento. Un `VALIDATOR_STALE` compara un nombre o versión antigua contra un producto correcto. Antes de repetir un gate se debe ejecutar el validador directamente y corregir la capa obsoleta, sin parchear el producto.
