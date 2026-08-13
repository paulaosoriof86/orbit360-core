# Auditoría bloque Configuración/Equipo/Notificaciones/Correo post-v1330 — 2026-07-07

## Estado

```txt
Repo: paulaosoriof86/orbit360-core
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge: no
Deploy: no
Main: no tocado
```

## Archivos revisados

```txt
orbit360-platform/core/config.js
orbit360-platform/core/router.js
orbit360-platform/core/notify.js
orbit360-platform/core/correo.js
orbit360-platform/modules/configuracion.js
orbit360-platform/modules/equipo.js
orbit360-platform/modules/notificaciones.js
orbit360-platform/modules/correo.js
```

## Resultado ejecutivo

El bloque está muy bien orientado a SaaS reutilizable: tenant, planes, roles, módulos activos, países/monedas, glosario, marca, integraciones y permisos ya están planteados como configuración.

No se detectó P0 de backend protegido.

Sí se detectaron pendientes P1 de honestidad operativa en comunicaciones y usuario:

```txt
P1 — Equipo indica credenciales enviadas aunque no hay backend/Auth/envío real.
P1 — Notificaciones WhatsApp API indica mensaje encolado como si existiera API conectada.
P1 — Notify registra “notificado” al abrir wa.me/mailto; debe distinguir preparado/abierto vs enviado real.
P1 — Correo usa configuración local y remitente demo como fallback; debe mostrarse siempre como sin cuenta conectada hasta integración real.
```

---

## Configuración — validaciones positivas

Archivo:

```txt
orbit360-platform/modules/configuracion.js
```

Validado:

- Configuración declara que la fuente de verdad es `Orbit.tenant`.
- Incluye marca/white-label, usuarios/roles, países/monedas, integraciones, APIs, plan e interno Orbit.
- Permite ocultar etiquetas técnicas del menú para modo cliente/implementación.
- Países/monedas se muestran separados y se advierte que no se mezclan monedas.
- Integraciones se agrupan por categoría y muestran estados.
- APIs indica que credenciales deben guardarse cifradas, con scopes mínimos y sin exponerse en frontend.
- La sección interna define planes y módulos activos por cliente.

Regla reusable para Claude:

```txt
Todo cliente debe poder personalizar marca, países, moneda, glosario, módulos, integraciones y plan por configuración, no por fork.
```

## Core config / tenant / navegación — validaciones positivas

Archivo:

```txt
orbit360-platform/core/config.js
```

Validado:

- `Orbit.MODULE_TITLES` es fuente de metadatos para módulos.
- `Orbit.PAISES` define GT/GTQ/IVA 12 y CO/COP/IVA 19 como base configurable.
- `Orbit.PLANES` define estandar/profesional/personalizado.
- `Orbit.ROLES` define módulos por rol.
- `Orbit.NAV` centraliza navegación.
- `Orbit.MODULE_META` ofrece placeholders honestos para módulos no construidos.

## Router — validaciones positivas

Archivo:

```txt
orbit360-platform/core/router.js
```

Validado:

- El sidebar filtra rutas por `Orbit.tenant.isActive(route)` y `Orbit.session.canSee(route)` si existen.
- Puede ocultar badges técnicos cuando `hideTechnicalBadges` está activo.

Pendiente backend posterior:

- En producción, `canSee` debe validarse también del lado backend/reglas, no solo visualmente.

---

## Equipo — hallazgo P1

Archivo:

```txt
orbit360-platform/modules/equipo.js
```

Hallazgo:

La ficha de usuario muestra:

```txt
Al guardar un usuario nuevo, se le envían sus credenciales de acceso al correo y WhatsApp indicados.
```

Y al crear usuario muestra toast:

```txt
Usuario creado · credenciales enviadas a ...
```

Pero el módulo solo inserta el usuario/asesor en store; no hay creación Auth real ni envío real de credenciales.

Impacto:

- Puede hacer creer que el usuario quedó creado en Auth y recibió acceso real.
- Contradice la regla de estados honestos.

Corrección recomendada:

```txt
Usuario creado en el equipo. Invitación/credenciales pendientes de Auth backend.
```

Si se quiere conservar acción visual:

```txt
Enviar invitación cuando Auth backend esté conectado.
```

Tipo:

```txt
P1 honestidad operativa / UX reusable
```

---

## Notificaciones WhatsApp — hallazgo P1

Archivo:

```txt
orbit360-platform/modules/notificaciones.js
```

Hallazgo:

- El módulo permite `wa.me + API`.
- Para `wa.me`, abre WhatsApp Web y registra en historial/actividad como mensaje enviado.
- Para API, muestra:

```txt
Mensaje encolado vía API de WhatsApp Cloud
```

sin verificar integración activa.

Impacto:

- `wa.me` abre un chat, pero no garantiza envío.
- API no está realmente conectada; no debe decir encolado si no existe backend/proveedor activo.

Corrección recomendada:

1. Para `wa.me`:

```txt
Mensaje preparado / chat abierto por WhatsApp Web
```

2. Para API sin integración activa:

```txt
WhatsApp API pendiente de conexión. Evento registrado para integración.
```

3. No registrar como `enviado` real hasta confirmación de proveedor/backend.

Tipo:

```txt
P1 honestidad operativa / integración
```

---

## Notify transversal — hallazgo P1

Archivo:

```txt
orbit360-platform/core/notify.js
```

Validación positiva:

- Es una capa transversal reemplazable por backend.
- Centraliza notificación cliente y trazabilidad en expediente.
- Documenta que hoy no implementa backend y abre `wa.me`/correo.

Hallazgo:

- Tras abrir `wa.me` o mailto/compositor, la UI puede mostrar “notificado al cliente”.
- Eso puede confundirse con entrega confirmada.

Corrección recomendada:

Estados separados:

```txt
preparado
abierto
registrado
encolado
enviado_confirmado
fallido
```

Hasta que exista backend/proveedor:

```txt
Chat/correo preparado; confirma el envío en el proveedor.
```

Tipo:

```txt
P1 honestidad operativa / backend-ready
```

---

## Correo — validaciones y pendiente

Archivos:

```txt
orbit360-platform/core/correo.js
orbit360-platform/modules/correo.js
```

Validaciones positivas:

- La UI muestra honestamente “sin cuenta conectada” cuando no hay proveedor.
- Los correos pueden vincularse a cliente, póliza, gestión, reclamo o aseguradora.
- La capa central `Orbit.correo` es punto único a cablear cuando haya integración real.

Pendientes:

- `core/correo.js` guarda configuración local en `localStorage`; para backend real debe moverse a configuración tenant/integraciones.
- Fallback `equipo@democorredores.com` debe no aparecer como remitente productivo si no hay cuenta conectada.

Tipo:

```txt
P1/P2 backend-ready; no bloquea prototipo si la UI mantiene “sin cuenta conectada”.
```

---

## Impacto Claude / prototipo reutilizable

- Patrón reusable detectado: configuración por tenant, roles, permisos, notificaciones honestas y comunicaciones conectables.
- Debe compartirse con Claude: Sí.
- Módulos impactados:

```txt
configuracion
equipo
notificaciones
correo
plantillas
automatizaciones
portal
academia
```

- Texto/estado UI requerido:

```txt
Pendiente de Auth backend
Invitación pendiente de envío
Chat abierto por WhatsApp Web
WhatsApp API pendiente de conexión
Correo preparado / cuenta no conectada
Entrega confirmada por proveedor
```

- Academia impactada:

```txt
Roles y permisos
Alta de usuarios
Diferencia entre usuario creado e invitación enviada
Notificaciones manuales vs automáticas
WhatsApp Web vs WhatsApp API
Correo conectado vs correo preparado
```

- Riesgo si Claude lo ignora:

```txt
El prototipo puede simular usuarios/credenciales/envíos productivos que no existen, generando confusión comercial y operativa.
```

---

## Pendientes para hotfix futuro

No requieren pausa inmediata del plan, pero conviene resolver antes de demo ejecutiva o producción:

```txt
1. Equipo: reemplazar textos de credenciales enviadas por invitación/Auth pendiente.
2. Notificaciones: separar wa.me abierto vs enviado real; API pendiente si no conectada.
3. Notify: cambiar toast “notificado” por “preparado/abierto” hasta backend real.
4. Correo: evitar remitente demo como productivo y mover config local a tenant/integraciones en backend real.
```

## Decisión

Bloque Configuración/Equipo/Comunicaciones queda auditado.

Estado:

```txt
Sin P0.
Con P1 de honestidad operativa pendiente para próximo hotfix UX/backend-ready.
```
