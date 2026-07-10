# Registro de control maestro — P0.9l host same-origin

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open.

## Carril actual

B + C, con traducción acumulada a A.

## Qué parte del plan avanzó

Se implementó la frontera visual/backend local para conectar:

```txt
Aseguradoras
→ formulario administrativo
→ broker de referencias
→ host same-origin
→ capacidad documental P0.9k
→ resolver/runner
→ manifiesto metadata-only
```

## Archivos creados

```txt
orbit360-platform/core/aseguradoras-same-origin-document-bridge-p09l.js
orbit360-platform/modules/aseguradoras-batch-admin-copy-p09l.js
tools/orbit360-aseguradoras-same-origin-host-p09l.mjs
tools/orbit360-iniciar-aseguradoras-lab-p09l.ps1
tools/orbit360-detener-aseguradoras-lab-p09l.ps1
tools/orbit360-test-aseguradoras-same-origin-host-p09l.mjs
.github/workflows/orbit360-aseguradoras-same-origin-p09l-smoke.yml
orbit360-platform/docs/IMPLEMENTACION-P09L-HOST-SAME-ORIGIN-FLUJO-VISUAL-20260710.md
orbit360-platform/docs/ADDENDUM-CONTROL-MAESTRO-CLAUDE-ACADEMIA-P09L-SAME-ORIGIN-20260710.md
```

## Archivos actualizados

```txt
orbit360-platform/modules/aseguradoras-knowledge-panel-p09f.js
tools/orbit360-test-aseguradoras-knowledge-panel-p09f.mjs
orbit360-platform/core/aseguradoras-same-origin-document-bridge-p09l.js
```

## Hallazgos y correcciones

### P09L-001 — faltaba frontera same-origin

- Módulo: Aseguradoras/documentos.
- Necesidad: conectar UI y runner sin CORS ni endpoints externos.
- Causa raíz: P0.9k era backend/tooling y P0.9j era UI; faltaba host controlado.
- Fix: host loopback con sesión HttpOnly, API same-origin y bridge relativo.
- Impacto: prepara primer flujo visual real sin exponer rutas.
- Estado: implementado; pendiente ejecución visual local.

### P09L-002 — index no debía modificarse

- Módulo: shell/runtime.
- Necesidad: cargar guard/bridge/bootstrap sin riesgo de mojibake.
- Causa raíz: el index central es sensible y el empalme directo no estaba validado visualmente.
- Fix: transformación en memoria al servir HTML.
- Impacto: archivo original intacto y rollback implícito al detener el host.
- Estado: implementado.

### P09L-003 — términos técnicos visibles

- Módulo: Aseguradoras UX.
- Necesidad: evitar backend/LAB/provider/snapshots/códigos técnicos.
- Causa raíz: panel y formulario fueron creados primero como superficie interna de diagnóstico.
- Fix: panel con copy de usuario y hotfix aditivo de formulario.
- Impacto: estados comprensibles y compatibles con reglas del proyecto.
- Estado: implementado; Claude debe absorberlo nativamente.

### P09L-004 — ejecución local debía ser simple

- Módulo: tooling.
- Necesidad: reducir pasos manuales.
- Fix: launcher único y script de detención.
- Impacto: valida rama/config, inicia host, abre navegador y deja reporte privado.
- Estado: implementado; pendiente ejecución en PC.

## Protecciones

- host solo `127.0.0.1`;
- cookie HttpOnly/SameSite Strict;
- origen ajeno bloqueado;
- no CORS;
- no rutas en respuesta;
- no almacenamiento cliente;
- no modificación de index;
- no secrets;
- no writes de conocimiento;
- no Cotizador/Comparativo;
- no deploy/merge/main.

## Carril A / Claude

El paquete súper acumulado sigue activo. P0.9l agrega:

- copy user-facing;
- panel y formulario;
- estados de conexión;
- flujo visual;
- responsive requerido;
- hotfix que debe convertirse en implementación nativa;
- Academia y smoke visual.

Claude aún no se solicita.

## Qué falta

1. Ejecutar host local.
2. Confirmar panel/formulario visibles.
3. Resolver AseGuate desde carpeta privada.
4. Generar preview real.
5. Ejecutar lectura training.
6. Guardar historial.
7. Recargar y confirmar read model.
8. Smoke visual.
9. Reevaluar paquete Claude.

## Siguiente acción

P0.9m:

```txt
preflight visual ejecutable
→ checklist automatizado del runtime
→ primera lectura real AseGuate
→ reporte sanitizado
→ historial/read model
→ gate de solicitud a Claude
```

## Acción manual requerida

No requerida para continuar código y documentación. La ejecución visual local será indispensable en el gate P0.9m.
