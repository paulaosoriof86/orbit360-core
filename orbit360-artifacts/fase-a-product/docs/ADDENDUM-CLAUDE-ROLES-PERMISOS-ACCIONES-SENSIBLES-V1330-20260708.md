# Addendum Claude — roles/permisos/acciones sensibles v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S / base comercializable  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Estado

Este addendum complementa el paquete Claude integral si Claude aún no ha terminado candidata. Debe anexarse al próximo paquete si la candidata actual no lo incorpora.

## Instrucción principal para Claude

Incorporar en UX/prototipo/Academia una matriz reusable de roles, permisos y acciones sensibles.

## Roles base

```txt
Direccion
AdminTenant
ITSeguridad
Finanzas
Cobros
Operativo
Asesor
Marketing
AcademiaAdmin
ClientePortal
AuditorSoloLectura
```

## UX esperada

- Botones no permitidos deben aparecer ocultos o deshabilitados con explicación.
- Acciones sensibles abren modal de motivo.
- Acciones destructivas piden confirmación reforzada.
- Bitácora visible para roles autorizados.
- ClientePortal solo ve su portal y documentos permitidos.
- Asesor ve cartera asignada, no administración global.
- AuditorSoloLectura no ejecuta acciones.

## Acciones críticas a conservar

```txt
equipo.inactivar_usuario -> no dejar tenant sin admin
configuracion.reset_configuracion -> confirmación reforzada
cobros.validar_reporte_no_aplicado -> no aplica pago
cobros.aplicar_pago_autorizado -> motivo + país/moneda
m5.validar_conciliacion -> no aplica pago
documentos.aplicar_diff -> confirmación reforzada
integraciones.activar_canal -> solo proveedor/credencial segura
automatizaciones.enviar_masivo -> proveedor conectado + confirmación
```

## Academia

Agregar rutas/lecciones de:

- administración segura por tenant;
- acciones sensibles;
- permisos por módulo;
- auditoría;
- límites de ClientePortal/Asesor/Auditor;
- integraciones configuradas vs activas.

## Documentos base

Claude debe considerar:

```txt
MATRIZ-ROLES-PERMISOS-ACCIONES-SENSIBLES-V1330-20260708.md
MATRIZ-ROLES-PERMISOS-V1330.json
ACADEMIA-IMPACTO-ROLES-PERMISOS-ACCIONES-SENSIBLES-V1330-20260708.md
```

## Backend protegido

No tocar backend protegido ni `tools/orbit360-*`. La matriz es contrato para UX y futura implementación backend, no reemplazo del backend actual.

## Estado

Addendum creado. Pendiente que Claude lo materialice en UX/Academia si no lo alcanzó en la candidata actual.