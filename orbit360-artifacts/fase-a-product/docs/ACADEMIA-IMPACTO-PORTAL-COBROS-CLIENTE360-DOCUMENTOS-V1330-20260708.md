# Academia — impacto Portal + Cobros + Cliente360 documentos visibles v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Traducir la auditoría operacional de Portal, Cobros y Cliente360 en rutas de aprendizaje para usuarios finales, operativos y administrativos.

## Ruta 1 — Cliente final / Portal Cliente

### Lecciones

1. Cómo reportar un pago.
2. Cómo adjuntar soporte.
3. Qué significa soporte recibido.
4. Qué significa pago en revisión.
5. Qué significa pago aplicado.
6. Cómo subir documentos del expediente.
7. Qué documentos puede ver el cliente.

### Mensaje clave

Subir un soporte no significa que el pago ya fue aplicado. El equipo debe validarlo y, cuando corresponda, aplicarlo.

### Caso práctico

El cliente adjunta comprobante de transferencia. Debe ver:

```txt
Soporte recibido. Pendiente de validación por el equipo.
```

No debe ver:

```txt
Pago aplicado.
```

## Ruta 2 — Cobros / Finanzas

### Lecciones

1. Diferencia entre pago reportado, reporte validado y pago aplicado.
2. Cómo revisar soporte sin borrar trazabilidad.
3. Cómo rechazar con motivo.
4. Cómo solicitar aclaración.
5. Cómo aplicar pago autorizado.
6. Cómo conectar pago aplicado con M5 Conciliaciones.
7. Cómo manejar país/moneda.

### Caso práctico

Un reporte llega con soporte, pero el estado bancario no coincide. Acción correcta:

- marcar en revisión o requerir aclaración;
- no aplicar pago;
- dejar motivo y bitácora.

## Ruta 3 — Cliente360

### Lecciones

1. Cómo ver documentos de expediente.
2. Cómo ver soportes de pago en revisión.
3. Cómo revisar parches/diffs propuestos.
4. Cómo diferenciar documento aprobado vs documento en revisión.
5. Cómo escalar documentos bloqueados.

### Caso práctico

Documento de identidad propone cambio de nombre o identificación. Acción correcta:

- crear diff;
- revisar before/after;
- aprobar/rechazar con motivo;
- no modificar ficha automáticamente.

## Ruta 4 — Dirección / Admin

### Lecciones

1. Auditoría de documentos y pagos reportados.
2. Aprobación de cambios sensibles.
3. Control de visibilidad a cliente.
4. Bloqueo/anulación documental.
5. Riesgos de cumplimiento.

### Caso práctico

Un documento sensible debe volverse visible para cliente. Acción correcta:

- confirmar rol/autorización;
- motivo obligatorio;
- auditoría de visibilidad.

## Ruta 5 — IT / Seguridad

### Lecciones

1. Storage futuro por tenant.
2. No guardar base64/bytes en repo.
3. No exponer URLs públicas ni secretos.
4. Acceso por rol y relación.
5. Auditoría de lectura/descarga.

## Evaluaciones sugeridas

- ¿Qué estado debe ver el cliente al reportar pago?
- ¿Cuándo se puede aplicar un pago?
- ¿Se puede rechazar soporte sin motivo?
- ¿Cliente360 puede modificar datos desde documentos automáticamente?
- ¿Qué debe pasar si falta moneda?
- ¿Qué debe mostrarse si Storage no está conectado?

## Manuales impactados

- Manual Portal Cliente.
- Manual Cobros.
- Manual Finanzas / Conciliaciones M5.
- Manual Cliente360.
- Manual Documentos / Expediente.
- Manual Dirección/Admin.
- Manual IT/Seguridad.

## Certificados sugeridos

- Portal Cliente: reporte de pagos y documentos.
- Cobros: soporte, validación y aplicación.
- Cliente360: documentos y expediente.
- Dirección: auditoría documental y financiera.

## Estado

Impacto Academia documentado. Debe incluirse en el paquete Claude integral.