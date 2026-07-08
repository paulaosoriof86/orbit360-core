# Addendum Claude — auditoría unificada v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S / base comercializable  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Estado

Este addendum complementa el paquete Claude integral si la candidata aún no cerró o si queda para la siguiente iteración.

## Instrucción principal para Claude

Incorporar bitácora/auditoría visible y consistente en módulos críticos, sin tocar backend protegido.

## UX esperada

### Portal Cliente

- Mostrar historial simple de solicitudes, pagos reportados y documentos.
- No mostrar motivos internos sensibles.
- Usar lenguaje claro: recibido, en revisión, requiere aclaración, aplicado cuando corresponda.

### Cobros

- Mostrar historial de validación/rechazo/aplicación.
- Motivo obligatorio en acciones sensibles.
- Bloqueos país/moneda visibles para rol autorizado.

### M5 Conciliaciones

- Mostrar bitácora de validar/rechazar/bloquear/anular.
- Reforzar que validada no aplicada no mueve pago.

### Documentos

- Historial de recibido, revisión, aprobación, rechazo, bloqueo, visibilidad cliente y diff.
- Diferenciar expediente aprobado vs revisión.

### Equipo/Config

- Historial de cambios de usuario, rol, permisos, plan, módulos e integraciones.
- Confirmación reforzada en reset/anulación.

### Academia

- Lección de auditoría por rol.
- Casos prácticos de acciones bloqueadas.
- Quiz sobre qué datos no deben guardarse.

## Copy recomendado

```txt
Acción registrada en bitácora.
Motivo requerido para continuar.
Acción bloqueada por regla de seguridad.
Historial visible según permisos del rol.
```

## Copy prohibido

```txt
Token guardado.
Credencial registrada.
Archivo almacenado en bitácora.
Pago aplicado automáticamente.
```

## Documentos base

Claude debe considerar:

```txt
CONTRATO-AUDITORIA-UNIFICADA-ACCIONES-SENSIBLES-V1330-20260708.md
AUDITORIA-UNIFICADA-SCHEMA-V1330.json
ACADEMIA-IMPACTO-AUDITORIA-UNIFICADA-V1330-20260708.md
```

## Backend protegido

No tocar backend protegido ni `tools/orbit360-*`. Este addendum es instrucción UX/Academia y contrato futuro, no implementación backend real.

## Estado

Addendum creado. Pendiente materialización visual por Claude si aún no la incorporó.