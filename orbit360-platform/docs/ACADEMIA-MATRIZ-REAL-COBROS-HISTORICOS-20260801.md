# Academia Orbit 360 — Matriz real de Cobros y recibos históricos

Fecha: 2026-08-01  
Bloque: Cobros/Conciliación  
Estado: read-only

## Diferencia fundamental

La regla que determina qué pólizas generan cartera no puede utilizarse para borrar evidencia de pagos:

```text
Vigente/Por renovar
→ genera recibos y cartera operativa

Vigencia vencida reciente
→ no genera cartera futura
→ sí puede conservar recibos históricos exigibles y recibir pagos
```

Un cliente puede pagar después de terminada una vigencia. El pago se aplica al requerimiento histórico correcto y no reactiva la póliza.

## Hallazgo real del bloque

El CRM reportó 68 pagos de julio y el paquete canónico conservó 63. Los cinco faltantes pertenecían a vigencias históricas recientes; no eran duplicados.

La corrección enseña que cada importador debe separar:

- elegibilidad para generar cartera;
- elegibilidad para conservar evidencia histórica;
- elegibilidad para recibir y conciliar pagos.

## Matriz de evidencia

Cada pago se revisa mediante una fila lógica:

```text
pago CRM
+ recibo canónico o propuesta histórica
+ reporte directo de aseguradora
+ estado de cartera anterior/posterior
+ comisión reconocida
+ soporte específico cuando haga falta
= decisión de conciliación
```

## Estados principales

### Match directo listo

CRM y aseguradora identifican la misma obligación. Aun así, la matriz crea una propuesta; no aplica el cobro automáticamente.

### Recibo histórico propuesto

El pago corresponde a una vigencia reciente vencida y el calendario activo no contiene ese requerimiento. Se reconstruye únicamente con trazabilidad, sin reactivar la póliza.

### Clearing temporal con póliza presente

El recibo desaparece de una cartera posterior, mientras la póliza y otros requerimientos siguen presentes. Es evidencia fuerte, pero requiere autorización.

### Clearing con póliza ausente

La póliza completa desaparece. Puede tratarse de pago, ajuste, exclusión o cambio de vigencia. Debe validarse.

### Corte anterior al pago

El estado de cartera es anterior al pago reportado. No puede confirmar qué ocurrió después, pero tampoco contradice el pago.

### HOLD

Se conserva cuando hay diferencia de monto, identidad insuficiente, moneda incompatible, periodicidad distinta o una obligación que sigue pendiente después del pago reportado.

## Enseñanza por rol

### Dirección

Autoriza propuestas con evidencia suficiente y revisa especialmente recibos históricos, diferencias de monto y desapariciones completas de póliza.

### Operativo

Trabaja por necesidad concreta. No vuelve a pedir una fuente con el mismo hash y solicita un corte vigente solo cuando el caso necesita evidencia posterior.

### Asesor

Puede aportar soporte y abrir una gestión de corrección. No aplica pagos, no cambia vigencias, no reactiva pólizas y no modifica documentos validados.

## FIFO correcto

FIFO solo opera cuando no existe identidad exacta suficiente:

1. recibo exacto;
2. endoso/cuota/vigencia exactos;
3. requerimiento histórico exigible más antiguo;
4. FIFO general dentro de la misma moneda y relación válida.

Nunca se usa FIFO para desplazar un pago hacia otra vigencia cuando la fuente identifica el recibo correcto.

## Seguridad

- una fila de fuente no puede reutilizarse;
- ausencia sola no crea cobro;
- comisión sola no crea cobro;
- banco solo no crea cobro;
- recibo histórico no reactiva póliza;
- Cobros no escribe `finmovs`;
- toda aplicación futura requiere diff, autorización, idempotencia y rollback.

## Defecto funcional vs. contrato de datos

El hallazgo se clasifica como `DATA_CONTRACT_FAILURE`: el filtro de cartera activa se reutilizó indebidamente para pagos históricos. No fue un problema visual, de navegador ni de Firebase.
