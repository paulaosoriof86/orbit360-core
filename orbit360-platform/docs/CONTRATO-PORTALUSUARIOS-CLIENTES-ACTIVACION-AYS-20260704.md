# Contrato `portalUsuarios` — clientes, activación y acceso propio

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato backend/documental. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Definir la entidad `portalUsuarios` para conectar clientes con acceso seguro al Portal de Clientes sin exponer datos internos.

## 2. Principio

Un cliente no es automáticamente un usuario activo de portal. Puede existir como cliente comercial/operativo y aún no tener acceso activado.

La activación del portal requiere:

- cliente válido;
- contacto confiable;
- tenant;
- estado de invitación;
- método de activación seguro;
- permisos de portal;
- trazabilidad.

## 3. Campos recomendados

- id
- tenantId
- clienteId
- authUid
- nombreCliente
- email
- telefono
- pais
- estadoPortal
- metodoActivacion
- invitacionId
- invitadoAt
- activadoAt
- ultimoAccesoAt
- canalInvitacion
- pwaSugeridaAt
- pwaInstaladaDeclarada
- consentimientoContacto
- permisosPortal[]
- asesorId
- notificaciones[]
- createdAt
- updatedAt

## 4. Estados de portal

- no_habilitado
- pendiente_datos
- listo_para_invitar
- invitado
- activado
- requiere_reenvio
- suspendido
- bloqueado
- desactivado

## 5. Métodos de activación

- magic_link
- link_crear_password
- otp_correo
- otp_whatsapp_futuro
- activacion_manual_admin

## 6. Permisos de portal mínimos

- `portal.ver_propio`
- `portal.ver_polizas_propias`
- `portal.ver_recibos_propios`
- `portal.reportar_pago`
- `portal.cargar_soporte_pago`
- `portal.solicitar_gestion`
- `portal.ver_estado_gestiones`
- `portal.actualizar_datos_propios`
- `portal.ver_documentos_visibles`
- `academia.ver_ruta_cliente` si aplica

## 7. Relación con Cliente360

Cliente360 debe mostrar estado de portal:

- no habilitado;
- pendiente de datos;
- listo para invitar;
- invitado;
- activado;
- último acceso;
- reenviar invitación;
- suspender acceso si rol autorizado.

## 8. Relación con invitaciones

Cada `portalUsuario` puede tener varias invitaciones en histórico, pero solo una activa si el token/magic link sigue vigente.

## 9. Seguridad

No permitir:

- acceso sin `tenantId`;
- portal usuario sin `clienteId`;
- cliente viendo datos de otro cliente;
- link público permanente a documentos;
- contraseña plana;
- token visible en logs UI;
- activación si falta contacto confiable.

## 10. PWA

El portal usuario puede registrar que se sugirió PWA, pero no debe afirmar instalación real si el navegador no lo confirma.

## 11. Notificaciones

Eventos mínimos:

- portal_invitacion_preparada;
- portal_invitacion_enviada;
- portal_activado;
- portal_no_activado;
- portal_suspendido;
- portal_reactivado.

El asesor debe ser notificado cuando el cliente es invitado, activa portal o no activa después del período definido.

## 12. Calidad de datos

Si faltan correo/teléfono/país/asesor o consentimiento, `estadoPortal` debe ser `pendiente_datos` y debe poder generarse solicitud amable desde Calidad de Datos.

## 13. Auditoría

Registrar:

- invitación creada;
- invitación enviada/preparada;
- activación;
- login;
- último acceso;
- actualización de datos;
- cambio de estado;
- suspensión/reactivación.

## 14. Academia y manuales

Actualizar:

- manual Portal Cliente;
- manual Cliente360;
- manual Equipo/Usuarios;
- ruta Cliente nuevo;
- ruta Asesor nuevo;
- ruta Administrativo/Operativo.

## 15. Estado

Contrato creado. No implementa Auth real ni crea usuarios reales.
