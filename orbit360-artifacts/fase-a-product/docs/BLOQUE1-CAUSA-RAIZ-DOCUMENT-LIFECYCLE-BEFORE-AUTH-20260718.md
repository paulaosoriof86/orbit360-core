# Bloque 1 · Causa raíz: documento canónico antes de autenticación

Fecha: 2026-07-18  
Gate: `block1-client360-insurers-lab-v20260717`  
Clasificación vigente: `PIPELINE_MECHANISM_FAILURE`

## Secuencia de evidencia

1. Run `29660698549`: bootstrap aprobado; la interacción UI comenzó demasiado pronto.
2. Run `29661458840`: esperar `window.load` fue descartado porque los loaders post-Router pueden mantener abierto el lifecycle global.
3. Run `29661945043`: el gate exigía solo eventos del bridge, aunque el baseline usa un runtime controlado.
4. Run `29662251706`: el camino controlado quedó aprobado mediante `orbit:aseguradoras:runtime-controlled`, pero `authentication_form_ready` volvió a fallar al intentar consultar `body`.

## Causa raíz vigente

La primera navegación del gate abre `ays-lab-preview.html` y espera su `DOMContentLoaded`. Ese documento redirige mediante `location.replace` a la página canónica `index.html`.

El gate verificaba después únicamente que la URL hubiera cambiado. No esperaba el `DOMContentLoaded` del segundo documento. Las señales externas de Router y runtime podían llegar durante el parseo, antes de que Playwright dispusiera de un documento canónico estable para selectores.

Por eso el binding externo funcionó, mientras `locator('body')` no pudo resolverse.

## Corrección vigente

El runner registra el evento `page.on('domcontentloaded')` antes de iniciar la navegación y conserva evidencia de cada documento. Después de bootstrap y runtime controlado exige:

```txt
canonical_domcontentloaded_ready
path: /index.html
runtime: 20260717-2
method: playwright-page-event
beforeAuth: true
```

Solo entonces permite observar sesión restaurada o completar el formulario canónico.

Se preservan los dos caminos terminales del runtime de Aseguradoras:

1. Promesa controlada preexistente.
2. Evento terminal del bridge cuando corresponde cargarlo.

## Alcance preservado

- Carril A: Cliente 360, Aseguradoras, Auth y Legal sin cambios.
- Carril B: únicamente runner del gate y contrato overlay.
- Carril C: 414 clientes, 26 aseguradoras y 7 asesores sin reimportación ni escritura.
- `Orbit.store`, reglas Firestore, credenciales, `main`, merge y producción permanecen intactos.

## Claude y Academia

- Código: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Patrón reusable: cuando existe una redirección entre documentos, el gate debe esperar el lifecycle del destino canónico, no solo el de la página inicial ni el cambio de URL.
- Academia: diferenciar preview cargado, destino canónico cargado, runtime terminado e interfaz funcional.

## Criterio de cierre

El workflow ejecuta primero el preflight vinculante. Solo evidencia sanitizada `ok:true` permite cerrar M1 y pasar a la revisión visual única.
