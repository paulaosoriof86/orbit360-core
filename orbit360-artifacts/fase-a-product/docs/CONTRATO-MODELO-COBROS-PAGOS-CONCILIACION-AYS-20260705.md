# Contrato backend — Cobros + pagos reportados + conciliación

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Estado:** contrato/modelo agregado; sin persistencia real.

---

## 1. Objetivo

Definir el modelo backend plan-only para cobros, pagos reportados y conciliación, manteniendo separación entre recaudos, cartera, movimientos financieros y producción.

Este contrato no crea cobros reales, no aplica pagos, no modifica cartera, no actualiza producción y no activa Firestore LAB.

---

## 2. Restricciones fijas

- No datos reales en código.
- Cobros/recaudos no son `finmovs`.
- Financiero histórico solo alimenta `finmovs`, no cobros.
- Estado bancario solo propone conciliación.
- Pago reportado no equivale a pago aplicado.
- Conciliación validada no equivale automáticamente a cobro aplicado.
- No modificar cartera sin conciliación y aprobación.
- No calcular producción desde pagos reportados.
- No mezclar monedas en crudo.
- No Firestore writes.
- No `Orbit.store` writes.
- No deploy.
- No merge.

---

## 3. Fuentes permitidas

Fuentes válidas para proponer cobros o conciliaciones:

```txt
cobros_realizados
planilla_aseguradora
planilla_comisiones
estado_cuenta_bancario
documentos_soporte
```

Reglas:

- `cobros_realizados` puede representar recaudos ya aplicados si cumple contrato y trazabilidad.
- `planilla_aseguradora` puede confirmar estado de recibos/cartera contra aseguradora.
- `planilla_comisiones` puede confirmar pagos aplicados cuando hay coincidencia confiable.
- `estado_cuenta_bancario` solo propone conciliación; no crea cobro directo.
- `documentos_soporte` solo propone evidencia o datos.
- `finmovs` y `financiero_historico` no crean cobros.
- `clientes` y `polizas` no crean cobros; solo se relacionan por IDs validados.

---

## 4. Colecciones previstas

```txt
cobros
pagosReportados
conciliacionesCobros
cobroReciboRelaciones
auditLog
```

Todas deben conservar `tenantId` y `source_ref`.

---

## 5. Modelo `cobros`

Campos mínimos:

```txt
tenantId
cobro_id
recibo_id
poliza_id
cliente_id
pais
moneda
fecha_recaudo
prima_neta_recaudada
gastos_recaudados
impuestos_recaudados
total_recaudado
medio_pago
estado_cobro
fuente_origen
source_ref
conciliacion_id
created_at
updated_at
```

Reglas:

- Solo existe cobro cuando hay fuente válida y conciliación/aprobación según regla vigente.
- Debe estar asociado a recibo, póliza y cliente confiables.
- Debe separar prima neta, gastos, impuestos y total recaudado.
- Producción/metas/comisiones usan `prima_neta_recaudada`.
- No duplicar ingresos en `finmovs`.

---

## 6. Modelo `pagosReportados`

Campos mínimos:

```txt
tenantId
pago_reportado_id
cliente_id
poliza_id
recibo_id
pais
moneda
monto_reportado
fecha_reporte
canal_reporte
estado_pago_reportado
documento_soporte_id
source_ref
created_at
updated_at
```

Estados mínimos:

```txt
REPORTADO
PENDIENTE_REVISION
REQUIERE_VALIDACION
CONCILIADO
RECHAZADO
BLOQUEADO
```

Reglas:

- Pago reportado por cliente queda pendiente de revisión/conciliación.
- Si trae adjunto, debe existir relación futura con documentos soporte.
- El cliente debe ver estado honesto.
- Reportado no significa cobrado.
- Reportado no genera producción.

---

## 7. Modelo `conciliacionesCobros`

Campos mínimos:

```txt
tenantId
conciliacion_id
tipo_fuente
source_ref
candidato_tipo
recibo_id
poliza_id
cliente_id
pais
moneda
monto
score
estado_conciliacion
decision
created_at
updated_at
```

Estados mínimos:

```txt
PROPUESTA
LISTA_REVISION
REQUIERE_VALIDACION
VALIDADA
RECHAZADA
BLOQUEADA
```

Reglas:

- Conciliación propone o valida coincidencia; no aplica pago por sí sola.
- Para futura aplicación se requerirá autorización explícita y auditLog.
- Si falta país, moneda, recibo, póliza, cliente o prima neta: `REQUIERE_VALIDACION`.
- Validada no significa pagada.

---

## 8. Modelo `cobroReciboRelaciones`

Campos mínimos:

```txt
tenantId
cobro_id
recibo_id
relacion_estado
source_ref
created_at
updated_at
```

Reglas:

- Relaciona un cobro con uno o más recibos según reglas posteriores.
- No debe asignar cobros a recibos de monedas distintas.
- Debe conservar trazabilidad.

---

## 9. Cartera y recibos

Reglas:

- Recibo se actualiza solo después de conciliación/aprobación.
- Cartera no se modifica desde estado bancario sin conciliación.
- Cartera no se modifica por pago reportado sin revisión.
- Cobro aplicado futuro debe ajustar saldo pendiente con auditLog.
- En fase plan-only: `can_modify_portfolio_now=false`.

---

## 10. Producción y comisiones

Reglas:

- Producción/metas/comisiones se calculan sobre `prima_neta_recaudada`.
- Pago reportado no cuenta como producción.
- Pago sin conciliación no cuenta como producción.
- Producción no se calcula sobre prima total.
- Comisiones no se simulan: deben leerse desde planillas reales cuando corresponda.

---

## 11. Trazabilidad obligatoria

Cada propuesta, pago reportado o conciliación debe conservar:

```txt
file
sheet
row
block
pais
moneda
periodo
source_ref
```

Además:

- conservar `auditLog` para cambios relevantes;
- conservar relación con documento soporte cuando exista;
- conservar estado visible para cliente y operativo;
- no ocultar excepciones.

---

## 12. Casos especiales junio/julio 2026

Los meses junio/julio 2026 requieren conciliación especial porque pueden existir pagos en planillas de comisiones que no estén en el archivo financiero histórico.

Regla:

- la planilla puede confirmar pago aplicado si hay coincidencia confiable;
- si no hay coincidencia confiable, queda propuesta o excepción;
- no aplicar automáticamente sin regla aprobada;
- no duplicar en `finmovs`.

---

## 13. Portal, adjuntos y documentos

Cuando cliente reporta pago con adjunto:

- crear/relacionar futuro `documento_soporte_id`;
- dejar estado visible para cliente;
- notificar a operativo/cobros cuando exista integración;
- permitir conciliación desde Cobros;
- no aplicar pago solo por adjunto.

---

## 14. Validador agregado

```txt
tools/orbit360-validar-modelo-cobros-pagos-conciliacion-ays.mjs
```

Uso previsto:

```txt
node tools/orbit360-validar-modelo-cobros-pagos-conciliacion-ays.mjs --model ruta/modelo-cobros.json --tenant alianzas-soluciones
```

El validador bloquea:

- `finmovs` o financiero histórico como fuente de cobros;
- estado bancario creando cobro directo;
- pago reportado tratado como cobro aplicado;
- conciliación validada tratada como cobro aplicado;
- producción desde pago reportado o no conciliado;
- modificación de cartera en fase plan-only;
- suma cruda de monedas;
- payload/filas reales;
- secretos o credenciales;
- banderas de escritura o aplicación.

---

## 15. Tests sintéticos agregados

```txt
tools/orbit360-test-validar-modelo-cobros-pagos-conciliacion-ays.mjs
```

Casos cubiertos:

- modelo válido;
- `finmovs` como fuente prohibida;
- banco creando cobro directo;
- pago reportado como cobrado;
- conciliación validada aplicando pago;
- producción desde pago reportado;
- modificación de cartera en fase plan-only;
- suma cruda multi-moneda;
- payload/filas reales.

---

## 16. Impacto en Academia y manuales

Debe actualizarse cuando Claude retome:

- diferencia entre pago reportado, conciliación, cobro aplicado y finmov;
- flujo Portal Cliente → Cobros → Conciliación → Cartera;
- uso de adjuntos/soportes;
- estados honestos visibles para cliente;
- producción sobre prima neta recaudada;
- casos especiales de planillas y meses no cubiertos por financiero histórico.

---

## 17. Estado

Contrato y tooling agregados en rama. No se ejecutó localmente. No hay persistencia real, creación de cobros, aplicación de pagos, modificación de cartera ni actualización de producción.