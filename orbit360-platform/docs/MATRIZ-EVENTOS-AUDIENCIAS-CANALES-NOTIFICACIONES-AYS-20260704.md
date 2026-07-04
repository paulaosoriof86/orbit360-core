# Matriz eventos → audiencias → canales — Notificaciones Orbit 360 A&S

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: matriz funcional/backend. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Propósito

Definir qué audiencias deben ser notificadas por cada evento operativo, comercial, documental, financiero o académico.

## 2. Regla general

Toda notificación debe tener:

```txt
evento → audiencia → canal → estado → entidad relacionada → trazabilidad
```

## 3. Matriz inicial

| Evento | Cliente | Asesor | Ops/Operativo | Cobros | Dirección/Admin | Academia |
|---|---|---|---|---|---|---|
| cliente_creado | Opcional invitación portal | Sí si asignado | Sí si requiere completar | No | Opcional | No |
| poliza_emitida | Sí si portal habilitado | Sí | Sí | Sí si genera cobro | Opcional | No |
| portal_invitacion_preparada | Sí si canal listo | Sí | Sí | No | No | Ruta cliente si aplica |
| portal_invitacion_enviada | Sí | Sí | Sí | No | No | Ruta cliente si aplica |
| portal_activado | Confirmación | Sí | Sí | No | No | Ruta cliente asignada |
| portal_no_activado | Recordatorio si aplica | Sí | Sí | No | Opcional | No |
| cliente_reporta_pago | Confirmación recibido | Sí | Sí | Sí | No | No |
| soporte_pago_adjuntado | Confirmación recibido | Sí | Sí | Sí | No | No |
| pago_pendiente_conciliacion | Estado visible | Sí | Sí | Sí | No | No |
| pago_aprobado | Pago aplicado | Sí | Sí | Sí | No | No |
| pago_rechazado | Requiere revisión | Sí | Sí | Sí | Opcional | No |
| solicitud_cliente_recibida | Confirmación | Sí | Sí | Según tipo | No | No |
| solicitud_asesor_recibida | No | Confirmación | Sí | Según tipo | No | No |
| gestion_asignada | Si es visible | Sí si afecta cliente | Sí | Según tipo | No | No |
| gestion_estado_cambiado | Según visibilidad | Sí si afecta cliente | Sí | Según tipo | No | No |
| gestion_vencida | No | Sí si afecta cliente | Sí | Según tipo | Sí si escalada | No |
| gestion_escalada | Según caso | Sí | Sí | Según tipo | Sí | No |
| documento_recibido | Confirmación si cliente cargó | Sí si afecta cliente | Sí | Según tipo | No | No |
| datos_faltantes_solicitados | Solicitud amable | Sí | Sí | No | No | No |
| datos_cliente_actualizados | Confirmación | Sí | Sí | No | No | No |
| renovacion_pendiente | Sí según estrategia | Sí | Sí | No | Opcional | No |
| cancelacion_solicitada | Confirmación | Sí | Sí | No | Opcional | No |
| siniestro_reportado | Confirmación | Sí | Sí | No | Opcional | No |
| curso_asignado | Si es cliente | Si aplica | Si aplica | No | Opcional | Sí |
| curso_actualizado | Si ruta cliente | Si ruta asesor | Si ruta operativa | No | Opcional | Sí |
| evaluacion_pendiente | Si aplica | Si aplica | Si aplica | No | Opcional | Sí |
| certificado_emitido | Si aplica | Si aplica | Si aplica | No | Opcional | Sí |

## 4. Canal por defecto según audiencia

### Cliente

- portal;
- correo si conectado;
- WhatsApp/wa.me o Cloud API si conectado;
- link copiable si no hay integración;
- notificación interna del portal si ya está activo.

### Asesor

- topbar;
- notificación interna;
- tarea/actividad;
- correo si conectado;
- WhatsApp si configurado.

### Ops/Operativo

- topbar;
- bandeja Ops;
- tarea/actividad;
- notificación interna;
- correo si conectado.

### Cobros

- topbar;
- Cobros/Conciliación;
- tarea;
- notificación interna;
- correo si conectado.

### Academia

- topbar;
- módulo Academia;
- ruta de aprendizaje;
- correo si configurado.

## 5. Prioridad sugerida por evento

### Alta

- cliente_reporta_pago;
- soporte_pago_adjuntado;
- pago_rechazado;
- gestion_vencida;
- gestion_escalada;
- cancelacion_solicitada;
- siniestro_reportado.

### Media

- solicitud_cliente_recibida;
- gestion_estado_cambiado;
- documento_recibido;
- datos_cliente_actualizados;
- renovacion_pendiente;
- portal_activado.

### Baja

- curso_actualizado;
- certificado_emitido;
- portal_invitacion_preparada;
- recordatorio no urgente.

## 6. Estados visibles por audiencia

### Cliente

- recibido;
- en revisión;
- esperando información;
- resuelto;
- rechazado;
- cerrado;
- pago aplicado;
- pago pendiente de aprobación.

### Asesor

- nuevo;
- pendiente operativo;
- requiere seguimiento;
- vencido;
- escalado;
- resuelto;
- cliente respondió.

### Operativo/Cobros

- nuevo;
- asignado;
- pendiente documento;
- pendiente conciliación;
- requiere validación;
- aprobado;
- rechazado;
- vencido;
- escalado.

## 7. Reglas anti-ruido

No notificar a todos por todo.

Crear notificación solo si:

- requiere acción;
- cambia estado visible;
- afecta al cliente;
- afecta al asesor;
- cambia obligación de cobro/pago/documento;
- vence o se escala;
- asigna curso/ruta/evaluación.

## 8. Regla de digest/resumen

Para eventos de baja prioridad, puede agruparse en resumen diario/semanal si no afecta operación inmediata.

Nunca agrupar eventos críticos como pago reportado, siniestro, cancelación, vencimiento o gestión escalada.

## 9. Relación con configuración tenant

Cada tenant debe poder configurar:

- canales activos;
- plantillas;
- horarios permitidos;
- roles que reciben cada evento;
- SLA;
- escalamiento;
- preferencias por país.

No hardcodear A&S en el motor.

## 10. Estado

Matriz creada para guiar frontend, backend, validadores y manuales/Academia.
