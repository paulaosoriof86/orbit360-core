# Addendum — correo de usuario creado por tenant y alta de usuarios

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: addendum funcional/backend. Sin envío real. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Aclaración de producto

El correo/canal externo puede ser creado o habilitado por el tenant/admin para cada usuario interno.

Esto normalmente ocurre:

- durante la creación del usuario;
- durante la activación del usuario;
- después, desde Equipo/Usuarios;
- o mediante instrucciones para que el usuario cree o active su correo antes de habilitar el canal.

Esta regla no convierte el correo en un correo único del tenant ni en un correo automático por rol.

## 2. Regla operativa

Al crear un usuario interno, la plataforma debe permitir registrar:

- si el usuario ya tiene correo;
- si el correo debe crearse;
- si el correo queda pendiente de activación;
- si el usuario puede preparar mensajes;
- si el usuario puede enviar cuando el canal esté conectado;
- quién autorizó el canal;
- fecha de autorización;
- estado del canal.

## 3. Alta de usuario

Al crear un usuario, se debe poder notificar el alta por los canales disponibles:

- WhatsApp si existe teléfono confiable y canal permitido;
- correo si ya existe correo del usuario y está habilitado;
- notificación interna si ya tiene acceso;
- mensaje preparado si falta conexión real;
- tarea interna si falta completar datos.

## 4. Usuario sin correo creado

Si el correo aún no existe, el alta debe poder generar una instrucción interna o tarea:

- crear correo del usuario;
- confirmar email del usuario;
- habilitar canal cuando corresponda;
- reenviar invitación cuando quede listo.

## 5. Cliente portal

El cliente portal no participa en esta configuración.

El cliente no elige remitente, no configura correo y no ve la configuración interna del usuario.

## 6. Auditoría

Registrar:

- usuario creado;
- canal indicado;
- si el correo existía o estaba pendiente;
- quién autorizó;
- notificación preparada o enviada según estado real;
- reenvíos o cambios posteriores.

## 7. Estado

Addendum creado. Debe leerse junto con los contratos de Auth, usuarios, notificaciones y correo por usuario autorizado.
