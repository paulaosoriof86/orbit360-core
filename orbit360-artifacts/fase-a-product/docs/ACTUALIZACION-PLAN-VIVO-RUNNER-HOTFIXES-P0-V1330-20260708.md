# Actualización plan vivo — runner único hotfixes P0 v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

Se cerró la preparación individual de los hotfixes P0 post-candidata Claude v1330. Para reducir carga manual, se consolidó todo en un runner único.

## Bloque avanzado

| Bloque | Estado | Resultado |
|---|---|---|
| Runner único hotfixes P0 v1330 | Preparado | Un comando ejecuta y valida los cuatro hotfixes P0. |

## Intermedio agregado

### Intermedio 33 — Runner único hotfixes P0

Motivo: evitar que Paula tenga que ejecutar múltiples comandos y reducir riesgo de orden incorrecto.

Comando único:

```powershell
node orbit360-platform/docs/scripts/APLICAR-HOTFIXES-P0-V1330-RUNNER.mjs
```

## Qué resuelve

```txt
- Aplica hotfix Cobros + Conciliaciones.
- Aplica hotfix Portal.
- Aplica hotfix Config + Equipo.
- Aplica hotfix Academia post v1330.
- Valida sintaxis.
- Busca patrones prohibidos.
- Verifica protegidos.
- Ejecuta runner agrupado si existe.
- Genera reporte único.
```

## Estado real

```txt
Runner creado en repo.
Pendiente ejecución local cuando Paula esté en computador.
```

## Pendientes actualizados

| Prioridad | Pendiente | Estado esperado |
|---|---|---|
| P0 | Ejecutar runner único hotfixes P0 | Pendiente local |
| P0 | Revisar JSON/reporte generado | Pendiente local |
| P0 | Commit local de módulos corregidos si ok | Pendiente después de ejecución |
| P1 | Cliente360 acciones por rol | Posterior UX/prototipo |
| P1 | Consolidar paquete Claude descargable con hotfixes | Cuando Paula lo pida o Claude recupere capacidad |

## Próximo bloque recomendado

```txt
Preparar instrucciones finales de ejecución local y checklist de aceptación del empalme P0, o continuar backend real si Paula no tiene computador.
```

## Estado

Plan vivo actualizado. Sin merge, deploy, main ni producción.