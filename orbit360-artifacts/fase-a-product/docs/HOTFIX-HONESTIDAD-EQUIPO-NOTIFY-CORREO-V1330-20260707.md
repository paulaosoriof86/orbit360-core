# Hotfix honestidad operativa — Equipo/Notificaciones/Notify/Correo v1330 — 2026-07-07

## Estado

```txt
Repo: paulaosoriof86/orbit360-core
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge: no
Deploy: no
Main: no tocado
```

## Motivo

La auditoría del bloque Configuración/Equipo/Notificaciones/Correo detectó P1 de honestidad operativa:

```txt
Equipo afirmaba credenciales enviadas sin Auth/envío real.
Notificaciones podía mostrar API WhatsApp encolada sin integración activa.
Notify podía decir notificado al cliente cuando solo abría wa.me/mailto/compositor.
Correo usaba remitente demo como fallback.
```

## Archivos modificados

```txt
orbit360-platform/modules/equipo.js
orbit360-platform/modules/notificaciones.js
orbit360-platform/core/notify.js
orbit360-platform/core/correo.js
```

## Cambios aplicados

### Equipo

Archivo:

```txt
orbit360-platform/modules/equipo.js
```

Cambios:

- La nota de creación de usuario ya no afirma que se enviaron credenciales.
- Ahora indica que el usuario queda creado en el equipo y que invitación/credenciales quedan pendientes de Auth backend/canal conectado.
- El toast de usuario nuevo dice que la invitación queda pendiente de Auth backend.

Estado UI esperado:

```txt
Usuario creado en equipo · invitación pendiente de Auth backend
```

### Notificaciones WhatsApp

Archivo:

```txt
orbit360-platform/modules/notificaciones.js
```

Cambios:

- KPI `Enviados hoy` cambió a `Preparados hoy`.
- Canal muestra `wa.me / API` con nota `Web abierto / Cloud pendiente`.
- Botón API cambió a `Registrar para API`.
- Historial registra `wa.me abierto` o `API pendiente de conexión`.
- Actividad del cliente registra `Mensaje de WhatsApp preparado`, no enviado confirmado.
- Para wa.me muestra: confirmar envío en WhatsApp.
- Para API muestra: API pendiente de conexión, evento registrado para integración.

### Notify transversal

Archivo:

```txt
orbit360-platform/core/notify.js
```

Cambios:

- `_deliver()` devuelve `WhatsApp Web abierto`, `Correo preparado` o `Correo abierto`.
- Actividad se registra como notificación preparada, no entrega confirmada.
- Toast indica que la comunicación fue preparada y debe confirmarse en el proveedor.

### Correo

Archivo:

```txt
orbit360-platform/core/correo.js
```

Cambios:

- Se eliminó fallback productivo `equipo@democorredores.com`.
- Si no hay cuenta conectada, el remitente queda vacío y el nombre visible es `Cuenta no conectada`.
- Actividad del cliente dice `Correo preparado`, no correo enviado confirmado.

## Validación por búsqueda

Se buscó y ya no aparecen las frases problemáticas:

```txt
credenciales enviadas
Mensaje encolado vía API
equipo@democorredores.com
```

## Impacto Claude / prototipo reutilizable

- Patrón reusable detectado: diferenciar acción preparada/abierta/pendiente de integración frente a envío real confirmado.
- Debe compartirse con Claude: Sí.
- Módulos impactados:

```txt
equipo
notificaciones
correo
notify
automatizaciones
plantillas
portal
academia
```

- Texto/estado UI requerido:

```txt
Invitación pendiente de Auth backend
Chat abierto en WhatsApp Web
WhatsApp API pendiente de conexión
Correo preparado
Cuenta no conectada
Entrega confirmada por proveedor
```

- Academia impactada:

```txt
Alta de usuarios e invitaciones
WhatsApp Web vs WhatsApp Cloud API
Correo conectado vs correo preparado
Diferencia entre preparar comunicación y entrega confirmada
```

## Pendiente backend real

Cuando se implemente backend real:

```txt
Auth backend debe crear usuario/invitación real.
WhatsApp Cloud API debe confirmar encolado/enviado/fallido por proveedor.
Correo Outlook/Gmail debe confirmar envío real.
Notify debe recibir estado del proveedor y actualizar actividades.
```

## Estado

```txt
Hotfix aplicado desde ChatGPT, sin Codex.
Sin tocar backend protegido.
Sin merge.
Sin deploy.
```
