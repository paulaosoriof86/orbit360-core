# Bloque 1 — Cierre de hallazgos exactos del preflight 1.0.5

Fecha: 2026-07-17  
Gate: `block1-client360-insurers-lab-v20260717`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Contrato: `1.0.5`  
Producción: no autorizada

## Bloque y carriles

- Bloque activo: Cliente 360 + Aseguradoras LAB.
- Carril A: renderer y funcionalidad de Cliente 360 preservados.
- Carril B: corrección exclusiva del bootstrap de preview y del contrato del preflight.
- Carril C: 414 clientes, 26 aseguradoras y 7 asesores preservados; sin lectura, escritura ni reimportación durante el diagnóstico.

## Fuente y evidencia

El run `29607094892` publicó por primera vez los IDs exactos del preflight:

1. `RUNTIME_GRAPH_NO_RETIRED_REF:orbit360-platform/ays-lab-preview.html:import-initial-profiles.js`
2. `RUNTIME_GRAPH_NO_RETIRED_REF:orbit360-platform/ays-lab-preview.html:importar-initial-tenant-lab.js`
3. `RUNTIME_GRAPH_NO_RETIRED_REF:orbit360-platform/modules/cliente360.js:data-mode`

El workflow se detuvo antes de secrets, Firebase, sincronización, Hosting, Playwright y navegador.

## Clasificación por hallazgo

### 1. Precargas retiradas en `ays-lab-preview.html`

Clasificación: `FUNCTIONAL_DEFECT`.

La página de entrada todavía precargaba dos artefactos temporales de migración:

- `data/import-initial-profiles.js`;
- `modules/importar-initial-tenant-lab.js`.

Aunque la precarga no ejecutaba directamente su lógica, mantenía ambos artefactos dentro del grafo activo, contradiciendo el retiro ya definido por el contrato y permitiendo que una sesión futura dependiera de archivos temporales.

### 2. Token `data-mode` en Cliente 360

Clasificación: `VALIDATOR_STALE`.

`data-mode` no pertenece a un bridge retirado. Es un atributo semántico legítimo del renderer canónico de Cliente 360 para el selector de registro de endosos:

- Manual;
- Importar;
- Inteligente.

Eliminarlo habría degradado una función válida. El error estaba en usar un token genérico como referencia prohibida.

## Implementación

### `orbit360-platform/ays-lab-preview.html`

- Se retiraron las dos precargas temporales.
- Se preservaron loader/init LAB, Store Firestore LAB, Auth, Router, Cliente 360, Aseguradoras, readiness, canonical sync y advisor bridge.
- Se actualizó la versión de preview y Service Worker a `20260717-2` para evitar reutilizar el grafo anterior.
- La ruta canónica continúa usando tenant `alianzas-soluciones` y backend `firestore-lab`.

### `tools/orbit360-gate-contract-registry-v20260717.json`

- Contrato actualizado a `1.0.5`.
- Estado: `ACTIVE_PENDING_PREFLIGHT`.
- `data-mode` se retiró de `forbiddenRuntimeReferences` por ser demasiado amplio.
- Se documentó por qué el selector legítimo de Cliente 360 debe preservarse.
- Las referencias de archivos realmente retirados permanecen prohibidas.

## Archivos no modificados

- `modules/cliente360.js`;
- `modules/aseguradoras.js`;
- `core/auth.js`;
- `core/legal.js`;
- `core/router.js`;
- `core/access-scope.js`;
- `data/store.js` y adaptadores;
- Firebase Rules;
- datos e importadores canónicos.

## Claude / prototipo comercializable

### `REPLICABLE_CLAUDE_INMEDIATO`

- La página de entrada no debe precargar seeds o importadores temporales una vez cerrada la carga inicial.
- Los validadores no deben prohibir atributos genéricos como `data-mode`, `data-id` o `data-tab` sin identificar el selector o owner retirado de forma precisa.

### `REPLICABLE_CLAUDE_ACUMULADO`

Patrón reusable:

> Un hallazgo del preflight se clasifica por referencia exacta. Se elimina una dependencia retirada, pero se conserva una semántica legítima. Los tokens prohibidos deben ser suficientemente específicos para no bloquear componentes canónicos.

### `BACKEND_PROTEGIDO_NO_CLAUDE`

No se entrega a Claude:

- canal LAB;
- Firebase;
- secretos;
- workflow;
- Playwright;
- detalles de Auth o snapshots.

## Academia

`ACADEMIA_ACTUALIZAR` con el caso:

**“Un mismo texto puede ser una dependencia retirada o un atributo legítimo.”**

Debe enseñar:

- a leer archivo, contexto y owner antes de borrar;
- a distinguir `FUNCTIONAL_DEFECT` de `VALIDATOR_STALE`;
- a evitar reglas demasiado amplias;
- a proteger la funcionalidad canónica al retirar temporales.

## Estado del plan

### Avance visible

- Evidencia sanitizada exacta disponible.
- Dos referencias temporales retiradas del preview.
- Cliente 360 preservado.
- Contrato afinado y versionado.

### Paso intermedio

Fue necesario mejorar la observabilidad del preflight antes de corregir. Sin los IDs exactos, se habría podido eliminar por error una función legítima de Cliente 360.

### Siguiente acción exacta

1. Ejecutar el mismo preflight sobre el contrato `1.0.5`.
2. Si devuelve `VALIDATOR_STALE`, corregir únicamente el nuevo check exacto.
3. Si devuelve `GO_GATE_CONTRACT`, ejecutar una sola vez el mismo gate runtime.
4. Solo con evidencia sanitizada `ok:true`, realizar la revisión visual única de Dirección escritorio, Operativo tableta y Asesor móvil.

No se abre Bloque 2 ni producción mientras el Bloque 1 no cierre con `ok:true`.
