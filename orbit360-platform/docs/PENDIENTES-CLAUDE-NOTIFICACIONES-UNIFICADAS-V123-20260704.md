# Pendientes Claude — notificaciones unificadas v1.123

Fecha: 2026-07-04
Base: `Prototype Development Request - 2026-07-04T152321.882.zip`
Estado: pendientes frontend/prototipo. No tocar backend protegido.

## Regla general

Claude debe mejorar UX y consistencia visual de notificaciones sin afirmar integraciones reales inexistentes y sin tocar backend protegido.

No tocar:

- `data/store.js`
- `data/store-firestore-lab.local.js`
- `core/backend-lab-*`
- `firestore.rules`
- `tools/orbit360-*`

## P0-NOTIF-01 — Diferenciar notificación interna vs envío externo

Si WhatsApp/correo/Make no están conectados, no mostrar como enviado real.

Mostrar estados honestos:

```txt
Notificación interna registrada
Mensaje preparado
Canal pendiente de conexión
```

## P0-NOTIF-02 — Pago reportado debe notificar a cliente, asesor y Cobros

Cuando cliente reporta pago:

- cliente ve confirmación;
- asesor recibe aviso visible;
- Cobros/Operativo recibe aviso/tarea;
- Ops ve gestión en lista correcta;
- Cliente360 conserva historial.

## P0-NOTIF-03 — Solicitudes del cliente deben retroalimentarse

Toda solicitud creada desde Portal debe mostrar al cliente:

- recibido;
- en revisión;
- esperando información si aplica;
- resuelto/rechazado/cerrado.

Y avisar al asesor si afecta su cliente.

## P1-NOTIF-04 — Topbar con contador útil por rol

Preparar topbar o centro de notificaciones para:

- gestiones asignadas;
- pagos reportados;
- datos faltantes;
- invitaciones portal;
- vencimientos/escalamientos;
- Academia/actualizaciones.

## P1-NOTIF-05 — Evitar duplicidades de avisos

Si hoy hay toast, actividad, aviso y notificación portal, la UI debe mostrarlo coherentemente como una línea de trazabilidad y no como ruido duplicado.

## P1-NOTIF-06 — Plantillas configurables por tenant

No hardcodear textos de comunicación en módulos si se puede preparar como plantilla configurable.

Debe haber plantillas para:

- invitación portal;
- solicitud de datos faltantes;
- pago reportado;
- pago aprobado/rechazado;
- gestión recibida/resuelta;
- curso asignado/actualizado.

## P1-NOTIF-07 — Academia y manuales

Actualizar o registrar pendiente en:

- manual Notificaciones/Topbar;
- manual Portal;
- manual Ops;
- manual Cobros;
- manual Cliente360;
- manual Calidad de Datos;
- manual Integraciones;
- ruta Cliente nuevo;
- ruta Asesor nuevo;
- ruta Administrativo/Operativo;
- ruta Superadmin/IT.

## Criterio de aceptación

- asesor recibe aviso visible de movimientos de sus clientes;
- cliente recibe retroalimentación de sus solicitudes;
- Cobros/Operativo recibe avisos accionables;
- no se afirma envío real si no está conectado;
- topbar/centro de notificaciones muestra pendientes útiles;
- eventos críticos no quedan solo como toast;
- backend protegido intacto.
