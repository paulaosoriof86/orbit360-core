# Matriz Gates — Siniestros, Cancelaciones, Cobros y Conciliaciones v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Definir las acciones administrativas directas necesarias para resolver operación diaria en Siniestros, Cancelaciones, Cobros y Conciliaciones sin depender de correcciones externas, pero con gates, auditoría, trazabilidad y lenguaje honesto.

## Principios operativos

1. La plataforma debe resolver casos operativos desde UI.
2. No toda acción puede mutar datos productivos.
3. Reportar no es validar.
4. Validar no es aplicar.
5. Preparar no es enviar.
6. Conciliar no es crear pago desde banco sin confirmación.
7. Cobros/recaudos no son `finmovs`.
8. Una propuesta de conciliación no toca cartera por sí sola.
9. Una cancelación histórica no debe borrar trazabilidad.
10. Un siniestro pagado debe conservar bitácora y soporte.

## Estados canónicos por módulo

### Cobros

```txt
Pendiente
Vencido
Reportado por cliente
En revisión
Validada (por aplicar)
Pagado (por conciliar)
Conciliado
Requiere validación
Bloqueado
Anulado
```

### Conciliaciones

```txt
PROPUESTA
EN_REVISION
VALIDADA
RECHAZADA
BLOQUEADA
ANULADA
```

### Siniestros

```txt
Reportado
En análisis
Documentación
Aprobado
Pagado
Rechazado
```

### Cancelaciones

```txt
Pendiente de contacto
Llamada de retención agendada
Oferta de mejora enviada
En negociación
Recuperada
No recuperable
```

## Matriz — Cobros

### Reportar pago desde Portal/Cliente

Nivel: Gate 1 para cliente portal.

Debe hacer:

- guardar reporte del cliente;
- adjuntar nombre/soporte si existe;
- marcar como reportado o en revisión;
- crear actividad visible para asesor/cobros;
- NO cambiar a pagado;
- NO crear recaudo;
- NO conciliar.

Debe decir:

```txt
Pago reportado. Pendiente de revisión/conciliación.
```

No debe decir:

```txt
Pago aplicado
Pago confirmado
Recibo pagado
```

### Validar reporte de pago

Nivel: Gate 2.

Permitido para:

- Cobros;
- Operaciones;
- Dirección;
- Admin tenant.

Debe requerir:

- confirmación;
- soporte o motivo si no hay soporte;
- actividad/auditoría;
- mantener estado `Validada (por aplicar)`.

No debe aplicar pago automáticamente.

### Confirmar cobro

Nivel: Gate 3.

Debe requerir:

- fecha;
- método;
- confirmación;
- usuario responsable;
- actividad/auditoría;
- si hay factura, puede marcar conciliado;
- si no hay factura, queda `Pagado (por conciliar)`.

Debe alimentar producción/metas/comisiones solo si corresponde a prima neta recaudada.

No debe mezclar monedas ni registrar en `finmovs` como histórico financiero.

### Conciliar factura

Nivel: Gate 3.

Debe requerir:

- factura/soporte;
- fecha real de pago;
- confirmación;
- actividad/auditoría.

Debe cambiar:

```txt
Pagado (por conciliar) -> Conciliado
```

No debe crear cliente/póliza/cobro nuevo.

### Preparar recordatorios por lote

Nivel: Gate 2.

Estado actual:

- Pendiente funcional por aplicar en `modules/cobros.js`.
- Documentado en errata y parche local listo.
- No se debe considerar cerrado por incidente PowerShell.

Debe hacer:

- seleccionar recibos pendientes/vencidos;
- preparar mensajes;
- registrar actividad como `Recordatorio preparado`;
- preparar correos en bandeja central si aplica;
- NO afirmar WhatsApp/correo real enviado;
- NO bajar pendientes por entrega no confirmada.

Texto obligatorio:

```txt
Recordatorios preparados; envío real requiere canal conectado.
```

## Matriz — Conciliaciones

### Crear propuesta de conciliación

Nivel: Gate 1/2 según fuente.

Debe venir de:

- estado de cuenta bancario;
- planilla de aseguradora;
- planilla de comisiones;
- importador con fuente/hoja/fila.

Debe conservar:

- fuente;
- archivo;
- hoja;
- fila;
- país;
- moneda;
- score;
- bloqueo si falta dato confiable.

No debe tocar cobros.

### Tomar en revisión

Nivel: Gate 1/2.

Debe hacer:

- cambiar propuesta a `EN_REVISION`;
- registrar responsable;
- registrar fecha/hora.

No debe tocar cobros.

### Validar propuesta

Nivel: Gate 2.

Debe hacer:

- cambiar propuesta a `VALIDADA`;
- registrar responsable;
- registrar auditoría;
- dejar lista para proceso posterior autorizado.

No debe aplicar pago automáticamente.

### Aplicar validación posterior

Nivel: Gate 3 / backend.

Debe requerir:

- propuesta validada;
- país/moneda confiable;
- match con recibo/póliza/cliente;
- confirmación;
- auditoría;
- ejecución por backend o acción administrativa controlada.

No debe existir como acción oculta en la bandeja de conciliación.

### Rechazar, bloquear o anular propuesta

Nivel: Gate 2.

Debe requerir:

- motivo;
- responsable;
- auditoría.

No debe borrar propuesta; debe conservar trazabilidad.

## Matriz — Siniestros

### Crear reclamo

Nivel: Gate 2.

Debe requerir:

- cliente;
- póliza si existe;
- tipo;
- fecha;
- monto reclamado;
- descripción;
- usuario responsable;
- actividad inicial.

Debe permitir crear aunque falte póliza solo si queda `Requiere validación` o pendiente de vinculación.

### Agregar movimiento a bitácora

Nivel: Gate 1.

Debe requerir:

- nota no vacía;
- usuario;
- timestamp.

No debe cambiar estado si solo es nota.

### Cambiar estado operativo

Nivel: Gate 2 para:

```txt
En análisis
Documentación
```

Debe registrar bitácora y actividad.

### Cambiar a estado final

Nivel: Gate 3 para:

```txt
Aprobado
Pagado
Rechazado
```

Debe requerir:

- confirmación;
- motivo;
- usuario;
- timestamp;
- estado anterior y nuevo;
- auditoría;
- soporte si aplica.

Si estado nuevo es `Aprobado` o `Pagado` y falta monto aprobado, debe mantener alerta:

```txt
Monto aprobado pendiente de confirmar
```

### Actualizar gestiones asociadas

Nivel: Gate 2/3.

Debe hacer:

- agregar nota a gestiones relacionadas;
- marcar resuelta solo si el reclamo llega a `Pagado` o `Rechazado`;
- conservar bitácora.

No debe cerrar gestiones sin traza.

### Preparar correo a aseguradora

Nivel: Gate 1.

Debe usar compositor central y decir preparar, no enviar, salvo proveedor conectado.

## Matriz — Cancelaciones

### Registrar acción de recuperación

Nivel: Gate 2.

Debe requerir:

- estado de recuperación;
- nota o motivo si cambia a final;
- usuario;
- actividad.

### Crear negocio de recuperación

Nivel: Gate 3.

Debe aplicarse si recuperación está en estados activos:

```txt
Pendiente de contacto
Llamada de retención agendada
Oferta de mejora enviada
En negociación
```

Debe evitar duplicados:

- guardar `recuperacionNegocioId`; o
- buscar negocio existente por `origen=Recuperación`, `clienteId`, `polizaId`, `cancelacionId` si existe.

No debe crear un negocio nuevo cada vez que se guarda la ficha.

### Crear gestión de reemisión

Nivel: Gate 3.

Debe aplicarse cuando se marca `Recuperada`.

Debe evitar duplicados:

- guardar `recuperacionGestionId`; o
- detectar gestión existente por cliente/póliza/origen.

Debe decir:

```txt
Reemisión operativa preparada/creada en Ops
```

solo si efectivamente crea gestión en Ops.

### Marcar No recuperable

Nivel: Gate 2.

Debe requerir motivo.

No debe borrar póliza ni cancelación histórica.

### Recuperada

Nivel: Gate 3.

Debe requerir:

- confirmación;
- motivo/nota;
- actividad;
- vínculo a negocio/gestión de recuperación;
- no reactivar póliza automáticamente sin emisión/validación.

## Antiduplicados obligatorios

### Cancelaciones

No crear más de un negocio/gestión por la misma cancelación salvo que usuario confirme explícitamente “crear nuevo seguimiento adicional”.

### Siniestros

No duplicar gestiones cerradas por múltiples cambios repetidos al mismo estado final.

### Cobros

No duplicar actividades de recordatorio por lote sin fecha/tanda de preparación.

### Conciliaciones

No validar dos propuestas contra el mismo recibo sin alerta de conflicto.

## Auditoría mínima por acción

Cada acción Gate 2/3 debe registrar:

```txt
modulo
accion
entidadTipo
entidadId
usuario
rol
fechaHora
estadoAnterior
estadoNuevo
motivo
resultado
fuente
pais
moneda
```

Si no existe backend real, registrar en `actividades` o documentar como auditoría local de prototipo.

## Impacto Claude/prototipo

Claude debe conservar estas reglas de UX:

- `Reportar pago` no es `Pago aplicado`.
- `Validar propuesta` no es `Aplicar pago`.
- `Preparar recordatorio` no es `Enviar recordatorio`.
- `Recuperada` no reactiva póliza sola; genera gestión/reemisión.
- `Aprobado/Pagado/Rechazado` en siniestros requiere motivo.
- `Conciliaciones` es bandeja de propuestas, no motor de aplicación automática.
- Mostrar badges honestos: preparado, pendiente, validado, aplicado, conciliado, bloqueado.

## Impacto Academia

Academia debe incluir rutas por rol:

### Cobros

- Diferencia entre reportado, validado, confirmado y conciliado.
- Recordatorios por lote como preparación.
- Recaudo confirmado como base de producción/metas/comisiones.

### Operaciones / Conciliación

- Leer propuesta.
- Revisar fuente/hoja/fila.
- Validar/rechazar/bloquear.
- No aplicar pagos sin gate posterior.

### Siniestros

- Bitácora obligatoria.
- Estados finales con motivo.
- Soportes y correos preparados.

### Retención / Cancelaciones

- Gestión de recuperación.
- No duplicar oportunidades.
- No borrar histórico.

## Prioridad de implementación

### Bloque 1 — Imprescindible antes de uso operativo real

1. Cobros lote: corregir lenguaje y estado de preparado.
2. Cancelaciones: anti-duplicado de negocios/gestiones.
3. Aseguradoras: bloquear borrado si hay vínculos.
4. Equipo/Configuración: gates mínimos para roles, permisos, plan, módulos y reset.
5. Siniestros: gate con motivo para estados finales.

### Bloque 2 — Necesario para migración real

1. Importador por fuentes separadas.
2. Dry-run + diff + confirmación.
3. Trazabilidad archivo/hoja/fila/país/moneda.
4. Conciliación validada pero no aplicada hasta gate final.
5. Estado `REQUIERE_VALIDACION` cuando falte dato confiable.

### Bloque 3 — Comercialización robusta

1. Centro de acciones administrativas.
2. Bitácora/auditoría por tenant.
3. Academia con evaluaciones por rol.
4. Integraciones reales con proveedor confirmado.
5. Reportes de adopción y auditoría.

## Estado

Documento creado como contrato de implementación.
No se tocó código funcional.
No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No datos reales.
No secretos.
