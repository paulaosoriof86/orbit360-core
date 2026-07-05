# Addendum — notificaciones y correo por usuario autorizado

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: addendum funcional/backend. Sin correo real. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Motivo

Paula aclaró una regla crítica: el correo es por usuario autorizado explícitamente al crearlo en la plataforma. No es un correo por tenant ni por rol. El cliente no debe tener opción a correo.

Este addendum complementa:

- `CONTRATO-COLECCION-NOTIFICACIONES-LAB-AYS-20260704.md`
- `MATRIZ-EVENTOS-AUDIENCIAS-CANALES-NOTIFICACIONES-AYS-20260704.md`
- `CONTRATO-PLANTILLAS-COMUNICACION-TENANT-AYS-20260704.md`
- `CONTRATO-AUTH-USUARIOS-ROLES-TENANT-LAB-AYS-20260704.md`

## 2. Regla prevalente

Cuando haya conflicto, prevalece esta regla:

```txt
Correo saliente = usuario interno autorizado explícitamente.
No = tenant.
No = rol.
No = cliente.
```

## 3. Ajuste a notificaciones

La notificación puede tener canal `correo`, pero solo puede ejecutarse como envío real si:

- hay usuario remitente autorizado;
- el usuario tiene correo habilitado;
- el canal está conectado;
- la plantilla está permitida;
- la entidad/destinatario corresponde;
- queda auditoría.

Si no cumple, queda como:

- notificación interna;
- mensaje preparado;
- link copiable;
- pendiente de conexión;
- omitida por usuario no autorizado.

## 4. Ajuste a plantillas

Las plantillas pueden ser por tenant, país, evento y audiencia.

Pero la plantilla no define desde qué correo se envía. El remitente depende del usuario autorizado.

## 5. Ajuste a cliente portal

El cliente portal puede recibir comunicaciones, ver mensajes en Portal y responder por canales definidos fuera de la configuración interna.

El cliente portal no puede:

- escoger correo de envío;
- configurar cuenta;
- activar/desactivar correo;
- cambiar remitente;
- ver opciones internas de correo;
- ver estado técnico de conexión.

## 6. Ajuste a Equipo/Usuarios

Equipo/Usuarios debe mostrar configuración por usuario:

- correo autorizado sí/no;
- canal conectado/preparado;
- permisos de envío o preparación;
- plantillas permitidas;
- estado de integración;
- auditoría de comunicaciones.

## 7. Ajuste a roles

Un rol puede tener permiso para solicitar o preparar comunicaciones, pero no implica tener correo saliente real.

Ejemplo:

- Rol Asesor puede tener permiso de seguimiento.
- Usuario Samuel puede o no tener correo autorizado.
- Usuario Paula puede tener correo autorizado.
- Rol Cobros puede gestionar pagos, pero cada usuario de Cobros requiere autorización individual para correo.

## 8. Ajuste a flujos

### Portal/invitación

La invitación puede prepararse para cliente, pero el envío real sale de usuario autorizado o queda como mensaje preparado.

### Datos faltantes

Calidad de Datos puede generar mensaje, pero envío real depende de usuario autorizado.

### Pago reportado

El asesor y Cobros reciben notificación interna. Correo externo solo si un usuario autorizado ejecuta o automatiza el envío.

### Marketing

Campañas requieren usuario/canal autorizado y trazabilidad.

## 9. Criterio de aceptación

- no aparece “correo del tenant” como canal real automático;
- no aparece “correo del rol” como canal real automático;
- cliente no puede configurar ni elegir correo;
- cada envío/preparación guarda usuario remitente;
- si no hay usuario autorizado, queda como interno/preparado/pendiente;
- las plantillas son tenant-configurables pero no equivalen a remitente.

## 10. Estado

Addendum creado. Debe aplicarse en próximos contratos, validadores, Claude y backend.
