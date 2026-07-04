# Plan backend — Portal Auth, PWA, invitaciones y calidad de datos

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: plan de bloque backend. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Ordenar el siguiente bloque de backend para responder:

- cómo entra el cliente al portal;
- cuándo se crea su usuario;
- cómo recibe invitación;
- cómo accede por web/link/PWA;
- cómo se invita a clientes existentes;
- cómo se solicitan datos faltantes desde Calidad de Datos;
- cómo se notifica al asesor;
- cómo se conserva trazabilidad.

## 2. Dependencias backend

Este bloque depende de:

1. Auth/usuarios/roles/tenant.
2. Contrato de `clientes` y asesor relacionado.
3. Contrato de `notificaciones`.
4. Plantillas de mensajes.
5. Portal habilitado por tenant.
6. PWA/manifest final.
7. Integraciones correo/WhatsApp o estados honestos si no están conectadas.

## 3. Entidades sugeridas

- `portalUsuarios`
- `portalInvitaciones`
- `portalSesiones`
- `calidadDatosSolicitudes`
- `notificaciones`
- `plantillasComunicacion`
- `clientes`
- `usuarios`

## 4. Flujo nuevo cliente

1. Se crea cliente o póliza.
2. Se evalúa si tiene correo/teléfono confiable.
3. Se evalúa si portal está habilitado.
4. Se crea/prepara `portalUsuario`.
5. Se genera invitación segura.
6. Se envía o prepara mensaje por correo/WhatsApp.
7. Se notifica al asesor.
8. Se registra trazabilidad.
9. Cliente activa acceso.
10. Cliente recibe sugerencia de instalar PWA.

## 5. Flujo cliente existente

1. Operativo/Admin filtra clientes.
2. Selecciona clientes a invitar.
3. Excluye sin datos suficientes o ya activados.
4. Genera invitación individual o masiva.
5. Registra estado por cliente.
6. Asesor ve clientes invitados/activados/no activados.
7. Se permite reenvío.

## 6. Flujo calidad de datos

1. Calidad detecta campos faltantes.
2. Admin/asesor filtra y selecciona clientes.
3. Elige campos a solicitar.
4. Se genera mensaje amable.
5. Se envía/prepara por canal disponible.
6. Cliente responde por canal o Portal.
7. Operativo valida y actualiza.
8. Se registra trazabilidad.

## 7. PWA

Pendientes técnicos:

- revisar `manifest.webmanifest` o equivalente;
- validar scope de Portal;
- definir íconos por tenant si aplica;
- definir ruta directa del portal;
- preparar copy de instalación móvil;
- no afirmar instalación si el usuario no la hizo.

## 8. URL y dominio

Opciones compatibles:

- ruta interna multi-tenant;
- subdominio del cliente;
- botón desde web A&S;
- QR/link directo;
- PWA.

No decidir dominio final hasta confirmar hosting/deploy.

## 9. Riesgos

- enviar contraseña plana;
- invitar clientes sin contacto válido;
- afirmar WhatsApp/correo real sin conexión;
- mezclar clientes entre tenants;
- exponer documentos por link público;
- permitir acceso sin Auth real;
- no registrar consentimiento/trazabilidad.

## 10. Criterio de aceptación

El bloque se considera listo cuando:

- hay contrato de usuario portal;
- hay invitación individual/masiva;
- hay estado de activación;
- hay acceso por URL directa;
- hay instrucción PWA;
- hay solicitud de datos faltantes individual/masiva;
- asesor queda notificado;
- todo queda trazado;
- no se simula envío real si no está conectado.

## 11. Impacto en Academia y manuales

Actualizar:

- manual Portal Cliente;
- manual Cliente360;
- manual Calidad de Datos;
- manual Equipo/Usuarios;
- manual Integraciones;
- ruta Cliente nuevo;
- ruta Asesor nuevo;
- ruta Administrativo/Operativo;
- evaluación sobre portal, acceso, PWA y calidad de datos.

## 12. Siguiente paso técnico

Antes de implementar Auth real, auditar candidata activa v1.123:

- `modules/portal.js`;
- `modules/cliente360.js`;
- `modules/calidad.js`;
- `modules/equipo.js`;
- `modules/configuracion.js`;
- `modules/notificaciones.js`;
- `core/auth.js`;
- `core/config.js`;
- `data/seed.js`;
- `index.html`;
- manifest/PWA si existe.

Resultado esperado:

```txt
PORTAL-AUTH-PWA-INVITACIONES-DIAGNOSTICO
- acceso actual portal:
- usuario portal actual:
- PWA actual:
- invitaciones actuales:
- calidad de datos actual:
- brechas:
- pendientes Claude:
- pendientes backend:
- impacto Academia/manuales:
```

## 13. Estado

Plan creado. No implementa Auth, URL final, PWA final, correo/WhatsApp real ni datos reales.
