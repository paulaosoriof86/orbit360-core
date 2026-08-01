# Academia — Materialización privada real de Cobros

Fecha: 2026-08-01  
Bloque: Cobros/Conciliación 10.8

## Objetivo de aprendizaje

Diferenciar cuatro estados que no pueden confundirse:

```text
evidencia disponible
→ caso conciliable
→ tarjeta privada materializada
→ autorización humana
→ escritura efectiva
```

La materialización real confirma que los datos necesarios existen y pueden presentarse, pero no autoriza ni ejecuta un cobro.

## Dirección / AdminTenant

Debe comprender:

- por qué recibe cuatro casos directos y un caso histórico separado;
- que una tarjeta validada sigue con `authorizationGranted=false`;
- que puede aprobar o rechazar cada caso individualmente;
- que aprobar casos directos no aprueba el histórico;
- que el histórico exige confirmación reforzada y operación atómica;
- que un pago aplicado a vigencia vencida no reactiva la póliza.

## Operativo

Debe validar:

- que las fuentes privadas coincidan con la referencia opaca;
- que existan al menos dos pruebas independientes por caso;
- que el recibo canónico preceda a FIFO cuando ya existe;
- que no se use banco, comisión o financiero como autoridad única;
- que el payload se destruya al terminar la revisión;
- que la autorización no se transforme automáticamente en escritura.

## Asesor

Puede consultar el estado relacionado con sus clientes, pero no puede:

- materializar payloads privados;
- aprobar cobros;
- crear recibos históricos;
- modificar pagos validados;
- ver auditoría interna o fuentes sensibles.

Cuando detecte una inconsistencia debe crear una gestión de corrección.

## Escenario aplicado

Un reporte del CRM y uno de aseguradora coinciden en póliza, cuota o endoso, moneda y monto dentro de la tolerancia aprobada.

- Si existe recibo canónico, se prepara una tarjeta directa.
- Si la vigencia reciente terminó y no existe recibo, se prepara una tarjeta histórica reforzada.
- Si falta identidad confiable, hay diferencia material de monto o vigencia incorrecta, el caso permanece HOLD.

## Errores que deben evitarse

- asumir que “materializado” significa “aprobado”;
- guardar nombres, pólizas o montos en artifacts;
- volver a pedir fuentes ya registradas sin comprobar disponibilidad;
- usar la planilla de comisiones como cobro automático;
- crear un `finmov` a partir de un recaudo;
- reactivar una póliza vencida al recibir un pago.

## Evidencia que queda

Solo se conserva:

- referencia opaca;
- categoría del caso;
- cantidad de pruebas;
- controles de autorización;
- conteos agregados;
- confirmación de destrucción;
- cero escrituras.

No se conservan valores privados en el repositorio ni en el artifact.
