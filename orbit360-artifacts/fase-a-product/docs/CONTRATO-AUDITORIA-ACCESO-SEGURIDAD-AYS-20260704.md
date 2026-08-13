# Contrato auditoría de acceso y seguridad

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato backend/documental. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Definir qué eventos de acceso, seguridad y permisos deben quedar auditados.

## 2. Entidad sugerida

```txt
auditoriaAcceso
```

También puede integrarse con una auditoría general:

```txt
auditoriaEventos
```

## 3. Eventos mínimos

- login_exitoso
- login_fallido
- logout
- invitacion_usuario_creada
- invitacion_usuario_enviada
- usuario_activado
- usuario_suspendido
- usuario_reactivado
- rol_asignado
- rol_removido
- permisos_modificados
- modulo_habilitado
- modulo_deshabilitado
- intento_acceso_denegado
- documento_sensible_abierto
- pago_aprobado
- pago_rechazado
- conciliacion_validada
- datos_cliente_modificados
- portal_activado
- token_magic_link_usado
- token_magic_link_vencido

## 4. Campos recomendados

- id
- tenantId
- usuarioId
- authUid
- rolActivo
- roles[]
- evento
- entidadTipo
- entidadId
- clienteId
- asesorId
- modulo
- accion
- resultado
- motivo
- ipHash si aplica
- userAgentHash si aplica
- canal
- createdAt
- payloadSeguro

## 5. Reglas de privacidad

No guardar:

- contraseñas;
- tokens completos;
- secretos;
- documentos completos;
- datos sensibles innecesarios;
- payloads de archivos.

Guardar hashes o referencias cuando sea necesario.

## 6. Eventos críticos con auditoría obligatoria

- cambio de rol;
- cambio de permisos;
- aprobación/rechazo de pago;
- conciliación bancaria;
- acceso a documento sensible;
- cambio de datos del cliente;
- activación/suspensión portal;
- configuración de integración;
- acceso denegado repetido;
- cambio de tenant/configuración.

## 7. Visibilidad

La auditoría solo debe ser visible para roles autorizados:

- superadmin_tenant;
- dirección/admin;
- auditor;
- soporte técnico autorizado.

No visible para cliente portal ni asesor salvo historial propio limitado.

## 8. Relación con Academia

Superadmin/IT y Admin Operativo deben tener formación sobre:

- lectura de auditoría;
- cambios de permisos;
- manejo de accesos;
- privacidad;
- respuesta ante accesos denegados.

## 9. Estado

Contrato creado. No implementa colección real ni reglas.
