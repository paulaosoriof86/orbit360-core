# Contrato operacional — Portal + Cobros + Cliente360 documentos visibles v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## 1. Objetivo

Traducir el contrato documental a reglas operativas visibles para Portal Cliente, Cobros y Cliente360.

## 2. Estados canónicos

### Pago reportado por cliente

```txt
recibido_pendiente_validacion
en_revision
requiere_aclaracion
rechazado
validado_no_aplicado
aplicado_pendiente_conciliacion
aplicado_conciliado
bloqueado
anulado
```

Regla fija:

```txt
validado_no_aplicado != pago aplicado
```

### Documento/adjunto

```txt
recibido
en_revision
propuesta_datos
requiere_validacion
aprobado_para_expediente
rechazado
bloqueado
archivado
```

### Parches propuestos desde documento

```txt
propuesto
requiere_validacion
aprobado_para_aplicar
rechazado
bloqueado
aplicado_con_auditoria
```

## 3. Portal Cliente

### Reportar pago

Debe generar:

- estado de cobro visible: `recibido_pendiente_validacion` o equivalente;
- documento metadata-only si hay soporte;
- adjunto relacionado con el cobro;
- actividad/gestión para Cobros;
- notificación interna si existe canal;
- mensaje honesto al cliente.

No debe generar:

- `estado=Pagado`;
- `conciliado=true`;
- cartera actualizada;
- producción/recaudo;
- finmovs.

Copy permitido:

```txt
Soporte recibido. Pendiente de validación por el equipo.
Tu pago fue reportado y está en revisión.
El equipo validará el soporte antes de aplicar el pago.
```

Copy no permitido:

```txt
Pago aplicado.
Pago confirmado.
Cobro conciliado.
Póliza pagada.
```

### Subir documento

Debe generar:

- documento estado `recibido` o `en_revision`;
- Storage estado `pendiente_storage` si no hay conexión real;
- relación con cliente o póliza cuando aplique;
- actividad de revisión.

No debe:

- actualizar cliente automáticamente;
- activar póliza;
- crear cobro/cartera;
- prometer Storage real.

## 4. Cobros

### Revisar pago reportado

Acciones mínimas:

```txt
marcar_en_revision
solicitar_aclaracion
rechazar_reporte
validar_reporte_no_aplicado
bloquear_reporte
aplicar_pago_autorizado
```

Acciones con motivo obligatorio:

```txt
rechazar_reporte
validar_reporte_no_aplicado
bloquear_reporte
aplicar_pago_autorizado
conciliar_con_soporte
```

Reglas de aplicación:

- No se puede aplicar si falta país.
- No se puede aplicar si falta moneda.
- No se puede aplicar GT con moneda distinta de GTQ.
- No se puede aplicar CO con moneda distinta de COP.
- No se puede aplicar si el soporte está bloqueado/rechazado.
- No se puede aplicar si el cobro ya está anulado.
- Si solo está `validado_no_aplicado`, debe mostrar pendiente de aplicación.

### Conciliar factura/soporte

Debe generar documento/adjunto metadata-only.

No debe almacenar:

- base64;
- bytes;
- URL pública;
- token;
- secreto.

## 5. Cliente360

Debe agregar o preparar vista de Documentos con cuatro secciones:

```txt
Expediente aprobado
Soportes de pagos en revisión
Documentos en revisión
Parches pendientes / diffs
```

Cada fila debe mostrar:

```txt
nombre visible
tipo
estado
origen
fecha
relación
visibilidad
responsable
acción permitida
```

Acciones por rol:

- Dirección/Admin: aprobar/rechazar/bloquear/aplicar diff.
- Cobros: revisar soporte de pago, vincular a conciliación, solicitar aclaración.
- Operativo: vincular documento a gestión/expediente, solicitar datos faltantes.
- Asesor: ver documentos autorizados de su cartera, crear gestión.
- Cliente: ver únicamente documentos permitidos en su portal.

## 6. Notificaciones

Eventos sugeridos:

```txt
portal_pago_reportado
soporte_pago_recibido
documento_recibido
documento_requiere_validacion
diff_documento_propuesto
pago_reportado_validado_no_aplicado
pago_reportado_rechazado
pago_aplicado_autorizado
```

Canales:

- Portal interno: permitido.
- Campana/notificación: permitido.
- Email/WhatsApp: solo preparado si no hay canal conectado.

## 7. Auditoría

Toda acción sensible debe registrar:

```txt
fecha
usuario
rol
tenantId
modulo
accion
motivo
documentoId opcional
adjuntoId opcional
cobroId opcional
clienteId opcional
polizaId opcional
before
after
resultado
```

## 8. Academia

Lecciones obligatorias:

- Cliente: cómo reportar pago y entender estados.
- Cobros: cómo validar soporte sin aplicar pago.
- Operativo: cómo relacionar documentos con gestiones.
- Dirección: cómo aprobar diffs y auditar documentos.
- IT: cómo funcionará Storage futuro por tenant.

## 9. Criterio de aceptación

Un candidato o hotfix pasa si:

- Portal no dice pago aplicado al reportar soporte.
- Cobros no aplica pago sin motivo y validación mínima.
- Cliente360 muestra documentos o queda documentado como pendiente visual explícito.
- No hay base64/bytes/URLs públicas/secretos.
- No se escriben clientes/pólizas/cobros/cartera desde documentos sin diff.
- Academia y manuales quedan actualizados.

## 10. Estado

Contrato operacional agregado. Pendiente convertir a UX final o hotfix quirúrgico.