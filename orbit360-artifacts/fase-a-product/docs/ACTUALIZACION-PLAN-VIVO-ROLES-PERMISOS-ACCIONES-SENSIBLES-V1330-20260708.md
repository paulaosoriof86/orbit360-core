# Actualización plan vivo — roles/permisos/acciones sensibles v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S / base comercializable  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

Mientras Claude trabaja, se avanzó un bloque backend/documental reusable para permisos y administración segura por tenant.

## Bloque cerrado

| Bloque | Estado | Resultado |
|---|---|---|
| Matriz roles/permisos/acciones sensibles v1330 | Cerrado documental/tooling | Contrato, JSON, validador, tests, Academia y addendum Claude. |

## Intermedio agregado

### Intermedio 26 — Matriz roles/permisos/acciones sensibles

Motivo: Paula pidió que todos los módulos/opciones sean administrables y operables desde plataforma, pero con auditoría, gates, roles y sin exponer inestabilidad. Además, futuros tenants deben partir de una base reutilizable y no rediseñar permisos desde cero.

Estado: agregado.

Archivos principales:

```txt
orbit360-platform/docs/MATRIZ-ROLES-PERMISOS-ACCIONES-SENSIBLES-V1330-20260708.md
orbit360-platform/docs/MATRIZ-ROLES-PERMISOS-V1330.json
tools/orbit360-validar-matriz-roles-permisos-v1330.mjs
tools/orbit360-test-matriz-roles-permisos-v1330.mjs
```

## Qué resuelve

- Define roles base.
- Define módulos base.
- Define acciones sensibles.
- Exige motivo/auditoría.
- Exige confirmación reforzada para destructivas.
- Bloquea tenant sin administrador activo.
- Limita ClientePortal, Asesor y Auditor.
- Reutiliza patrón para futuros clientes.
- Agrega impacto Academia.

## Pendientes actualizados

| Prioridad | Pendiente | Estado esperado |
|---|---|---|
| P0 | Claude debe reflejar matriz en UX/Academia si aún no cerró candidata | Addendum creado. |
| P0 | Candidata Claude debe auditar permisos/gates | Usar checklist y runner. |
| P1 | Integrar matriz a backend real cuando Auth/roles final esté aprobado | Futuro, no tocar ahora. |
| P1 | Ejecutar tests de matriz dentro de runner agrupado | Pendiente local solo cuando sea indispensable. |

## Próximo bloque recomendado

```txt
Contrato de bitácora/auditoría unificada para acciones sensibles, documentos, cobros, M5, roles e integraciones.
```

Motivo: ya existe patrón de motivo/auditoría por módulo; conviene consolidar el shape común de auditLog antes de backend real.

## Estado

Plan vivo actualizado. Sin merge, deploy, main ni producción.