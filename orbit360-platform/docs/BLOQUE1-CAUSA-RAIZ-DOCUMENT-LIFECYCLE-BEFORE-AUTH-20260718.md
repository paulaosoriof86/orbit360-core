# Bloque 1 · Causa raíz: lifecycle del documento antes de autenticación

Fecha: 2026-07-18  
Gate: `block1-client360-insurers-lab-v20260717`  
Evidencia fuente: run `29660698549`, HEAD `5b442f3124769e51a326c5de33940702991c9c59`  
Clasificación: `PIPELINE_MECHANISM_FAILURE`

## Primer fallo real

El gate aprobó bootstrap, backend LAB, proveedor de autenticación, owners, PWA, contratos runtime, proyección de clientes, configuración de aseguradoras, tenant activo y señal `router-ready`.

Después falló en `authentication_form_ready` porque Playwright no pudo resolver ni siquiera `locator('body')` dentro de 12 segundos.

La evidencia simultánea mostró que el documento seguía solicitando y procesando scripts después de `router-ready`. Por tanto, `canonical_bootstrap_stable` demostraba estabilidad de contratos y Router, pero no que el navegador hubiera completado el evento `load` ni que la UI estuviera lista para interacción.

## Corrección de causa raíz

El runner incorpora una etapa vinculante anterior a autenticación:

```txt
canonical_document_load_complete
```

Esta etapa espera el lifecycle nativo del navegador mediante `page.waitForLoadState('load')`, conserva el watchdog global de 900.000 ms y registra evidencia sanitizada:

```txt
state: load
method: browser-lifecycle-event
beforeAuth: true
```

Solo después se permite observar sesión restaurada o completar el formulario canónico.

## Alcance preservado

- Carril A: no cambia Cliente 360, Aseguradoras, Auth ni Legal.
- Carril B: cambia únicamente el mecanismo del gate y su contrato overlay.
- Carril C: no reimporta ni modifica los 414 clientes, 26 aseguradoras o 7 asesores.
- Sin cambios en `Orbit.store`, Firestore rules, credenciales, `main`, merge o producción.

## Clasificación para Claude y Academia

- Claude: `BACKEND_PROTEGIDO_NO_CLAUDE` para el código del gate.
- Patrón reusable: el frontend no debe considerar `router-ready` equivalente a documento interactuable; las pruebas deben respetar el lifecycle real del navegador.
- Academia: diferenciar contrato de bootstrap, carga completa e interacción funcional.

## Criterio de cierre

El mismo gate se ejecuta una sola vez después del preflight vinculante. Solo evidencia sanitizada `ok:true` permite cerrar M1 y pasar a la revisión visual única.
