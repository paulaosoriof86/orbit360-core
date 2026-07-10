# Implementación P0.9n — Observador de runtime y reporte visual sanitizado

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft, sin merge ni deploy.

## 1. Carril actual

Carriles B + C, con traducción acumulativa al Carril A.

## 2. Necesidad

P0.9m comprobaba host, sesión, referencia y lectura training desde un runner técnico. Faltaba observar el flujo real del navegador sin capturar:

- nombres o datos personales;
- texto de documentos;
- tasas o valores;
- rutas o referencias;
- secretos;
- screenshots con información sensible.

También faltaba impedir que una bandera enviada por el navegador declarara prematuramente listo el paquete Claude.

## 3. Observador P0.9n

Archivo:

```txt
orbit360-platform/core/aseguradoras-runtime-observer-p09n.js
```

El observador registra únicamente:

- runtime y preparación;
- conexión de archivos;
- existencia y visibilidad de panel/formulario;
- rol activo presente y asignado;
- tenant coincidente;
- preview generado;
- lectura terminada;
- historial persistido;
- recarga detectada;
- conteos del read model;
- viewport;
- desbordamiento horizontal;
- términos técnicos prohibidos visibles;
- estado de los gates.

No registra identidad, correo, IDs personales, texto de documentos ni valores.

## 4. Eventos observados

El observador responde a:

```txt
hashchange
load
orbit:aseguradoras:knowledge-ready
orbit:aseguradoras:source-reference-state
orbit:aseguradoras:batch-admin-state
orbit:aseguradoras:batch-state
orbit:store
```

Las capturas se agrupan mediante debounce para evitar reportes repetitivos.

## 5. Recarga e historial

Después de recargar, el estado temporal del formulario desaparece. P0.9n reconstruye el flujo usando:

```txt
aseguradora_batch_runs
aseguradora_batch_items
latest
latestItems
```

Una lectura se reconstruye como terminada únicamente si:

- el run ya no está `running`;
- existe al menos un ítem con estado `dry_run_ready`, `persisted` o `verified`.

El historial se considera persistido si existen runs del tenant/lote.

## 6. Fuentes y read model

El contador `sources` suma documentos dentro de `aseguradoras.docs[]`; no confunde documentos con cantidad de aseguradoras.

Los demás conteos son tenant-scoped:

```txt
manifiestos
propuestas
reglas
presentaciones
bindings
revisiones
runs
items
```

El gate de read model exige snapshots instalados, historial persistido y runs/items visibles.

## 7. Responsive y copy

El gate responsive no se aprueba con una sola resolución. Exige observación sin overflow en:

```txt
mobile
desktop
```

El observador detecta, sin guardar el texto completo, la presencia de términos prohibidos como:

```txt
BACKEND_REQUIRED
Firestore
Firebase
Preflight LAB
Provider
Snapshots
metadata-only
fileRef
sourceRef
localPath
```

## 8. Reporte privado

El bridge P0.9l incorpora:

```txt
submitRuntimeReport
```

El host expone:

```txt
POST /__orbit360/runtime-report
```

Antes de escribir, el host normaliza un esquema cerrado. Ignora cualquier campo libre o sensible.

Los reportes se guardan en:

```txt
_orbit360_private_reports/
```

Formatos:

```txt
P09N-RUNTIME-<fecha>-<hash>.json
P09N-RUNTIME-<fecha>-<hash>.md
```

La respuesta HTTP no incluye la ruta del reporte.

## 9. Gate Claude calculado por servidor

El host no acepta `ready`, `status` o `pending` enviados por el cliente.

Recalcula estos trece gates obligatorios:

```txt
runtime_ready
panel_mounted
form_mounted
auth_role
source_connection
preview
training_read
history_persisted
history_after_reload
read_model
responsive_structure
copy_clean
module_boundary
```

Claude solo puede marcarse listo cuando todos están `approved`.

`module_boundary` permanece pendiente hasta una revisión visual explícita de Aseguradoras/Cotizador/Comparativo.

## 10. Seguridad

P0.9n conserva:

```txt
containsPii: false
containsDocumentText: false
containsLocalPaths: false
containsReferences: false
containsSecrets: false
writeAllowed: false
enablesCotizador: false
enablesComparativo: false
```

El endpoint exige sesión HttpOnly y mismo origen.

## 11. Bootstrap y launcher

El bootstrap carga P0.9n después del formulario P0.9j.

El launcher P0.9l ahora envía explícitamente:

```txt
--report-dir _orbit360_private_reports
```

El observador funciona automáticamente al abrir Aseguradoras.

Para revisar el último reporte se añadió:

```txt
tools/orbit360-revisar-observacion-aseguradoras-p09n.ps1
```

El script genera un resumen legible, lo copia al portapapeles y no escribe datos operativos.

## 12. Pruebas

Archivos:

```txt
tools/orbit360-test-aseguradoras-runtime-observer-p09n.mjs
tools/orbit360-test-aseguradoras-runtime-report-p09n.mjs
tools/orbit360-test-aseguradoras-runtime-bootstrap-p09f.mjs
tools/orbit360-test-aseguradoras-same-origin-host-p09l.mjs
```

Cubren:

- panel/formulario visibles;
- rol activo sin identidad;
- conteo correcto de documentos;
- preview, lectura e historial;
- reconstrucción después de recarga;
- read model;
- copy técnico;
- overflow;
- endpoint privado;
- sanitización de PII/rutas/referencias;
- intento de manipular el gate Claude;
- origen ajeno bloqueado;
- cero habilitación.

Workflow:

```txt
.github/workflows/orbit360-aseguradoras-runtime-observer-p09n-smoke.yml
```

## 13. Archivos protegidos

No se modificaron:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/firestore.rules
```

## 14. Estado real

```txt
observador P0.9n: implementado
endpoint/reportes privados: implementados
gate servidor: implementado
bootstrap: actualizado
launcher/revisor: actualizados
smokes/workflow: configurados

observación real en navegador: pendiente
preview real: pendiente
lectura desde formulario: pendiente
historial tras recarga real: pendiente
mobile + desktop real: pendiente
frontera visual de módulos: pendiente
Claude: todavía no
Cotizador: deshabilitado
Comparativo: deshabilitado
```

## 15. Siguiente acción

P0.9o — consolidación de observaciones y checklist visual controlado:

```txt
agrupar reportes desktop/mobile
→ comparar antes/después de recarga
→ checklist de frontera de módulos
→ registrar aprobación visual sin PII
→ consolidar gate técnico + visual
→ decidir paquete Claude
```

La aprobación visual deberá quedar separada de la habilitación funcional y no permitirá activar Cotizador o Comparativo.
