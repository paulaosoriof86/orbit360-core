# Bloque 1 · Causa raíz: runtime controlado antes de autenticación

Fecha: 2026-07-18  
Gate: `block1-client360-insurers-lab-v20260717`  
Clasificación vigente: `VALIDATOR_STALE`

## Secuencia de evidencia

1. Run `29660698549`: bootstrap aprobado; interacción UI demasiado temprana.
2. Run `29661458840`: `window.load` no ocurrió dentro de 120.000 ms; ese lifecycle global fue descartado como condición del gate.
3. Run `29661945043`: el listener del evento terminal no recibió señales, aunque los contratos, Router y scripts observados terminaron sin errores de página.

## Causa raíz definitiva

`backend-lab-init.js` asigna anticipadamente:

```txt
window.__orbitAysKnowledgeRuntimePromise
status: catalog_visible_runtime_controlled
autoMount: false
```

El bridge de recursos de Aseguradoras devuelve inmediatamente esa promesa cuando ya existe. Por ese retorno temprano no ejecuta el bloque que publica:

```txt
orbit:aseguradoras:tenant-runtime-linked
orbit:aseguradoras:tenant-runtime-error
```

El producto cumple su modo controlado. El validador era obsoleto porque exigía exclusivamente eventos pertenecientes al camino de carga completa.

## Corrección vigente del gate

El gate observa desde antes de navegar dos caminos válidos:

1. Resolución de la promesa controlada preexistente.
2. Evento terminal del bridge cuando el runtime sí se carga.

La evidencia se transfiere externamente a Node mediante binding y se registra como:

```txt
canonical_post_router_runtime_terminal: true
method: external-custom-event-binding
beforeAuth: true
```

Estados de error, `load_failed` o `blocked_context` siguen siendo bloqueantes.

## Alcance preservado

- Carril A: Cliente 360, Aseguradoras, Auth y Legal sin cambios.
- Carril B: únicamente runner del gate y contrato overlay.
- Carril C: 414 clientes, 26 aseguradoras y 7 asesores sin reimportación ni escritura.
- `Orbit.store`, reglas Firestore, credenciales, `main`, merge y producción permanecen intactos.

## Claude y Academia

- Código: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Patrón reusable: un validador debe reconocer todos los estados terminales declarados por el owner, incluido un modo controlado o desactivado intencionalmente.
- Academia: diferenciar runtime cargado, runtime controlado y error de runtime.

## Criterio de cierre

El workflow ejecuta primero el preflight vinculante. Solo evidencia sanitizada `ok:true` permite cerrar M1 y pasar a la revisión visual única.
