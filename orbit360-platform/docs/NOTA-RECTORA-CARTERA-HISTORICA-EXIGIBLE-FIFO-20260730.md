# NOTA RECTORA — CARTERA HISTÓRICA EXIGIBLE Y APLICACIÓN AL REQUERIMIENTO MÁS ANTIGUO

Fecha: 2026-07-30
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## 1. Decisión funcional confirmada

Una póliza cuya vigencia contractual ya venció **no genera nuevas cuotas ni nuevo calendario operativo**.

Sin embargo, si una aseguradora reporta un recibo/saldo pendiente real asociado a una vigencia ya vencida, ese saldo **sí debe conservarse como obligación histórica exigible** y debe permanecer disponible para gestión y aplicación posterior de pagos.

La vigencia contractual y la exigibilidad financiera son dimensiones distintas.

## 2. Regla de cartera

Se separan dos universos:

1. `cartera_activa_generada`: recibos/cuotas de pólizas `Vigente` o `Por renovar`, derivados de su calendario y forma de pago.
2. `cartera_historica_exigible`: saldos pendientes confirmados por fuente de aseguradora/SIGA correspondientes a vigencias ya vencidas, sin regenerar cuotas ni reactivar la póliza.

Una póliza vencida/cancelada/anulada no debe producir cuotas nuevas por inferencia. Solo puede aportar saldo histórico exigible cuando exista evidencia trazable de la obligación pendiente.

## 3. Aplicación de pagos

Cuando un cliente efectúe un pago y existan varios requerimientos compatibles pendientes, la propuesta de aplicación debe priorizar el requerimiento exigible más antiguo (`oldest outstanding first`), preservando:

- cliente;
- aseguradora;
- moneda;
- póliza/recibo cuando exista referencia explícita;
- fecha límite/vencimiento;
- monto pendiente;
- fuente y provenance;
- restricciones de conciliación.

La aplicación automática no debe cruzar cliente, aseguradora o moneda. Si la evidencia del pago trae una referencia explícita incompatible con FIFO, el caso debe pasar a conciliación/validación en lugar de forzar una aplicación.

## 4. Impacto sobre Recibos/Cartera PREWRITE 9.0.0

El paquete `PREWRITE_READY` que consideraba únicamente términos activos y dejaba términos históricos fuera queda **congelado para escritura** hasta recalcular el universo de `cartera_historica_exigible` reportado por aseguradoras.

Clasificación: `DATA_CONTRACT_FAILURE` respecto de la nueva regla funcional confirmada.

No se reabre Pólizas ni Vehículos. No se modifica infraestructura transversal. Se corrige solo el contrato/dataset de Recibos/Cartera y sus validadores asociados.

## 5. Siguiente cierre requerido

1. Identificar en cada fuente de aseguradora los saldos pendientes asociados a vigencias no activas.
2. Vincularlos a cliente/póliza/recibo con identidad segura.
3. Deduplicar contra recibos activos ya incluidos.
4. Crear `cartera_historica_exigible` sin generar cuotas nuevas.
5. Recalcular conteos/digests.
6. Ejecutar gate contractual actualizado + prewrite read-only.
7. Solo después declarar un nuevo `PREWRITE_READY` y solicitar/aceptar autorización macro de escritura.

## 6. Impacto Claude / prototipo reusable

- Patrón reusable: separar estado contractual de póliza vs exigibilidad financiera del saldo.
- Debe compartirse con Claude: Sí.
- UX: calendario activo no debe llenarse con pólizas históricas; la cartera sí debe poder mostrar sección/filtro `Saldos históricos pendientes`.
- Aplicación de pagos: mostrar propuesta `más antiguo primero` con trazabilidad y posibilidad de revisión cuando haya conflicto.
- Academia: explicar diferencia entre vigencia de póliza, recibo pendiente, cartera activa, cartera histórica exigible y conciliación.

## 7. Prohibiciones

- No reactivar póliza vencida para conservar una deuda.
- No regenerar cuotas históricas por forma de pago si la fuente no las confirma.
- No eliminar saldo pendiente únicamente porque terminó la vigencia.
- No aplicar pagos a ciegas solo por antigüedad si existe conflicto de cliente/aseguradora/moneda/referencia.
- No escribir el PREWRITE 9.0.0 anterior sin reconstrucción y nueva evidencia.
