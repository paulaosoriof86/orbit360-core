# Contrato conciliación — aseguradoras, comisiones, cartera y recibos

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato funcional/backend. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Definir cómo conciliar recibos/cartera pagada y pendiente contra estados de cuenta periódicos de aseguradoras y planillas mensuales de comisiones.

## 2. Fuentes separadas

Las fuentes se mantienen separadas:

- `estado_cuenta_aseguradora`;
- `planilla_comisiones`;
- `cobros_realizados`;
- `polizas`;
- `financiero_historico`;
- `estado_cuenta_bancario`.

No mezclar fuentes ni aplicar pagos sin trazabilidad.

## 3. Estado de cuenta de aseguradora

Debe permitir validar si los recibos:

- aparecen en el estado de cuenta;
- tienen estado correcto;
- coinciden en póliza, cliente, recibo, moneda, monto y periodo;
- están pagados, pendientes, anulados o vencidos;
- faltan en Orbit y deben proponerse o generarse según regla validada.

## 4. Planilla mensual de comisiones

La planilla de comisiones puede confirmar que un recibo fue recaudado/aplicado por la aseguradora.

Si la planilla muestra recibo con coincidencia confiable y Orbit no tiene pago aplicado:

- crear propuesta de aplicación;
- o aplicar si la regla está aprobada y la confianza es alta;
- registrar origen, archivo, hoja, fila, periodo, moneda y usuario/proceso;
- dejar excepción si falta coincidencia.

## 5. Reglas de confianza

Aplicación automática solo si coinciden suficientes campos:

- aseguradora;
- número de póliza;
- número de recibo o cuota;
- cliente;
- moneda;
- monto;
- periodo;
- estado de planilla o estado de cuenta.

Si hay duda: `REQUIERE_VALIDACION`.

## 6. Impacto cuando se aplica pago

Aplicar un pago debe actualizar, según corresponda:

- cobros/cartera;
- Cliente360;
- Portal Cliente;
- estado de póliza/recibo;
- analíticas;
- producción sobre prima neta recaudada;
- metas;
- proyecciones;
- comisiones;
- liquidaciones;
- novedades/notificaciones;
- reportes;
- finanzas si corresponde.

## 7. No mezclar monedas

GT → GTQ.
CO → COP.

No sumar monedas distintas en crudo. Si falta país/moneda: `REQUIERE_VALIDACION`.

## 8. Excepciones

Crear excepción cuando:

- recibo aparece en aseguradora pero no en Orbit;
- recibo aparece en Orbit pero no en aseguradora;
- monto no coincide;
- moneda no coincide;
- estado no coincide;
- póliza no coincide;
- cliente no coincide;
- recibo parece duplicado;
- falta información de periodo.

## 9. Portal y Cliente360

Cuando un pago se aplica por conciliación, Cliente360 y Portal deben mostrar estado actualizado y trazabilidad simple:

- fuente de conciliación;
- fecha de aplicación;
- estado;
- documento relacionado si es visible;
- mensaje claro para cliente.

## 10. Academia y manuales

Actualizar:

- manual Cobros;
- manual Comisiones;
- manual Finanzas;
- manual Cliente360;
- ruta Cobros;
- ruta Administrativo/Operativo;
- ruta Dirección.

## 11. Estado

Contrato creado. Debe guiar validadores y smokes de conciliación.
