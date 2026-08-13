# Estado real de avance — empalme P0 v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Resumen ejecutivo honesto

El empalme P0 todavía no debe declararse aplicado como baseline operativo porque los módulos reales del worktree local aún no han ejecutado el runner único.

Lo que sí quedó avanzado y documentado:

```txt
1. Reauditoría de certeza de candidata Claude v1330.
2. Identificación de P0 reales por módulo.
3. Scripts de hotfix preparados por módulo.
4. Runner único para ejecutar todo en orden.
5. Validador post-runner para saber si queda listo para commit.
6. Checklist de aceptación.
7. Guía local con salida al portapapeles.
8. Política para usar Claude sin dispersar pendientes.
9. Addendum de modificaciones locales para Claude.
```

## Lo que NO voy a afirmar todavía

No afirmar:

```txt
- empalme P0 cerrado;
- baseline frontend corregido;
- módulos reales ya actualizados;
- listo para commit;
- listo para deploy;
- listo para merge.
```

Hasta que se ejecute localmente:

```powershell
node orbit360-platform/docs/scripts/APLICAR-HOTFIXES-P0-V1330-RUNNER.mjs
node orbit360-platform/docs/scripts/VALIDAR-POST-RUNNER-HOTFIXES-P0-V1330.mjs
```

## Qué se ha preparado para ejecutar

### Runner principal

```txt
orbit360-platform/docs/scripts/APLICAR-HOTFIXES-P0-V1330-RUNNER.mjs
```

Ejecuta:

```txt
- Cobros + Conciliaciones.
- Portal.
- Config + Equipo.
- Academia post v1330.
```

### Validador post-runner

```txt
orbit360-platform/docs/scripts/VALIDAR-POST-RUNNER-HOTFIXES-P0-V1330.mjs
```

Devuelve:

```txt
commit_ready
```

o

```txt
blocked
```

## Qué quedaría modificado si todo sale bien

Solo estos archivos:

```txt
orbit360-platform/modules/cobros.js
orbit360-platform/modules/conciliaciones.js
orbit360-platform/modules/portal.js
orbit360-platform/modules/configuracion.js
orbit360-platform/modules/equipo.js
orbit360-platform/data/academia-plus.js
```

## Protegidos que no se deben tocar

```txt
orbit360-platform/index.html
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
firestore.rules
```

## Decisión sobre Claude

Ya hay suficientes pendientes cohesionados para un paquete Claude pequeño y útil, pero no conviene mandarle todo el backlog.

Paquete recomendado para Claude, cuando Paula decida usarlo:

```txt
1. Cliente360 Documentos: acciones por rol, visibilidad, responsable y aprobar/rechazar propuestas.
2. UX visual transversal de estados: reportado, en revisión, validado no aplicado, aplicado, conciliado.
3. Academia: materializar rutas nuevas con progreso, evaluaciones, certificados y manuales visibles.
4. Smoke visual post-hotfixes: Portal, Cobros, M5, Config/Equipo, Cliente360 y Academia.
```

## Qué sigue

### Si Paula está en computador

Ejecutar runner y validador.

### Si Paula no está en computador

Continuar por ChatGPT/Codex con trabajo que no requiera ejecución local:

```txt
- preparar paquete Claude pequeño;
- documentar checklist de smoke visual;
- preparar contrato Cliente360 Documentos por rol;
- preparar cierre de empalme para cuando haya salida del runner;
- avanzar backend/documental sin tocar protegidos.
```

## Estado

Avance real documentado. Empalme preparado, no aplicado todavía.