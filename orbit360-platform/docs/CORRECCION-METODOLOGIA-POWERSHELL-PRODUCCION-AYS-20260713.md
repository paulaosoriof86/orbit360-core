# Corrección de metodología PowerShell y preflight de producción A&S

Fecha: 2026-07-13  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Carril actual

```txt
Carril B: pipeline local, backend y preparación productiva
Carril C: identificación segura del proyecto Firebase y evidencia local
```

## Hallazgo

El runner focalizado vigente de Aseguradoras todavía conservaba patrones que ya estaban documentados como errores:

1. ruta local fija;
2. salida nativa combinada con `2>&1`;
3. decisión vulnerable a texto informativo de Git en `stderr`;
4. avance rápido sin bloquear primero ante cambios locales;
5. mensajes con caracteres que podían sufrir mojibake.

No se pidió a Paula ejecutar ese archivo en ese estado.

## Correcciones aplicadas

### Diagnóstico productivo read-only

Archivo:

```txt
tools/orbit360-diagnosticar-prerequisitos-produccion-ays.ps1
```

Características:

- localiza el repositorio sin ruta de usuario fija;
- no cambia rama;
- no ejecuta pull, merge, reset ni clean;
- detecta config Firebase local sin imprimir API key, appId, tokens o contraseña;
- valida existencia de `firebase.cmd`;
- consulta proyectos accesibles con `projects:list --json`;
- identifica candidatos Orbit/A&S;
- confirma si Hosting y `.firebaserc` existen;
- cuenta evidencia visual reutilizable;
- genera reporte;
- copia resumen al portapapeles;
- termina con `exit 0`, incluso cuando informa un bloqueo;
- no hace deploy, writes, imports, Auth changes ni rules changes.

### Gate focalizado Aseguradoras

Archivo corregido:

```txt
tools/orbit360-run-aseguradoras-op2-plataformas-resume.ps1
```

Correcciones:

- resolución dinámica del repositorio;
- `Start-Process` con stdout/stderr separados;
- éxito determinado por `ExitCode`;
- fail-fast;
- cambios locales preservados;
- no sincroniza si hay cambios locales y el remoto avanzó;
- no usa reset, clean o switch;
- puerto loopback automático;
- reutiliza CRM 10/10 y Aseguradoras 12/15;
- ejecuta únicamente las tres vistas pendientes de Plataformas;
- reporte y portapapeles automáticos.

### CI preparado

Archivo:

```txt
.github/workflows/orbit360-powershell-produccion-ays-smoke.yml
```

Valida:

- sintaxis mediante parser de PowerShell en Windows;
- presencia de captura segura de procesos nativos;
- ausencia de `git reset`, `git clean`, `firebase deploy`, escrituras destructivas y patrón `2>&1 | ForEach-Object`.

Estado al documentar:

```txt
Workflow creado
Ejecución observable: pendiente
No afirmar PASS hasta ver ejecución real
```

## Metodología ágil resultante

```txt
1. Un bloque corto descarga/ejecuta el diagnóstico remoto sin tocar el worktree.
2. El resultado se copia automáticamente al portapapeles.
3. Paula pega un único resumen en el chat.
4. ChatGPT decide el siguiente bloque exacto según el estado real.
5. Si está listo, se ejecuta una sola vez el gate focalizado Aseguradoras.
6. Después se continúa backend productivo/Auth/Hosting y carga controlada.
```

## Restricciones

```txt
No deploy
No producción
No writes
No imports
No Auth writes
No rules changes
No merge/main
No secretos en chat o repositorio
No repetición CRM 10/10 ni Aseguradoras 12/15
```
