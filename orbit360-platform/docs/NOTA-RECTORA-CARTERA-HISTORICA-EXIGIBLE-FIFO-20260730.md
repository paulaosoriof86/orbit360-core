# NOTA RECTORA — CARTERA HISTÓRICA EXIGIBLE Y APLICACIÓN AL REQUERIMIENTO MÁS ANTIGUO

Fecha: 2026-07-30
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## 1. Decisión funcional confirmada

Una póliza cuya vigencia contractual ya venció **no genera nuevas cuotas ni nuevo calendario operativo**.

Sin embargo, si una aseguradora reporta un recibo/saldo pendiente real asociado a una **vigencia vencida reciente**, ese saldo **sí debe conservarse como obligación histórica exigible** y debe permanecer disponible para gestión y aplicación posterior de pagos.

La vigencia contractual y la exigibilidad financiera son dimensiones distintas.

La expresión `vigencia vencida reciente` no debe convertirse en un número arbitrario de meses hardcodeado. Para este cierre, el carácter reciente se determina por el horizonte de la fuente vigente de la aseguradora/SIGA y por la evidencia de que el recibo o saldo continúa reportado como pendiente/exigible. Un histórico antiguo que ya no figure como saldo pendiente vigente no entra en cartera por inferencia.

## 2. Regla de cartera

Se separan dos universos:

1. `cartera_activa_generada`: recibos/cuotas de pólizas `Vigente` o `Por renovar`, derivados de su calendario y forma de pago.
2. `cartera_historica_exigible`: saldos pendientes confirmados por fuente vigente de aseguradora/SIGA correspondientes a vigencias vencidas recientes, sin regenerar cuotas ni reactivar la póliza.

Una póliza vencida/cancelada/anulada no debe producir cuotas nuevas por inferencia. Solo puede aportar saldo histórico exigible cuando exista evidencia trazable y actual de la obligación pendiente. Histórico antiguo sin saldo vigente confirmado permanece únicamente como histórico.

## 3. Aplicación de pagos

Cuando un cliente efectúe un pago y existan varios requerimientos compatibles pendientes, la propuesta de aplicación debe priorizar el requerimiento exigible más antiguo (`oldest outstanding first`), incluyendo primero los saldos de vigencias vencidas recientes cuando sean el requerimiento compatible más antiguo, y preservando:

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

El paquete `PREWRITE_READY` que consideraba únicamente términos activos y dejaba términos históricos fuera queda **congelado para escritura** hasta recalcular el universo de `cartera_historica_exigible` de vigencias vencidas recientes reportado por aseguradoras.

Clasificación: `DATA_CONTRACT_FAILURE` respecto de la nueva regla funcional confirmada.

No se reabre Pólizas ni Vehículos. No se modifica infraestructura transversal. Se corrige solo el contrato/dataset de Recibos/Cartera y sus validadores asociados.

## 5. Siguiente cierre requerido

1. Identificar en cada fuente vigente de aseguradora/SIGA los saldos pendientes asociados a vigencias vencidas recientes.
2. Excluir histórico antiguo que no figure actualmente como obligación pendiente/exigible.
3. Vincular los saldos exigibles a cliente/póliza/recibo con identidad segura.
4. Deduplicar contra recibos activos ya incluidos.
5. Crear `cartera_historica_exigible` sin generar cuotas nuevas.
6. Recalcular conteos/digests.
7. Ejecutar gate contractual actualizado + prewrite read-only.
8. Solo después declarar un nuevo `PREWRITE_READY` y solicitar/aceptar autorización macro de escritura.

## 6. Impacto Claude / prototipo reusable

- Patrón reusable: separar estado contractual de póliza vs exigibilidad financiera del saldo.
- Debe compartirse con Claude: Sí.
- UX: calendario activo no debe llenarse con pólizas históricas; la cartera sí debe poder mostrar sección/filtro `Saldos históricos pendientes` limitada a obligaciones vigentes confirmadas de vigencias recientes.
- Aplicación de pagos: mostrar propuesta `más antiguo primero` con trazabilidad y posibilidad de revisión cuando haya conflicto.
- Academia: explicar diferencia entre vigencia de póliza, recibo pendiente, cartera activa, cartera histórica exigible reciente y conciliación.

## 7. Prohibiciones

- No reactivar póliza vencida para conservar una deuda.
- No regenerar cuotas históricas por forma de pago si la fuente no las confirma.
- No convertir todo histórico vencido en cartera.
- No eliminar saldo pendiente únicamente porque terminó la vigencia.
- No inventar un umbral temporal de `reciente` sin contrato/fuente que lo soporte.
- No aplicar pagos a ciegas solo por antigüedad si existe conflicto de cliente/aseguradora/moneda/referencia.
- No escribir el PREWRITE 9.0.0 anterior sin reconstrucción y nueva evidencia.
