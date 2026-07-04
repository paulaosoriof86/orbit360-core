# Contrato colección `notificaciones` — LAB A&S

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato backend/documental. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Unificar las notificaciones de Orbit 360 para que todo evento relevante tenga audiencia, canal, estado, trazabilidad y relación con la entidad de negocio correspondiente.

Hoy existen avisos, actividades, toasts y notificaciones de portal en capas separadas. Para backend real, eso debe convertirse en un contrato único de notificaciones.

## 2. Principio obligatorio

No basta mostrar un toast o agregar una actividad.

Todo evento relevante debe poder responder:

- qué ocurrió;
- a quién se avisó;
- por qué canal;
- qué entidad originó el aviso;
- cuál fue el estado del envío;
- si el usuario lo leyó;
- si generó respuesta;
- qué trazabilidad quedó.

## 3. Colección sugerida

```txt
notificaciones
```

También puede existir una tabla/colección auxiliar:

```txt
notificacionEventos
notificacionPlantillas
notificacionPreferencias
notificacionEntregas
```

## 4. Campos base recomendados

- id
- tenantId
- pais
- evento
- tipoNotificacion
- audiencia
- canal
- destinatarioId
- destinatarioRol
- destinatarioNombre
- destinatarioEmail
- destinatarioTelefono
- clienteId
- asesorId
- gestionId
- cobroId
- polizaId
- documentoId
- conciliacionId
- reclamoId
- cursoId
- rutaId
- titulo
- mensajeResumen
- plantillaId
- payloadVariables
- estadoEnvio
- estadoLectura
- prioridad
- requiereAccion
- accionUrl
- accionLabel
- visibleEnTopbar
- visibleEnPortal
- visibleEnCliente360
- visibleEnOps
- canalRealConectado
- error
- createdBy
- createdAt
- sentAt
- deliveredAt
- readAt
- respondedAt
- expiresAt
- trazabilidad

## 5. Audiencias permitidas

- cliente
- asesor
- operativo
- cobros
- renovaciones
- siniestros
- marketing
- direccion
- admin
- superadmin
- academia
- sistema

## 6. Canales permitidos

- interna
- topbar
- portal
- correo
- whatsapp_wa_me
- whatsapp_cloud_api_make
- tarea
- actividad
- academia
- sms_futuro

## 7. Estados de envío

- preparada
- pendiente_conexion
- pendiente_envio
- enviada
- entregada
- leida
- fallida
- omitida_por_falta_datos
- bloqueada_por_permiso
- cancelada

## 8. Estados de lectura

- no_visible
- no_leida
- leida
- archivada
- respondida

## 9. Eventos mínimos iniciales

- cliente_creado
- poliza_emitida
- portal_invitacion_preparada
- portal_invitacion_enviada
- portal_activado
- portal_no_activado
- cliente_reporta_pago
- soporte_pago_adjuntado
- pago_pendiente_conciliacion
- pago_aprobado
- pago_rechazado
- solicitud_cliente_recibida
- solicitud_asesor_recibida
- gestion_asignada
- gestion_estado_cambiado
- gestion_vencida
- gestion_escalada
- documento_recibido
- datos_faltantes_solicitados
- datos_cliente_actualizados
- renovacion_pendiente
- cancelacion_solicitada
- siniestro_reportado
- curso_asignado
- curso_actualizado
- evaluacion_pendiente
- certificado_emitido

## 10. Reglas de no simulación

Si correo, WhatsApp Cloud API, Make u otro canal real no está conectado, no se debe registrar como `enviada` real.

Debe quedar como:

```txt
estadoEnvio: preparada | pendiente_conexion | pendiente_envio
canalRealConectado: false
```

En UI se puede mostrar:

```txt
Notificación interna registrada
Mensaje preparado
Canal pendiente de conexión
```

## 11. Regla de asesor relacionado

Cuando una acción afecte a un cliente que tiene asesor relacionado, debe crearse notificación para el asesor salvo excepción documentada.

Aplica especialmente a:

- pago reportado;
- soporte cargado;
- solicitud de gestión;
- cambio de estado de solicitud;
- datos actualizados;
- portal activado;
- renovación/cancelación/siniestro;
- documento crítico recibido.

## 12. Regla de cliente solicitante

Cuando el cliente inicia una acción desde Portal, debe recibir retroalimentación visible:

- recepción;
- revisión;
- solicitud de información;
- resolución;
- rechazo;
- cierre.

## 13. Regla de topbar

La topbar debe poder mostrar contador de notificaciones relevantes por rol:

- nuevas;
- vencidas;
- pendientes de acción;
- Academia/actualizaciones;
- gestiones asignadas;
- pagos reportados;
- datos faltantes.

## 14. Privacidad y visibilidad

Cada notificación debe respetar:

- tenantId;
- rol;
- país;
- relación con cliente/asesor;
- permisos del módulo;
- visibilidad específica.

No exponer datos sensibles ni documentos por link público si no hay control de permisos.

## 15. Relación con Academia

Cambios de módulos, cursos, manuales, rutas y evaluaciones deben poder generar notificaciones de Academia:

- nuevo curso asignado;
- curso actualizado por cambio de módulo;
- evaluación pendiente;
- certificado emitido;
- manual actualizado;
- ruta de inducción pendiente.

## 16. Criterio de aceptación futuro

El contrato se considera implementable cuando:

- cada evento relevante tiene una notificación trazable;
- la audiencia está definida;
- el canal no simula conexiones inexistentes;
- el asesor recibe avisos de sus clientes;
- el cliente recibe retroalimentación de sus solicitudes;
- Ops/Cobros/Operativo reciben avisos accionables;
- la topbar puede mostrar contador por rol;
- Academia puede notificar cambios y pendientes;
- todo queda con historial.

## 17. Estado

Contrato creado. No implementa Firestore, correo, WhatsApp ni PWA. Debe guiar frontend Claude, backend ChatGPT/Codex y validadores futuros.
