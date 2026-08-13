# Registro — roles/permisos/acciones sensibles v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S / base comercializable  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Bloque trabajado

Backend/documentación segura mientras Claude trabaja: matriz de roles, permisos, módulos y acciones sensibles para A&S y futuros tenants.

## Archivos agregados

```txt
orbit360-platform/docs/MATRIZ-ROLES-PERMISOS-ACCIONES-SENSIBLES-V1330-20260708.md
orbit360-platform/docs/MATRIZ-ROLES-PERMISOS-V1330.json
tools/orbit360-validar-matriz-roles-permisos-v1330.mjs
tools/orbit360-test-matriz-roles-permisos-v1330.mjs
orbit360-platform/docs/ACADEMIA-IMPACTO-ROLES-PERMISOS-ACCIONES-SENSIBLES-V1330-20260708.md
orbit360-platform/docs/ADDENDUM-CLAUDE-ROLES-PERMISOS-ACCIONES-SENSIBLES-V1330-20260708.md
orbit360-platform/docs/REGISTRO-ROLES-PERMISOS-ACCIONES-SENSIBLES-V1330-20260708.md
```

## Resultado

Se fijó matriz reusable para:

- roles base;
- permisos por módulo;
- acciones sensibles;
- motivo obligatorio;
- confirmación reforzada;
- bitácora/auditoría;
- reglas de ClientePortal, Asesor, Auditor, AdminTenant e ITSeguridad;
- patrones replicables para futuros tenants.

## Tooling agregado

### Validador

```txt
tools/orbit360-validar-matriz-roles-permisos-v1330.mjs
```

Valida:

- roles requeridos;
- módulos requeridos;
- referencias a roles no declarados;
- ClientePortal sin acceso indebido a finanzas/equipo/configuración;
- AdminTenant con acceso a equipo/configuración;
- acciones sensibles con motivo/auditoría;
- confirmación reforzada en destructivas;
- business guards críticos.

### Tests sintéticos

```txt
tools/orbit360-test-matriz-roles-permisos-v1330.mjs
```

Casos:

- matriz base OK;
- AdminTenant sin equipo bloquea;
- ClientePortal en finanzas bloquea;
- acción sensible sin motivo bloquea;
- guard conciliación validada no aplicada bloquea.

## Impacto Claude/prototipo

Sí aplica. Claude debe reflejar:

- botones por permiso;
- modales de motivo;
- confirmación reforzada;
- bitácora visible;
- rutas Academia por rol;
- límites ClientePortal/Asesor/Auditor;
- integraciones configuradas vs activas.

## Impacto futuros tenants

Este bloque reduce implementación futura porque cada nuevo cliente puede partir de roles/módulos/acciones sensibles base y ajustar por configuración tenant.

## Restricciones cumplidas

- No deploy.
- No merge.
- No main.
- No producción.
- No datos reales.
- No secretos.
- No Firestore writes.
- No modificación de backend protegido.

## Estado

Bloque documentado y tooling agregado. Pendiente ejecución local agrupada solo cuando sea indispensable.