# Academia — impacto Documentos + Storage futuro + adjuntos A&S

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Registrar el impacto formativo del bloque Documentos + Storage futuro + adjuntos para que Claude/Academia lo conviertan en rutas guiadas, lecciones, evaluaciones y manuales.

## Rutas impactadas

### Portal Cliente

El cliente debe aprender:

- cómo reportar un pago;
- cómo adjuntar soporte;
- qué significa estado recibido;
- qué significa pendiente de validación;
- cuándo un pago queda aplicado realmente;
- por qué un documento cargado no cambia datos automáticamente.

### Cobros / Finanzas

El equipo debe aprender:

- revisar soporte de pago;
- contrastar soporte contra depósito/estado de cuenta;
- relacionar soporte con M5 Conciliaciones;
- validar/rechazar/bloquear sin aplicar pago automáticamente;
- evitar mezclar GTQ/COP;
- registrar motivo y bitácora.

### Operativo / Gestiones

El equipo debe aprender:

- vincular documento a gestión;
- enviar solicitud de datos faltantes;
- identificar documento en revisión vs documento aprobado;
- escalar documentos bloqueados o sospechosos;
- usar trazabilidad fuente/archivo/fila cuando aplique.

### Cliente360

El usuario debe aprender:

- ver documentos por cliente;
- ver documentos por póliza;
- distinguir documentos de expediente vs soportes en revisión;
- revisar parches pendientes derivados de documentos;
- no aplicar cambios sin diff.

### Dirección / Superadmin

Debe aprender:

- aprobar/rechazar diffs sensibles;
- controlar visibilidad a cliente;
- auditar documentos y descargas futuras;
- definir roles que pueden ver documentos sensibles;
- revisar riesgos de cumplimiento y privacidad.

### IT / Seguridad

Debe aprender:

- contrato de Storage futuro por tenant;
- aislamiento por ruta;
- política de no guardar base64/bytes en repo;
- acceso por rol/relación;
- auditoría de lectura/descarga.

## Lecciones requeridas

1. Documento recibido no equivale a dato aprobado.
2. Soporte de pago no equivale a pago aplicado.
3. Documento de identidad no modifica cliente sin diff.
4. Póliza emitida no activa póliza sin validación.
5. Storage pendiente no es Storage conectado.
6. Visibilidad de documentos depende de rol y relación.
7. País/moneda bloquean flujos monetarios.
8. Toda acción sensible requiere motivo y bitácora.

## Casos prácticos sugeridos

### Caso 1 — Pago reportado con soporte

Situación: un cliente sube un recibo desde Portal Cliente.

Resultado esperado:

- queda recibido;
- aparece para Cobros/Operativo;
- no marca cobro como pagado;
- puede pasar a conciliación;
- cliente ve estado honesto.

### Caso 2 — DPI/NIT con dato distinto

Situación: documento propone cambio de identificación o nombre.

Resultado esperado:

- se crea diff;
- no se actualiza cliente automáticamente;
- Dirección/Admin aprueba o rechaza;
- queda auditoría.

### Caso 3 — Póliza emitida adjunta

Situación: se carga póliza emitida para expediente.

Resultado esperado:

- se vincula al expediente si hay relación válida;
- propone datos faltantes;
- no crea cartera si falta estado/pais/moneda;
- no activa recibos automáticos sin validación.

### Caso 4 — Estado bancario con adjunto

Situación: se importa estado bancario o soporte de depósito.

Resultado esperado:

- genera propuesta de conciliación;
- no crea cobro;
- no aplica pago;
- requiere país/moneda coherente.

## Evaluaciones sugeridas

Preguntas de decisión:

- ¿Un soporte de pago adjunto permite marcar una póliza como pagada?
- ¿Qué debe pasar antes de actualizar datos del cliente desde un documento?
- ¿Qué estado debe ver el cliente cuando el soporte aún no fue validado?
- ¿Quién puede aprobar que un documento sea visible para cliente?
- ¿Qué debe ocurrir si falta moneda en un soporte relacionado con dinero?

## Certificados sugeridos

- Certificado Portal Cliente — reporte de pagos y documentos.
- Certificado Cobros y soportes documentales.
- Certificado Gestión de Expedientes Orbit 360.
- Certificado Seguridad Documental por tenant.

## Manuales que deben actualizarse

- Manual Portal Cliente.
- Manual Cobros / Finanzas.
- Manual Conciliaciones M5.
- Manual Cliente360.
- Manual Operativo / Gestiones.
- Manual Dirección / Superadmin.
- Manual Seguridad / IT.

## Mensajes UX sugeridos

Permitidos:

```txt
Soporte recibido. Pendiente de validación por el equipo.
Documento en revisión.
Cambio propuesto pendiente de aprobación.
Documento aprobado para expediente.
```

No permitidos si no hay validación/aplicación real:

```txt
Pago aplicado.
Cobro confirmado.
Documento cargado en Storage real.
Cliente actualizado automáticamente.
Póliza emitida y activada.
```

## Estado

Impacto académico documentado. Pendiente convertirlo en módulos/lecciones dentro del próximo paquete Claude/candidata.