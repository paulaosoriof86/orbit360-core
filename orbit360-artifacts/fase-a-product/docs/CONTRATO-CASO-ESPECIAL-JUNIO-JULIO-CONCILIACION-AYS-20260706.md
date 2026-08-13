# Contrato — Caso especial junio/julio 2026 para conciliación A&S

**Fecha:** 2026-07-06  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Estado:** contrato plan-only; no lee datos reales y no escribe.

---

## 1. Objetivo

Definir el tratamiento especial para conciliación de junio y julio 2026 cuando la información puede venir de planillas de comisión, estados de cuenta de clientes, estados bancarios y movimientos financieros con coberturas incompletas entre fuentes.

Este contrato no importa datos reales, no infiere clientes o pólizas, no escribe cartera, no aplica pagos y no crea cobros.

---

## 2. Problema operativo documentado

Para junio/julio 2026 puede existir desalineación temporal entre fuentes:

- planillas de comisión muestran pagos aplicados el mes anterior;
- estados de cuenta de clientes suelen mostrar pagos pendientes más que pagos realizados;
- movimientos financieros pueden no cubrir junio/julio completos;
- banco no debe convertirse automáticamente en cobro aplicado;
- la conciliación debe proponer relaciones y bloqueos, no escribir cartera ni producción.

---

## 3. Fuentes separadas autorizadas

```txt
planilla_comisiones
planilla_aseguradora
estado_cuenta_cliente
estado_cuenta_bancario
cobros_realizados
financiero_historico
polizas
clientes
aseguradoras
configuracion_catalogo
```

Regla: cada fuente conserva su identidad. No se mezclan filas ni se fusionan sin trazabilidad.

---

## 4. Reglas por fuente

### planilla_comisiones

Puede proponer:

```txt
posible pago aplicado por aseguradora
posible prima neta recaudada
posible comisión devengada/pagada
relación póliza/recibo si viene identificada
periodo de aplicación
```

No puede:

```txt
crear cliente
crear póliza
crear cobro aplicado
modificar cartera directamente
actualizar producción sin validación
```

### planilla_aseguradora

Puede proponer:

```txt
estado de recibo en aseguradora
monto aplicado por aseguradora
periodo de aplicación
relación con póliza/recibo
```

No puede escribir cartera ni cobros sin conciliación.

### estado_cuenta_cliente

Puede proponer:

```txt
saldo pendiente reportado al cliente
recibos pendientes
posible diferencia contra cartera
```

No debe tratarse como pago realizado.

### estado_cuenta_bancario

Puede proponer:

```txt
posible pago recibido
fecha banco
monto banco
referencia bancaria
posible match contra pago reportado o recibo
```

No puede crear cobro aplicado sin conciliación y autorización.

### financiero_historico

Puede apoyar análisis financiero histórico, pero no debe crear cartera, cobros ni producción.

---

## 5. Estados de conciliación especial

```txt
PROPUESTA
EN_REVISION
REQUIERE_VALIDACION
VALIDADA_NO_APLICADA
RECHAZADA
BLOQUEADA
```

Bloqueado en esta fase:

```txt
APLICADA
PAGO_APLICADO
COBRO_APLICADO
```

---

## 6. Reglas de país y moneda

- GT -> GTQ.
- CO -> COP.
- Nunca sumar GTQ y COP en crudo.
- Si falta país o moneda confiable: `REQUIERE_VALIDACION`.
- Si una fila trae moneda no confiable o inferida, no autorizar escritura.

---

## 7. Trazabilidad obligatoria

Cada propuesta debe conservar:

```txt
fuente
archivo
hoja
fila
bloque
periodo
pais
moneda
monto
referencia
clienteId si existe
polizaId si existe
reciboId si existe
source_ref
confidence
bloqueos
```

No se permite payload real en código ni documentación del repo.

---

## 8. Producción, cartera y cobros

Reglas:

- Producción, metas y comisiones se calculan sobre prima neta recaudada validada.
- Cartera solo nace de recibos pendientes de pólizas vigentes/por renovar del año actual.
- Cobro aplicado requiere fase posterior autorizada.
- Pago reportado no es cobro aplicado.
- Banco no es cobro aplicado por sí solo.
- Planilla de comisión no es cartera.
- Financiero histórico no es cartera ni producción.

---

## 9. Resultado permitido en esta fase

La salida permitida es una propuesta de conciliación:

```txt
conciliacion_id
fuente_principal
fuentes_relacionadas
estado
motivo
bloqueos
confianza
trazabilidad
accion_recomendada
```

Acciones recomendadas permitidas:

```txt
revisar manualmente
pedir soporte
validar con aseguradora
validar con cliente
relacionar con pago reportado
relacionar con recibo
marcar como diferencia
```

No permitidas:

```txt
aplicar pago
crear cobro
cerrar recibo como pagado
mover cartera
actualizar producción
actualizar comisión como pagada
```

---

## 10. Impacto en Portal, Cobros y Academia

Portal:

- cliente ve pago reportado como pendiente de revisión/conciliación.
- estado de cuenta cliente no debe mostrarse como pago realizado.

Cobros:

- bandeja debe mostrar propuestas y bloqueos.
- Validada no es aplicada.

Academia:

- explicar diferencia entre planilla, banco, estado de cuenta cliente, cobro realizado y financiero histórico.
- explicar que junio/julio puede requerir validación especial por desalineación temporal.
- reforzar que no se promete pago aplicado sin conciliación.

---

## 11. Estado

Contrato agregado como plan-only. No se procesaron archivos reales, no se leyó payload real, no se escribieron datos, no se hizo deploy y no se hizo merge.