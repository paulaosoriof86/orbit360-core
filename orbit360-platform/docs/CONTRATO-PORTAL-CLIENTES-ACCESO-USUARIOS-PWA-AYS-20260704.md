# Contrato Portal de Clientes — acceso, usuarios, URL y PWA

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato funcional/backend. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Pregunta de producto

Paula planteó una duda crítica: ¿cómo entra el cliente al Portal de Clientes?

El portal debe ser práctico, fácil de abrir desde web, link directo y PWA móvil, porque muchos clientes no ingresarán si el acceso es complicado.

## 2. Decisión funcional

El Portal de Clientes debe tener tres formas de acceso:

1. **Acceso desde la página web** de A&S o del tenant mediante botón o iframe controlado si aplica.
2. **URL directa compartible** para enviar al cliente por correo o WhatsApp.
3. **PWA instalable** en celular, con invitación clara a agregarla a pantalla de inicio.

## 3. URL recomendada

La plataforma debe soportar una URL base por tenant:

```txt
https://app.orbit360.../t/alianzas-soluciones/portal
```

Y también una URL comercial configurable por dominio del cliente cuando exista:

```txt
https://portal.aysseguros.com
https://aysseguros.com/portal
```

La ruta exacta depende del hosting final, pero el modelo debe permitir:

- link directo;
- botón en sitio web;
- QR;
- invitación por WhatsApp/correo;
- PWA instalable.

## 4. Creación de usuario de portal

Un usuario de portal puede crearse cuando:

- se crea un cliente nuevo;
- se emite una póliza nueva;
- se migra un cliente existente y se habilita portal;
- un operador habilita acceso manualmente desde Cliente360;
- una campaña masiva invita a clientes existentes.

## 5. Regla de activación

Crear cliente o póliza no siempre debe enviar invitación automáticamente si faltan datos confiables.

Condiciones mínimas para invitar:

- cliente con nombre;
- al menos correo o teléfono/WhatsApp;
- asesor relacionado si aplica;
- país definido;
- consentimiento o base legal documentada para contacto;
- tenant activo;
- portal habilitado para el cliente.

Si falta correo/teléfono, debe quedar como pendiente de calidad de datos.

## 6. Credenciales y acceso seguro

No enviar contraseñas planas definitivas por WhatsApp/correo.

Opciones seguras esperadas:

1. Magic link de activación con vencimiento.
2. Link de creación de contraseña.
3. Código OTP por correo/WhatsApp cuando el backend lo soporte.
4. Usuario + enlace seguro para definir clave.

En prototipo puede simularse, pero debe indicarse como invitación pendiente de backend/Auth real.

## 7. Estado del acceso del cliente

Campos sugeridos en cliente o entidad `portalUsuarios`:

- portalHabilitado
- portalEstado
- portalInvitadoAt
- portalActivadoAt
- portalUltimoAccesoAt
- portalCanalInvitacion
- portalInvitacionesCount
- portalConsentimientoContacto
- portalMagicLinkEstado
- portalPwaSugerida

Estados sugeridos:

- no_habilitado
- pendiente_datos
- listo_para_invitar
- invitado
- activado
- suspendido
- bloqueado
- requiere_reenvio

## 8. Invitación automática para nuevos clientes/pólizas

Cuando se cree un cliente o póliza y existan datos mínimos, la plataforma debe poder enviar invitación por:

- correo;
- WhatsApp;
- ambos;
- notificación interna al asesor para acompañar.

La invitación debe explicar:

- qué es el portal;
- beneficios;
- qué puede hacer;
- cómo ingresar;
- cómo instalar la PWA;
- quién es su asesor;
- cómo pedir soporte.

## 9. Invitaciones masivas o individuales para clientes existentes

Debe existir desde Cliente360, Portal/Admin o Calidad de Datos una opción para:

- enviar invitación individual;
- seleccionar varios clientes;
- filtrar por clientes con correo;
- filtrar por clientes con WhatsApp;
- excluir clientes ya activados;
- reenviar a clientes invitados no activados;
- generar vista de estado de invitación;
- registrar historial.

## 10. PWA

El Portal debe promover instalación como PWA:

- mostrar botón o instrucción `Agregar a pantalla de inicio` cuando el navegador lo permita;
- explicar al cliente que puede ingresar rápido desde el celular;
- mantener branding del tenant;
- usar estados honestos si la PWA no está instalada;
- conservar seguridad de sesión.

## 11. Integración con sitio web

Para anclar el portal en la página web:

- agregar botón `Portal de Clientes` en la web;
- dirigir al link del portal;
- opcionalmente usar QR;
- evitar iframe si afecta seguridad/login/PWA;
- permitir dominio o subdominio propio cuando se configure backend/hosting.

## 12. Trazabilidad de invitaciones

Cada invitación debe registrar:

- clienteId;
- canal;
- destinatario;
- plantilla;
- estadoEnvio;
- enviadoPor;
- fecha;
- link generado;
- expiración si aplica;
- respuesta/activación;
- asesor notificado;
- error si falló.

## 13. Relación con asesor

Cuando un cliente es invitado o activa portal, el asesor debe recibir notificación interna:

- cliente invitado;
- cliente activó portal;
- cliente no activó tras X días;
- cliente reportó pago;
- cliente solicitó gestión;
- cliente completó datos.

## 14. Estados honestos

No mostrar como activo:

- correo real si no está conectado;
- WhatsApp real si no está conectado;
- Auth real si no está conectado;
- magic link real si no existe;
- PWA instalada si el usuario no la instaló.

En prototipo usar textos como:

```txt
Invitación preparada / pendiente de conexión real
Notificación interna registrada
Canal WhatsApp pendiente de conexión
```

## 15. Academia y manuales

Este flujo impacta:

- manual Portal Cliente;
- manual Cliente360;
- manual Equipo/Usuarios;
- manual Integraciones;
- ruta Cliente nuevo;
- ruta Administrativo/Operativo;
- ruta Asesor nuevo;
- evaluación sobre invitación, activación y soporte portal.

## 16. Estado

Contrato creado. No implementa Auth real, correo real, WhatsApp real ni Hosting/PWA final. Debe guiar backend Auth/Portal y frontend Claude.
