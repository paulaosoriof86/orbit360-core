# Contrato correo — usuarios autorizados explícitamente

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato funcional/backend. Sin correo real. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Decisión de producto

El correo no se configura como un correo único por tenant ni como un correo automático por rol.

El correo debe configurarse por **usuario autorizado explícitamente** dentro de la plataforma al crear o editar ese usuario.

Esto significa:

- cada usuario interno autorizado puede tener su propio correo o canal permitido;
- un rol no equivale automáticamente a tener correo saliente;
- un tenant puede tener varios usuarios con correo autorizado;
- el cliente no administra ni elige correo;
- el cliente no debe tener opción a configurar correo.

## 2. Regla principal

Solo usuarios internos autorizados explícitamente pueden enviar o preparar comunicaciones por correo desde Orbit 360.

La autorización debe estar en el perfil del usuario, no solo en el rol.

Campos sugeridos:

- correoAutorizado;
- canalesAutorizados[];
- email;
- integracionCorreoEstado;
- puedeEnviarCorreo;
- puedePrepararCorreo;
- firmaPermitida;
- auditoriaComunicaciones.

## 3. Qué NO debe hacerse

No se debe implementar:

- un único correo por tenant como regla fija;
- correo por rol automático;
- cliente eligiendo correo;
- cliente configurando correo;
- correo real como activo si no está conectado;
- envío desde cuentas no autorizadas;
- envío desde correos sin trazabilidad;
- datos técnicos de conexión visibles en UI o seed.

## 4. Usuarios que podrían tener correo autorizado

Según configuración explícita:

- Dirección;
- Admin;
- Operativo;
- Cobros;
- Asesor;
- Marketing;
- Soporte Portal;
- Finanzas si aplica;
- otros usuarios internos autorizados.

Tener rol no basta. Debe existir autorización explícita del usuario.

## 5. Cliente portal

El cliente portal NO debe tener opción a correo.

El cliente puede:

- recibir comunicaciones si existe canal disponible;
- ver estados y mensajes en Portal;
- actualizar datos o solicitar gestiones;
- reportar pagos y cargar soportes.

El cliente no puede:

- seleccionar cuenta de correo;
- enviar correos desde Orbit;
- configurar canal correo;
- ver cuentas internas;
- ver estado técnico de integraciones.

## 6. Configuración en Equipo/Usuarios

Al crear o editar un usuario interno debe poder definirse:

- email del usuario;
- si correo está autorizado;
- si puede enviar correo;
- si solo puede preparar mensajes;
- canal conectado o pendiente;
- firma del usuario si aplica;
- alias permitido si aplica;
- restricciones;
- plantillas que puede usar;
- auditoría de comunicaciones.

## 7. Estado de integración por usuario

Estados sugeridos:

- no_configurado;
- autorizado_pendiente_conexion;
- conectado;
- suspendido;
- error_conexion;
- solo_mensaje_preparado;
- desautorizado.

## 8. Relación con notificaciones

La colección `notificaciones` debe distinguir:

- notificación interna;
- correo preparado;
- correo enviado real;
- correo omitido por usuario no autorizado;
- correo omitido por falta de destinatario;
- correo pendiente de conexión.

Campos sugeridos adicionales:

- remitenteUsuarioId;
- remitenteEmail;
- remitenteAutorizado;
- integracionCorreoEstado;
- canalRealConectado;
- estadoEnvio.

## 9. Relación con plantillas

Las plantillas siguen siendo configurables por tenant, país, audiencia y evento, pero el envío por correo depende del usuario autorizado que ejecuta o dispara la comunicación.

Plantilla por tenant no significa correo por tenant.

## 10. Flujos permitidos

### Invitación Portal

- Admin/Operativo/Asesor autorizado puede enviar o preparar invitación.
- Si no está conectado, queda como mensaje preparado o link copiable.
- Cliente no elige correo.

### Calidad de Datos

- Usuario autorizado puede enviar o preparar solicitud de datos.
- Si el asesor no tiene correo autorizado, puede quedar tarea interna o mensaje preparado por otro canal permitido.

### Cobros

- Cobros autorizado puede enviar o preparar comunicaciones de pago.
- Asesor puede ser notificado internamente y, si está autorizado, también preparar o enviar mensaje.

### Marketing

- Marketing puede enviar campañas solo si el usuario y canal están autorizados y si existe base de contacto aplicable.

## 11. Auditoría

Cada intento debe registrar:

- usuario que envía o prepara;
- si tenía autorización;
- canal;
- destinatario;
- plantilla;
- evento;
- estado;
- error si aplica;
- fecha;
- entidad relacionada.

## 12. Seguridad

No guardar ni exponer datos técnicos de conexión en UI, seed, logs visibles al cliente o documentación comercial.

## 13. Criterio de aceptación

El flujo se considera correcto cuando:

- correo se autoriza por usuario, no por tenant ni rol;
- cliente no tiene opción a correo;
- notificaciones distinguen interno/preparado/enviado;
- no se simula envío real;
- todo envío/preparación queda auditado;
- datos técnicos de conexión no aparecen en UI/seed;
- plantillas siguen siendo configurables por tenant sin confundirse con cuenta de correo.

## 14. Academia y manuales

Actualizar:

- manual Equipo/Usuarios;
- manual Integraciones;
- manual Notificaciones;
- manual Portal;
- manual Calidad de Datos;
- ruta Superadmin/IT;
- ruta Administrativo/Operativo;
- ruta Asesor nuevo.

## 15. Estado

Contrato creado. No conecta correo real ni envía correos reales.
