# Pendientes Claude — Portal acceso, PWA, invitaciones y calidad de datos v1.123

Fecha: 2026-07-04
Base: `Prototype Development Request - 2026-07-04T152321.882.zip`
Estado: pendientes frontend/prototipo. No tocar backend protegido.

## Regla general

Claude debe preparar UX/prototipo para el flujo de acceso del cliente al Portal sin afirmar Auth, correo, WhatsApp, magic links o PWA real si no están conectados.

No tocar:

- `data/store.js`
- `data/store-firestore-lab.local.js`
- `core/backend-lab-*`
- `firestore.rules`
- `tools/orbit360-*`

## P0-PORTAL-01 — Explicar acceso del cliente al Portal

Debe existir en UI/documentación un flujo claro:

- acceso por botón desde la web;
- acceso por URL directa;
- instalación como PWA;
- invitación por correo/WhatsApp cuando esté conectado;
- estado honesto cuando sea demo/preparado.

## P0-PORTAL-02 — Estado de usuario portal por cliente

En Cliente360 o Equipo/Portal debe verse:

- portal habilitado/no habilitado;
- pendiente de datos;
- listo para invitar;
- invitado;
- activado;
- último acceso;
- reenviar invitación.

## P0-PORTAL-03 — Invitación al crear cliente o póliza

Cuando se cree cliente/póliza, el prototipo debe mostrar opción o acción preparada para invitar al Portal si hay correo o WhatsApp.

La invitación debe explicar beneficios y cómo instalar PWA.

## P1-PORTAL-04 — Invitación individual y masiva para clientes existentes

Debe poder seleccionarse clientes existentes para enviar/preparar invitación:

- individual;
- masiva filtrada;
- por asesor;
- por país;
- por clientes no activados;
- por clientes con datos completos.

## P1-CALIDAD-01 — Solicitud amable de datos faltantes

Calidad de Datos debe permitir gestionar faltantes, no solo mostrarlos:

- seleccionar cliente(s);
- seleccionar campos faltantes;
- generar mensaje amable;
- elegir canal;
- registrar historial;
- notificar asesor;
- crear gestión si requiere seguimiento.

## P1-CALIDAD-02 — Mensajes de datos faltantes

Debe existir plantilla amable, por ejemplo:

```txt
Estamos actualizando tu información para mantener tu expediente al día, informarte oportunamente y atender tus solicitudes de forma más ágil y segura.
```

## P1-PWA-01 — Instrucción de instalación móvil

Portal debe incluir copy/ayuda para agregar a pantalla de inicio, sin afirmar instalación automática.

## P1-ACADEMIA-01 — Manuales y Academia

Actualizar o registrar pendiente en:

- manual Portal Cliente;
- manual Cliente360;
- manual Calidad de Datos;
- manual Equipo/Usuarios;
- manual Integraciones;
- ruta Cliente nuevo;
- ruta Asesor nuevo;
- ruta Administrativo/Operativo;
- evaluación sobre acceso portal, invitación, PWA y actualización de datos.

## Criterio de aceptación

- cliente entiende cómo entrar al Portal;
- hay URL/link/CTA claro;
- hay invitación individual y masiva preparada;
- no se envían contraseñas planas;
- se muestra estado del acceso;
- se sugiere PWA;
- calidad de datos permite pedir faltantes;
- asesor queda informado;
- no se afirma conexión real inexistente;
- backend protegido intacto.
