# Actualización plan vivo — empalme hotfix P0 Portal v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

Se continúa el empalme seguro post-candidata Claude v1330. Cobros + Conciliaciones quedaron con script de hotfix. El siguiente P0 es Portal.

## Bloque avanzado

| Bloque | Estado | Resultado |
|---|---|---|
| Empalme/hotfix P0 Portal | Preparado con script seguro | Script, runbook, registro y plan vivo creados. |

## Intermedio agregado

### Intermedio 30 — Hotfix P0 Portal preparado

Motivo: Portal ya tenía UX de reporte de pago, pero el soporte quedaba solo como `soporteNombre`. Debe quedar como documento metadata-only y vinculado al cobro, sin base64 ni Storage simulado.

Qué corrige el hotfix preparado:

```txt
- soporte de pago como documento metadata-only;
- relación cobro-documento con soporteDocumentoId;
- storageEstado pendiente_storage;
- historial de reportado_cliente;
- auditoría portal;
- fecha dinámica;
- documento general metadata-only reforzado;
- copy honesto: soporte recibido pendiente validación.
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
| P0 | Config/Equipo gates/credentialRef | Siguiente bloque recomendado |
| P0 | Academia post roles/auditoría | Posterior |
| P1 | Cliente360 acciones por rol | Posterior UX/prototipo |

## Próximo bloque recomendado

```txt
Config/Equipo gates + credentialRef backend_required.
```

Motivo: queda pendiente crítico no guardar key/token en frontend/store y cerrar gates de crear/editar/inactivar/reset.

## Estado

Plan vivo actualizado. Sin merge, deploy, main ni producción.