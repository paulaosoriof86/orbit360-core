# ADDENDUM — PERMISOS DE CAMPAÑA DE RENOVACIÓN v1.200b

Fecha: 2026-07-11  
Rama: `ays/backend-tenant-lab-v99-20260703`.

## Hallazgo posterior

El bridge v1.200 había corregido copy, estimaciones, KPI y contexto de Cotizador, pero la función de preparar campaña necesitaba un límite explícito de acción. Un Asesor debe poder iniciar una gestión de renovación de su cartera, pero no preparar campañas masivas ni cambiar estados de seguimiento por lote.

## Corrección

Archivo:

```txt
modules/renewals-v1200-permission-guard.js
```

Reglas:

- `A.can('renovaciones', 'edit')` es obligatorio para preparar campaña;
- sin permiso, el botón se oculta;
- una llamada directa a `campana()` también queda bloqueada;
- Solicitar propuestas continúa permitido dentro del scope porque crea/reutiliza una gestión y abre Cotizador, sin emitir ni alterar la póliza.

## Aplicación al próximo paquete Claude

- campaña masiva solo para Dirección/Admin/Operativo o permiso extra explícito;
- Asesor trabaja sobre sus renovaciones individuales;
- visibilidad del módulo no equivale a permiso para acciones masivas;
- la UX debe ocultar acciones no autorizadas y el backend debe volver a validarlas.

## Validación

Se agregó:

```txt
node orbit360-platform/tools/orbit360-validar-renovaciones-v1200b.mjs
```

Estado: documentado e integrado; smoke visual pendiente.
