# Auditoría operacional — Portal + Cobros + Cliente360 contra contrato documental v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## 1. Alcance

Auditar los módulos visibles relacionados con documentos, adjuntos, pago reportado y cobros contra el contrato recién fijado en:

```txt
orbit360-platform/docs/CONTRATO-MODELO-DOCUMENTOS-STORAGE-ADJUNTOS-AYS-20260708.md
```

Módulos revisados:

```txt
orbit360-platform/modules/portal.js
orbit360-platform/modules/cobros.js
orbit360-platform/modules/cliente360.js
```

No se tocó backend protegido, `index.html`, `data/store.js`, Store Firestore LAB, Auth, importadores, reglas ni producción.

## 2. Hallazgos por módulo

### 2.1 Portal Cliente — pago reportado

Estado actual observado:

- El portal permite reportar pago con archivo de soporte.
- El reporte actualiza el cobro con `reportado`, `soporteNombre` y `notaReporte`.
- Inserta actividad indicando `Pago reportado por el cliente` y detalle `pendiente de validar`.
- Puede crear gestión `Validar pago reportado` cuando existe `Orbit.ciclo.crearGestion`.
- El toast indica `pendiente de revisión/conciliación`.

Evaluación:

- Bien: el copy evita decir pago aplicado.
- Bien: se crea actividad/gestión.
- Pendiente: falta crear registro documental metadata-only en `documentos` o `adjuntos` vinculado al cobro.
- Pendiente: falta estado documental explícito (`recibido`, `en_revision`, `requiere_validacion`).
- Pendiente: falta `parchesPendientes` si el soporte propone datos nuevos.
- Pendiente: falta trazabilidad documental completa (`origen`, `tipoFuente`, `entidadTipo`, `entidadId`, `visibleParaRoles`).

Riesgo:

- El soporte queda como nombre en el cobro, no como documento/adjunto auditable.

### 2.2 Portal Cliente — subir documento

Estado actual observado:

- El portal permite cargar documento general.
- Inserta en `documentos` con `clienteId`, `tipo`, `nombre`, `fecha`, `origen`, `archivoPendienteStorage`.
- Inserta actividad de expediente.
- Copy indica que la carga real requiere Storage/canal conectado.

Evaluación:

- Bien: no guarda archivo real ni base64.
- Bien: reconoce Storage pendiente.
- Pendiente: el estado debe estandarizarse (`recibido` / `en_revision` / `aprobado_para_expediente`).
- Pendiente: crear `adjuntos` o declarar relación visible por rol.
- Pendiente: evitar copy fuerte de `expediente` si no está aprobado; preferir `registrado para revisión del expediente`.
- Pendiente: si el documento propone datos de cliente/póliza, debe abrir diff, no modificar directo.

### 2.3 Cobros — estados de validación

Estado actual observado:

- Existe función de estado visible que separa reportado, en revisión, validada por aplicar, requiere validación, bloqueado, pagado por conciliar y conciliado.
- La tabla permite filtrar reportado, conciliado, requiere validación, bloqueado y anulado.

Evaluación:

- Bien: el modelo visual ya reconoce que reportado ≠ aplicado.
- Bien: `validadoReporte` se muestra como `Validada (por aplicar)`.
- Pendiente: validar/rechazar reporte debe pedir motivo y bitácora.
- Pendiente: rechazar reporte no debe borrar trazabilidad; debe conservar histórico.
- Pendiente: bloquear/anular reporte/documento debe estar disponible con motivo.

### 2.4 Cobros — validar reporte

Estado actual observado:

- `validarReporte` permite marcar en revisión, rechazar o validar reporte.
- Rechazar reporte limpia `reportado`, `enRevision` y `notaReporte`.
- Validar solo marca `validadoReporte: true` y `enRevision: false`.

Evaluación:

- Bien: validar no aplica pago directamente.
- Pendiente crítico: no pide motivo.
- Pendiente crítico: no registra auditoría estructurada.
- Pendiente crítico: rechazo borra la nota del cliente y no conserva razón.
- Pendiente: no crea/vincula documento/adjunto del soporte.
- Pendiente: no controla país/moneda antes de habilitar aplicación posterior.

### 2.5 Cobros — aplicar pago / conciliar factura

Estado actual observado:

- `aplicarPago` permite confirmar cobro manualmente y cambiar estado a `Pagado`.
- Si se carga factura opcional, marca `conciliado`.
- Inserta actividad de pago confirmado.
- Dispara automatización `pago_aplicado`.

Evaluación:

- Riesgo: confirma cobro sin exigir motivo/bitácora explícita.
- Riesgo: factura adjunta se maneja por nombre, no como documento/adjunto metadata-only.
- Riesgo: copy `Al cargar la factura, el recibo pasa a Conciliado` puede ser demasiado fuerte si no hay validación M5 o país/moneda.
- Pendiente: separar `pago_confirmado` de `conciliacion_validada` y `conciliacion_aplicada`.
- Pendiente: país/moneda deben bloquear aplicación si faltan o no coinciden.
- Pendiente: motivo obligatorio para aplicar pago desde Cobros.

### 2.6 Cliente360 — visibilidad documental

Estado actual observado:

- Cliente360 muestra resumen, pólizas, vehículos, cobros, recibos, renovaciones, siniestros, comisiones, correos e historial.
- No existe pestaña específica de documentos/adjuntos.
- Actividades pueden reflejar documentos, pero no hay vista documental estructurada.

Evaluación:

- Pendiente crítico para UX/Claude: agregar bloque/pestaña Documentos.
- Debe separar:
  - documentos de expediente aprobados;
  - soportes de pago en revisión;
  - documentos rechazados/bloqueados;
  - parches pendientes por aprobar.

## 3. Contrato operacional requerido

### Portal Cliente

Cuando el cliente reporte pago con soporte:

1. Registrar pago reportado con estado honesto.
2. Crear/relacionar documento metadata-only.
3. Crear/relacionar adjunto visible para Cobros/Operativo.
4. Crear gestión de validación.
5. No aplicar pago.
6. No crear cartera.
7. Mostrar al cliente `Soporte recibido · pendiente de validación`.

Cuando el cliente suba documento:

1. Crear `documentos` con estado `recibido` o `en_revision`.
2. Marcar `archivoPendienteStorage=true` o `storageEstado=pendiente_storage`.
3. Crear `adjuntos` si se relaciona con cliente/póliza/cobro/siniestro.
4. No actualizar cliente/póliza sin diff.

### Cobros

Para reporte de pago:

- `en_revision`: motivo opcional/nota interna.
- `rechazar`: motivo obligatorio; conservar trazabilidad.
- `validar`: motivo obligatorio; no aplicar pago.
- `bloquear`: motivo obligatorio.
- `aplicar pago`: motivo obligatorio + país/moneda + estado válido + auditoría.

### Cliente360

Debe mostrar documentos/adjuntos por cliente:

- Por estado.
- Por relación.
- Por rol/visibilidad.
- Con parches pendientes.
- Con acciones autorizadas y motivo.

## 4. Instrucciones para Claude

Claude debe implementar UX visible para:

- Portal: pago reportado con soporte y documento recibido.
- Cobros: revisión documental, validar/rechazar/bloquear con motivo.
- Cliente360: pestaña Documentos.
- Academia: lecciones por rol.

Claude NO debe:

- marcar soporte como pago aplicado;
- mostrar Storage real si no está conectado;
- borrar nota/reporte sin trazabilidad;
- crear cliente/póliza/cobro desde documento sin diff;
- mezclar documento, cobro, cartera y finmovs.

## 5. Recomendación técnica

No aplicar hotfix grande todavía en estos módulos sin smoke visual. Primero fijar contrato operacional, y luego hacer patch quirúrgico con uno de estos enfoques:

1. Patch directo a Portal/Cobros/Cliente360 para agregar estados/copy/bitácora mínima.
2. O paquete Claude para reconstruir UX documental con menos riesgo visual.

Dado que el cambio incluye UI visible y navegación, se recomienda enviarlo a Claude después de completar este bloque de auditoría y addendum.

## 6. Estado

Auditoría documental/operacional completada. Pendiente decidir entre hotfix quirúrgico o paquete Claude para UX visual.