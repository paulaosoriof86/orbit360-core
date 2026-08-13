# Actualización plan vivo — empalme hotfix P0 Config + Equipo v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

Se continúa el empalme seguro post-candidata Claude v1330. Ya quedaron scripts para Cobros + Conciliaciones y Portal. El siguiente P0 crítico es Config/Equipo.

## Bloque avanzado

| Bloque | Estado | Resultado |
|---|---|---|
| Empalme/hotfix P0 Config + Equipo | Preparado con script seguro | Script, runbook, registro y plan vivo creados. |

## Intermedio agregado

### Intermedio 31 — Hotfix P0 Config + Equipo preparado

Motivo: la candidata Claude tenía avances parciales, pero faltaban gates principales y seguía existiendo riesgo de guardar key/token en frontend/store.

Qué corrige el hotfix preparado:

```txt
Configuración:
- no key/token en frontend/store;
- credentialRef/backend_required;
- estado pendiente_conexion;
- motivo obligatorio en integración/plan/módulos;
- auditoría.

Equipo:
- motivo obligatorio en crear/editar/inactivar;
- bloqueo último administrador activo;
- reset permisos con RESTABLECER + motivo;
- auditoría.
```

## Estado real

```txt
Script creado en repo.
Pendiente ejecución local o aplicación controlada al worktree.
```

## Pendientes actualizados

| Prioridad | Pendiente | Estado esperado |
|---|---|---|
| P0 | Ejecutar script Cobros + Conciliaciones | Pendiente local/worktree |
| P0 | Ejecutar script Portal | Pendiente local/worktree |
| P0 | Ejecutar script Config + Equipo | Pendiente local/worktree |
| P0 | Academia post roles/auditoría | Siguiente bloque recomendado |
| P1 | Cliente360 acciones por rol | Posterior UX/prototipo |

## Próximo bloque recomendado

```txt
Academia post roles/permisos + auditoría unificada + modificaciones locales para Claude.
```

Motivo: quedan documentados y preparados los hotfixes funcionales P0 principales. Ahora hay que consolidar Academia y paquete acumulado para que no se pierda lo trabajado por ChatGPT/Codex.

## Estado

Plan vivo actualizado. Sin merge, deploy, main ni producción.