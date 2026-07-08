# Ensayo M5 — Conciliación sensible: cobros, planillas y banco v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Definir el bloque sensible de migración y conciliación para cobros, planillas de aseguradoras, planillas de comisiones, estados de cuenta de clientes y estado bancario.

Este bloque NO debe ejecutarse antes de completar validación local/smoke de los módulos ya modificados y antes de probar fuentes de menor riesgo.

## Principio rector

```txt
Reportado no es pagado.
Conciliado no es aplicado sin gate.
Banco no crea cobros.
Financiero histórico no crea cartera.
Planilla de comisión no crea clientes ni pólizas.
Documento soporte no actualiza expediente sin diff.
```

## Fuentes involucradas

M5 agrupa fuentes de alto riesgo que deben mantenerse separadas:

1. `cobros_realizados`.
2. `planilla_aseguradora`.
3. `planilla_comisiones`.
4. `estado_cuenta_bancario`.
5. `estados_cuenta_clientes`.
6. `documentos_soporte` relacionados con pagos.

Ninguna fuente debe mezclar su escritura con otra.

## Orden recomendado de ejecución

### Fase 1 — Estados de cuenta de aseguradora/cliente

Objetivo:

- detectar recibos pendientes;
- detectar pagos reportados;
- proponer validación.

No debe:

- marcar cobros como pagados automáticamente;
- crear pólizas nuevas;
- crear clientes nuevos;
- escribir financiero histórico;
- confirmar recaudo.

Resultado esperado:

```txt
cobros o propuestas con estado pendiente_validacion / REQUIERE_VALIDACION
```

### Fase 2 — Planilla aseguradora

Objetivo:

- cruzar recibos/pólizas existentes;
- detectar recibos no creados;
- detectar pagos aplicados por aseguradora;
- generar propuestas.

No debe:

- crear clientes por inferencia;
- crear pólizas por inferencia;
- aplicar pagos sin gate;
- sobrescribir cartera sin diff.

Resultado esperado:

```txt
propuestas de conciliación por póliza/recibo con trazabilidad de fila real
```

### Fase 3 — Planilla de comisiones

Objetivo:

- leer filas reales de comisión;
- separar comisión esperada vs pagada;
- detectar diferencias;
- proponer conciliación;
- identificar pagos aplicados en meses donde financiero histórico no tiene movimiento.

No debe:

- simular tarifas;
- crear clientes;
- crear pólizas;
- crear cobros;
- confirmar producción por sí sola.

Resultado esperado:

```txt
comisiones/propuestas con MATCH_EXACTO, MATCH_PROBABLE, REQUIERE_VALIDACION o BLOQUEADO
```

### Fase 4 — Estado bancario

Objetivo:

- cargar movimientos bancarios a bandeja de conciliación;
- cruzar con cobros, comisiones y finanzas;
- detectar depósitos sin relación.

No debe:

- aplicar pagos automáticamente;
- crear cobros;
- crear clientes;
- crear pólizas;
- escribir cartera;
- confirmar producción.

Resultado esperado:

```txt
conciliacionBanco con estado pendiente_conciliacion
```

### Fase 5 — Aplicación final con gate

Solo después del cruce:

- fuente aseguradora;
- planilla comisión;
- banco;
- estado cliente;
- recibo/póliza existente;
- país/moneda confiable;
- periodo confiable.

La aplicación final debe requerir:

- revisión humana o rol autorizado;
- motivo cuando hay diferencia;
- trazabilidad de fuentes;
- registro de actividad/auditoría;
- diff antes de escribir.

## Junio y julio 2026

Junio y julio requieren manejo especial.

Razón:

- puede haber pagos aplicados en planillas de comisión que no aparecen en el histórico financiero;
- estados de cuenta de clientes pueden mostrar pagos pendientes, no necesariamente realizados;
- el banco puede mostrar depósitos agregados que no identifican póliza/recibo individual.

Regla:

```txt
Junio/julio no se resuelven por una sola fuente.
Deben cruzarse planilla comisión + estado aseguradora/cliente + banco + recibo/póliza existente.
```

## Estados canónicos sugeridos

### Cobro

- `Pendiente`.
- `Reportado`.
- `Validada_por_aplicar`.
- `Pagado`.
- `Rechazado`.
- `REQUIERE_VALIDACION`.

### Conciliación

- `pendiente_validacion`.
- `pendiente_conciliacion`.
- `MATCH_EXACTO`.
- `MATCH_PROBABLE`.
- `REQUIERE_VALIDACION`.
- `BLOQUEADO`.
- `APLICADO`.

### Comisión

- `esperada`.
- `pagada`.
- `conciliar`.
- `conciliada`.
- `requiere_validacion`.

## Reglas de país/moneda

- GT -> GTQ sugerida, no escritura automática si falta moneda explícita.
- CO -> COP sugerida, no escritura automática si falta moneda explícita.
- No sumar GTQ y COP en crudo.
- Si falta moneda confiable, queda `REQUIERE_VALIDACION`.
- Si falta país confiable, queda `REQUIERE_VALIDACION`.

## Reglas de producción, metas y comisiones

Producción, metas y comisiones deben calcularse sobre:

```txt
prima neta recaudada confirmada
```

No se calculan sobre:

- movimiento bancario sin conciliación;
- pago reportado por cliente;
- estado de cuenta pendiente;
- financiero histórico no clasificado;
- total bruto con IVA/gastos mezclados;
- moneda mezclada.

## Reglas de cartera

La cartera solo debe generarse desde pólizas:

- vigentes;
- por renovar;
- año actual;
- país y moneda confiables;
- forma de pago clara.

No genera cartera:

- cancelada;
- vencida;
- anulada;
- rechazada;
- sin país;
- sin moneda;
- desde financiero histórico;
- desde banco;
- desde documentos soporte.

## Riesgos principales

### 1. Aplicar pagos desde banco

Bloqueado. Banco solo propone conciliación.

### 2. Crear pólizas desde planillas

Bloqueado. La planilla puede detectar póliza no encontrada, pero no crearla sin flujo separado y confirmación.

### 3. Crear clientes desde cobros o movimientos

Bloqueado. Cliente se crea desde fuente clientes o documento con diff aprobado.

### 4. Mezclar GTQ/COP

Bloqueado. Toda comparación debe agruparse por país/moneda.

### 5. Simular tarifas de comisión

Bloqueado. Las tarifas deben venir de filas reales o quedar pendientes.

### 6. Marcar producción por pago reportado

Bloqueado. Producción exige recaudo confirmado.

## Criterio de aceptación M5

M5 pasa solo si:

- cada fuente conserva su colección de destino;
- dry-run muestra crear/actualizar/omitir/errores;
- reporte conserva archivo, hoja, fila, bloque, país, moneda y periodo;
- banco no aplica pagos;
- planilla comisión no crea cartera;
- estados de cuenta no confirman pagos automáticamente;
- diferencias quedan como propuestas;
- aplicación final tiene gate;
- no hay mezcla de monedas;
- junio/julio quedan conciliados por cruce de fuentes, no por una sola fuente.

## Orden de prioridad real

No iniciar M5 completo hasta cerrar:

1. check único de validación local;
2. smoke M2 calendario;
3. smoke M3 directorios;
4. smoke M4 financiero histórico;
5. Equipo/Configuración gates o decisión consciente de operar solo en LAB.

## Impacto Claude/prototipo

Claude debe conservar cuando entre:

- estados intermedios visibles;
- `Reportado` distinto de `Pagado`;
- propuestas de conciliación antes de aplicar;
- trazabilidad de fuentes;
- alertas de moneda/país;
- bloqueo de aplicación automática desde banco;
- vista de diferencias por recibo/póliza/comisión;
- lenguaje honesto: propuesta no es aplicación.

## Impacto Academia

Academia debe enseñar:

- diferencia entre cobro, recaudo, banco y financiero histórico;
- cómo revisar pago reportado;
- cómo validar planilla de aseguradora;
- cómo validar planilla de comisión;
- cómo cruzar junio/julio;
- cuándo una diferencia se bloquea;
- cómo aplicar un pago con autorización;
- por qué producción se calcula solo con prima neta recaudada confirmada.

## Estado

Documento creado.
No se tocó código funcional.
No se subieron fuentes reales.
No se cargaron datos reales.
No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No secretos.
