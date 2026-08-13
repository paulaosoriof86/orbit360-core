# Matriz canales por usuario — notificaciones y correo

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: matriz funcional/backend. Sin correo real. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Propósito

Definir qué canales puede usar cada usuario según autorización explícita, sin asumir que un rol o tenant habilita correo saliente.

## 2. Regla general

```txt
Canal externo real = usuario autorizado + canal conectado + permiso + plantilla permitida + auditoría.
```

## 3. Matriz inicial

| Usuario/tipo | Correo saliente | WhatsApp/wa.me | WhatsApp Cloud/Make | Notificación interna | Portal |
|---|---|---|---|---|---|
| Cliente portal | No configura / no envía | No configura | No configura | Recibe visible | Sí, propio |
| Asesor | Solo si usuario autorizado | Si permitido | Si conectado/autorizado | Sí | Ve actividad asignada |
| Cobros | Solo si usuario autorizado | Si permitido | Si conectado/autorizado | Sí | No como cliente |
| Operativo | Solo si usuario autorizado | Si permitido | Si conectado/autorizado | Sí | Soporte/admin |
| Admin | Solo si usuario autorizado | Si permitido | Si conectado/autorizado | Sí | Supervisa |
| Dirección | Solo si usuario autorizado | Si permitido | Si conectado/autorizado | Sí | Supervisa |
| Marketing | Solo si usuario autorizado y base aplicable | Si permitido | Si conectado/autorizado | Sí | No como cliente |
| Sistema/automatización | No como usuario humano; requiere integración configurada | Según integración | Según integración | Sí | No |

## 4. Cliente portal

El cliente no tiene configuración de canales internos.

Puede recibir:

- mensaje en Portal;
- correo enviado por usuario autorizado si aplica;
- WhatsApp enviado/preparado por usuario autorizado o integración configurada;
- confirmaciones visibles.

Pero no puede administrar canal correo.

## 5. Usuario interno

Cada usuario interno debe tener:

- canales autorizados;
- estado de cada canal;
- permisos de envío/preparación;
- relación con plantillas permitidas;
- historial/auditoría.

## 6. Notificación interna por defecto

Si no hay canal externo autorizado o conectado, la plataforma debe crear notificación interna o mensaje preparado.

No debe bloquear el flujo operativo por falta de correo.

## 7. Automatizaciones

Una automatización puede enviar solo si existe configuración aprobada por tenant y trazabilidad.

No debe confundirse con correo por rol.

## 8. Criterio de aceptación

- cliente no ve configuración de correo;
- usuario interno tiene canal por autorización explícita;
- rol no activa correo automáticamente;
- tenant no impone un único correo fijo;
- si falta canal externo, queda notificación interna o mensaje preparado;
- todo queda auditado.

## 9. Estado

Matriz creada. Debe guiar frontend, backend, manuales y validadores.
