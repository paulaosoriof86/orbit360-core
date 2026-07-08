# Pendientes post-auditoría — candidata Claude v1330 `2026-07-08T135740`

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Estado real de cierre

La candidata avanza el frontend del paquete v1330, pero no cierra todos los ítems al 100% bajo el contrato backend/prototipo.

```txt
Estado: aceptación parcial.
Empalme automático completo: bloqueado.
Siguiente paso: hotfix P0 + empalme selectivo.
```

## P0 — deben resolverse antes de declarar cierre total

### Portal Cliente

- Crear `documentos`/`adjuntos` metadata-only al reportar pago con soporte, no solo `soporteNombre`.
- Reemplazar fecha fija `2026-06-26` en gestión de validación de pago por fecha dinámica.
- Estandarizar estado de pago reportado como `recibido_pendiente_validacion` / `validado_no_aplicado` o equivalente claro.

### Cobros

- Eliminar `FileReader.readAsDataURL` y cualquier base64 de factura.
- Motivo obligatorio para validar reporte.
- Motivo obligatorio para aplicar pago autorizado.
- Validar país/moneda antes de aplicar pago.
- Ajustar copy de factura para no decir que cargar factura concilia automáticamente si no pasó flujo autorizado.
- Preservar trazabilidad al aplicar/rechazar/bloquear/anular.

### Conciliaciones M5

- Motivo obligatorio también al validar.
- Confirmación reforzada al anular.
- Guard país/moneda al validar.
- Copy `VALIDADA` debe aclarar `no aplicada`.

### Configuración / Equipo

- Equipo debe pedir motivo al crear/editar/inactivar usuario.
- Inactivar usuario debe bloquearse si deja tenant sin administrador activo.
- Reset permisos debe pedir confirmación reforzada y motivo.
- Guardar módulos activos debe pedir motivo.
- Cambiar plan debe pedir motivo.
- Reset configuración debe pedir motivo y bitácora.
- Integraciones no deben guardar key/token en frontend/store; usar `credentialRef: backend_required`.

### Academia

- Incorporar matriz roles/permisos/acciones sensibles v1330.
- Incorporar auditoría unificada v1330.
- Incorporar diferencia entre historial interno e historial visible para cliente.
- Confirmar progreso/certificados/rutas por rol en UI final.

## P1 — mejoras posteriores

- Cliente360 Documentos: acciones por rol.
- Cliente360: separar expediente aprobado vs documentos en revisión.
- Portal: historial visual de seguimiento del pago reportado más completo.
- Bitácora unificada visible por rol en módulos críticos.
- Integraciones: reemplazar copy técnico `backend` por lenguaje no técnico cuando sea UI no técnica.
- Login/cache-bust: tomar `styles/infra.css` solo con validación y patch de `index.html` controlado.

## Empalme recomendado

```txt
1. No copiar ZIP completo encima del repo.
2. Excluir protegidos.
3. Aceptar Cliente360 Documentos como base UX.
4. Aceptar Portal como base parcial y aplicar hotfix metadata-only/fecha dinámica.
5. Aceptar Conciliaciones como base parcial y aplicar hotfix motivo/confirmación/pais-moneda.
6. No aceptar Cobros sin hotfix base64/aplicación pago.
7. No aceptar Config/Equipo sin hotfix de gates/credenciales.
8. Actualizar Academia con roles/permisos/auditoría posterior.
```

## Estado

Pendientes documentados. Deben alimentar el siguiente bloque de hotfix/empalme seguro.