# Actualización plan vivo — empalme hotfix P0 Academia post v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

Se continúa el empalme seguro post-candidata Claude v1330. Ya quedaron scripts para Cobros + Conciliaciones, Portal y Config/Equipo. El siguiente P0 es Academia post roles/permisos + auditoría unificada + continuidad de modificaciones locales.

## Bloque avanzado

| Bloque | Estado | Resultado |
|---|---|---|
| Empalme/hotfix P0 Academia post v1330 | Preparado con script seguro | Script, runbook, registro y plan vivo creados. |

## Intermedio agregado

### Intermedio 32 — Hotfix P0 Academia post v1330 preparado

Motivo: Academia de la candidata Claude cubrió la base del paquete, pero faltaba absorber los bloques backend posteriores y dejar trazabilidad para que Claude replique las modificaciones locales cuando recupere capacidad.

Qué corrige el hotfix preparado:

```txt
- Curso roles/permisos/auditoría segura.
- Curso cambios locales post-Claude y continuidad.
- Evaluaciones sobre último admin, M5 validada no aplicada, credentialRef y soporte metadata-only.
- CONTENT_V incrementado para resincronizar contenido conservando progreso/certificados.
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
| P0 | Ejecutar script Academia post v1330 | Pendiente local/worktree |
| P0 | Runner único de ejecución/validación de todos los scripts P0 | Siguiente bloque recomendado |
| P1 | Cliente360 acciones por rol | Posterior UX/prototipo |

## Próximo bloque recomendado

```txt
Crear runner único para aplicar/validar los cuatro hotfixes P0 en orden: Cobros+Conciliaciones, Portal, Config+Equipo, Academia.
```

Motivo: Paula pidió agilidad y mínima manualidad. Ya hay scripts por bloque; falta un comando maestro que ejecute todo con backup, reportes y validación.

## Estado

Plan vivo actualizado. Sin merge, deploy, main ni producción.