# Bloque 1 · Causa raíz: runtime post-Router antes de autenticación

Fecha: 2026-07-18  
Gate: `block1-client360-insurers-lab-v20260717`  
Clasificación: `PIPELINE_MECHANISM_FAILURE`

## Evidencia inicial

El run `29660698549`, HEAD `5b442f3124769e51a326c5de33940702991c9c59`, aprobó backend LAB, proveedor de autenticación, owners, PWA, contratos runtime, proyección de clientes, configuración tenant y `router-ready`, pero el gate intentó usar la interfaz mientras continuaba la carga post-Router.

## Intento diagnóstico descartado

El run `29661458840`, HEAD `36b22b176756ee7adcd4d88132e22eb43bc68dfd`, añadió `canonical_document_load_complete`. La etapa agotó 120.000 ms aunque todos los contratos canónicos y Router estaban aprobados.

El evento global `window.load` no es el owner correcto: al renderizar Aseguradoras se inicia una cola documental post-Router de scripts dinámicos. Esa cola puede mantener abierto el lifecycle global aunque el shell ya haya alcanzado su bootstrap funcional.

`lastRequestStarted` tampoco identifica una solicitud pendiente; por ello no se atribuye el bloqueo a un archivo individual ni al Service Worker sin evidencia correlacionada.

## Corrección vigente

El gate observa desde antes de navegar los eventos terminales publicados por el owner real de la cola:

```txt
orbit:aseguradoras:tenant-runtime-linked
orbit:aseguradoras:tenant-runtime-error
```

La etapa vinculante es:

```txt
canonical_post_router_runtime_terminal
```

La evidencia se transfiere a Node mediante un binding externo. El gate continúa solo cuando el owner termina y el estado no es `load_failed`, `error` o `blocked_context`.

Evidencia esperada:

```txt
method: external-custom-event-binding
beforeAuth: true
```

Después se permite observar sesión restaurada o usar el formulario canónico.

## Alcance preservado

- Carril A: Cliente 360, Aseguradoras, Auth y Legal sin cambios.
- Carril B: únicamente runner del gate y contrato overlay.
- Carril C: 414 clientes, 26 aseguradoras y 7 asesores sin reimportación ni escritura.
- `Orbit.store`, reglas Firestore, credenciales, `main`, merge y producción permanecen intactos.

## Claude y Academia

- Código: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Patrón reusable: cada loader dinámico debe exponer una señal terminal propia; una prueba no debe sustituirla por `window.load`.
- Academia: diferenciar Router listo, runtime post-Router terminado e interfaz funcional.

## Criterio de cierre

El workflow ejecuta primero el preflight vinculante. Solo evidencia sanitizada `ok:true` permite cerrar M1 y pasar a la revisión visual única.
