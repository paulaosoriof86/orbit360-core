# Auditoría diagnóstico — Auth, roles, tenant y Portal v1.123

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Base auditada: `Prototype Development Request - 2026-07-04T152321.882.zip`
Rama destino documentación: `ays/backend-tenant-lab-v99-20260703`
Estado: diagnóstico frontend/prototipo + implicación backend. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Resumen ejecutivo

La candidata v1.123 tiene una base visual útil para login, roles, permisos, módulos visibles y Portal de Cliente, pero todavía no cumple el estándar requerido para Auth/tenant/portal real.

Hallazgos principales:

- `core/auth.js` usa sesión demo persistida en `localStorage` (`orbit360_session`).
- El login acepta el correo digitado y no valida contraseña contra backend real.
- Existe un selector superior de rol que permite cambiar la vista activa desde la UI (`Orbit.session`).
- `Orbit.session` usa otro `localStorage` separado (`orbit360_sessionview`) y no está ligado al usuario autenticado.
- El router oculta módulos por rol/tenant en el sidebar, pero no bloquea de forma centralizada la navegación directa por hash si el módulo existe.
- Algunos módulos aplican restricciones parciales, pero no hay guard global de autorización por ruta/acción.
- Portal es una vista previa interna que permite seleccionar cliente desde un dropdown, no un Portal con usuario cliente autenticado.
- No existe entidad `portalUsuarios` ni estados de activación del portal en el modelo actual.
- Equipo/Permisos administra asesores/roles del prototipo, no usuarios Auth reales con `authUid`, tenant, sesiones y auditoría.
- PWA existe como shell instalable general, pero no como scope/portal seguro por usuario.

## 2. Archivos revisados

- `core/auth.js`
- `core/config.js`
- `core/router.js`
- `core/pwa.js`
- `modules/equipo.js`
- `modules/configuracion.js`
- `modules/portal.js`
- `modules/cliente360.js`
- `modules/notificaciones.js`
- `modules/calidad.js`
- `data/seed.js`
- `index.html`
- `sw.js`

## 3. Login actual

`core/auth.js` define:

```txt
KEY = orbit360_session
CKEY = orbit360_confidencialidad
```

El login:

- guarda usuario en `localStorage`;
- permite entrar con el email digitado;
- usa rol `Dirección` por defecto;
- no valida contraseña;
- no usa backend Auth real;
- no valida tenant;
- no registra sesión real;
- no registra auditoría de login.

En `index.html` sí existe campo de contraseña visual, pero no se valida en `core/auth.js`.

## 4. Sesión de rol separada

`core/config.js` define `Orbit.session` con:

```txt
KEY = orbit360_sessionview
rol por defecto = Dirección
asesorId por defecto = ase001
```

El selector de rol de la topbar permite cambiar el rol activo con:

```txt
Orbit.session.set(sel.value, 'ase001')
```

Esto es correcto como herramienta demo de previsualización de roles, pero no puede tratarse como autorización real.

## 5. Roles actuales

`core/config.js` define roles visibles:

- Dirección;
- Admin;
- Comercial;
- Finanzas;
- Marketing;
- Operativo;
- Asesor;
- Asistente.

Cada rol tiene `nivel`, `desc`, `color` y `modulos`.

Fortaleza:

- buena base para UX de configuración de roles.

Brechas:

- no existen permisos por acción tipo `modulo.accion`;
- no hay `tenantId` en la sesión;
- no hay relación real usuario ↔ asesor ↔ cartera;
- no hay claims/Auth;
- no hay auditoría de cambios;
- no existe rol `cliente_portal` como usuario real.

## 6. Permisos actuales en Equipo

`modules/equipo.js` tiene pestaña `Permisos` y genera matriz rol × módulo con acciones:

```txt
ver
editar
```

Fortaleza:

- permite visualizar y editar permisos por rol/módulo en prototipo.

Brechas:

- guarda configuración en catálogo/prototipo, no en colección real de roles/permisos;
- no cubre permisos de acción fina (`cobros.aprobar_pago`, `documentos.validar`, etc.);
- no está conectado a Auth real;
- no registra auditoría de cambios de permisos;
- no bloquea acciones críticas por backend.

## 7. Router y autorización

`core/router.js` construye el sidebar usando:

```txt
Orbit.tenant.isActive(route)
Orbit.session.canSee(route)
```

Fortaleza:

- oculta módulos no activos o no visibles para el rol.

Riesgo:

- `render(route)` no aplica un bloqueo centralizado si el usuario entra por hash directo a una ruta existente;
- el control está principalmente en la visibilidad del menú;
- algunos módulos tienen guard parcial, por ejemplo Ops restringe asesor, pero no hay guard global uniforme;
- la autorización real debe estar en backend/reglas, no solo en UI.

## 8. Portal actual

`modules/portal.js` es una vista responsive útil, pero es una previsualización interna.

Estado actual:

- selecciona el primer cliente si no hay `clienteId`;
- muestra selector de cliente en la parte superior;
- incluye botón admin para enviar notificación;
- lee pólizas, pagos, documentos, siniestros y notificaciones por `clienteId` seleccionado;
- permite reportar pago, subir documento y solicitar gestión.

Brecha crítica:

- no hay usuario cliente autenticado;
- no hay `portalUsuarios`;
- no hay activación/invitación segura;
- un cliente real no debería poder cambiar a otro cliente con un selector;
- no hay scope PWA por usuario cliente;
- no hay permisos/visibilidad por `portal.ver_propio`.

## 9. Cliente360 y estado de Portal

`modules/cliente360.js` no muestra aún estado de acceso al portal por cliente:

- no_habilitado;
- pendiente_datos;
- listo_para_invitar;
- invitado;
- activado;
- último acceso;
- reenviar invitación.

Tampoco se detecta relación con `portalUsuarios` o `portalInvitaciones`.

## 10. Calidad de Datos

`modules/calidad.js` detecta faltantes y permite acciones rápidas:

- WA si tiene teléfono;
- correo si tiene email;
- completar datos inline;
- campaña demo con conteo de WA/correo/sin canal.

Fortaleza:

- buena base visual para calidad de datos.

Brechas:

- no crea `calidadDatosSolicitudes`;
- no registra trazabilidad de solicitud;
- no notifica formalmente al asesor;
- no selecciona campos faltantes para solicitud individual/masiva;
- algunos textos sugieren WhatsApp/correo sin distinguir conexión real vs mensaje preparado.

## 11. PWA actual

`core/pwa.js` genera manifest dinámico y registra service worker.

Fortalezas:

- botón instalar como app;
- soporte para iOS con guía;
- manifest dinámico con nombre/logo/color de tenant;
- fallback icon.

Brechas:

- `start_url` y `scope` son `.` para toda la app;
- no hay ruta específica de Portal de Clientes;
- no hay estado `pwaSugeridaAt` ni seguimiento por portalUsuario;
- no hay separación de experiencia PWA cliente vs operación interna;
- no hay seguridad de sesión real.

## 12. Notificaciones y Auth

Las notificaciones actuales no están ligadas a usuario Auth real. Existen:

- `notifs` por cliente en Portal;
- actividades;
- avisos/toasts;
- correo/WhatsApp preparados.

Brecha:

- no hay `destinatarioId` ligado a `usuarios` o `portalUsuarios`;
- no hay `estadoEnvio`/`estadoLectura` uniforme;
- no hay preferencia por usuario;
- no hay topbar por usuario real.

## 13. Diagnóstico final

### Estado actual

Apto como prototipo visual y demo funcional.

### No apto aún como Auth/Portal real

Porque falta:

- Auth real;
- tenant obligatorio en usuario;
- roles/permisos por acción;
- guard central de rutas/acciones;
- portalUsuarios;
- activación segura;
- auditoría de acceso;
- restricciones backend/reglas;
- separación clara cliente portal vs usuario interno.

## 14. Pendientes para Claude/frontend

Claude debe:

1. Mantener el login como prototipo, pero no afirmar producción real.
2. Rotular la vista de Portal como previsualización interna cuando se accede desde equipo/admin.
3. Preparar UI de estado portal en Cliente360.
4. Preparar UI de usuarios/roles/permisos sin tocar backend protegido.
5. Evitar que el cliente portal vea selector de cliente en experiencia final.
6. Mostrar copy honesto para invitaciones/PWA/Auth pendiente.
7. Actualizar manuales y Academia.

## 15. Pendientes backend ChatGPT/Codex

1. Crear contrato de guard central de autorización.
2. Crear contrato de auditoría de acceso.
3. Preparar validador anti-regresión:
   - login demo tratado como real;
   - selector de rol visible en portal cliente;
   - ruta directa sin guard;
   - cliente portal con selector de cliente;
   - contraseña plana o datos reales en seed;
   - módulo visible sin permiso.
4. Preparar smoke futuro de roles:
   - cliente ve solo lo propio;
   - asesor ve solo asignados;
   - cobros aprueba pago;
   - admin gestiona roles;
   - superadmin configura tenant.

## 16. Impacto en Academia y manuales

Actualizar:

- manual Seguridad/Auth;
- manual Equipo/Usuarios;
- manual Configuración;
- manual Portal Cliente;
- manual Cliente360;
- ruta Cliente nuevo;
- ruta Asesor nuevo;
- ruta Administrativo/Operativo;
- ruta Superadmin/IT;
- evaluación sobre roles, permisos y seguridad.

## 17. Decisión

No implementar Auth real todavía desde el conector en esta fase. Primero cerrar contratos, diagnóstico, validadores y smoke local seguro. Cuando se implemente, debe conservar `Orbit.store`, tenant isolation y backend protegido.
