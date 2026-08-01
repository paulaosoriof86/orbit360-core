# Academia Orbit 360 — Conciliación multievidencia y temporal

Fecha: 2026-08-01  
Bloque: Cobros/Conciliación  
Estado: read-only/dry-run

## Idea central

Un cobro no se valida con una sola pantalla ni con un solo archivo. Orbit 360 conserva cada evidencia y construye una línea de tiempo:

```text
recibo esperado
→ pendiente en cartera al corte T1
→ pago reportado después de T1
→ ausencia o cambio en cartera posterior T2
→ comisión reconocida por aseguradora
→ soporte bancario solo cuando haga falta
→ autorización humana
→ cobro conciliado
```

## Qué prueba cada fuente

- CRM de cobranza: la corredora reportó el pago.
- Reporte de pagos/ingresos de aseguradora: la aseguradora registró el recaudo.
- Estado de cartera: qué recibos seguían pendientes en una fecha específica.
- Comparación de carteras: si un recibo estaba pendiente y deja de aparecer en un corte posterior comparable, existe evidencia de cancelación, ajuste o pago; no se crea un cobro automáticamente.
- Planilla de comisiones: la aseguradora reconoció una prima recaudada y una comisión. Puede existir desfase entre fecha de pago, devengo y pago de comisión.
- Estado bancario: corrobora el flujo financiero cuando un HOLD concreto lo requiere.
- Histórico financiero: no sustituye ninguna de las fuentes anteriores y no crea cobros.

## Regla de corte temporal

Un pago posterior al corte de una cartera es válido. La cartera solo describe el estado en su fecha de corte. Por tanto:

- pendiente al 20 de julio + pago el 22 de julio = secuencia coherente;
- no debe rechazarse el pago por no estar reflejado en la cartera anterior;
- una cartera antigua conserva valor histórico, pero no reemplaza el saldo vigente;
- una obligación que desaparece sin otra evidencia queda en `REQUIERE_VALIDACION`.

## Reglas de seguridad

- comisión sola no crea cobro;
- ausencia sola en una cartera posterior no crea cobro;
- banco solo no crea cobro;
- pago exacto más evidencia temporal o comisión aumenta confianza, pero requiere autorización;
- diferencias de monto, moneda, cuota, endoso o vigencia se conservan;
- un pago de vigencia vencida se aplica al recibo histórico exigible correcto y no reactiva la póliza;
- nunca se escribe `finmovs` desde este bloque.

## Enseñanza por rol

### Dirección

Revisa la línea de tiempo, las fuentes, diferencias y nivel de confianza. Autoriza únicamente cuando la identidad del pago y del recibo es suficiente.

### Operativo

Resuelve HOLD, solicita solo la fuente vigente que falta, documenta corte/hash y evita volver a pedir archivos ya registrados. No sustituye un reporte de pagos con una cartera o con un estado bancario.

### Asesor

Ve únicamente sus clientes y relacionados. Puede aportar soporte o crear una gestión de corrección, pero no aplicar pagos, reasignar cobros ni modificar documentos validados.

## Ejemplos sanitizados del bloque

- Aseguradora General: una obligación estaba pendiente al 20/07/2026 y el reporte de ingresos la registra pagada el 22/07/2026. El pago posterior al corte es válido.
- Mapfre: el reporte actualizado al 31/07/2026 conserva cuatro pagos y el proyectado de agosto muestra requerimientos siguientes; no se confunden pagos anteriores con recibos futuros.
- Ficohsa: una planilla de comisión corrobora recaudo, pero una diferencia de prefijo de póliza y moneda frente al CRM obliga a HOLD.
- Bantrab: una cartera del 03/07/2026 puede compararse con pagos posteriores, pero diferencias de frecuencia y monto impiden una aplicación automática.

## Defecto funcional vs. contrato de datos

Este ajuste se clasifica como `DATA_CONTRACT_FAILURE`: el modelo anterior excluía indebidamente carteras y comisiones como evidencia de conciliación. No era un defecto visual ni un problema de Firebase. La solución cambia juntos owner, registro, pruebas, gate y Academia.
