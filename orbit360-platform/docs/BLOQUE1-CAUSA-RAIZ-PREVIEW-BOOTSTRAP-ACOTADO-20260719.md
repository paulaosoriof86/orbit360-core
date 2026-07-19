# Bloque 1 — bootstrap acotado de la página puente LAB

Fecha: 2026-07-19  
Gate: `block1-client360-insurers-lab-v20260717`  
Contrato funcional: `1.0.27`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción/main/merge: no autorizados

## Evidencia de entrada

- Run: `29689634876`.
- HEAD probado: `1919f2a5495849120e9012856299249c909f0916`.
- Preflight: `GO_GATE_CONTRACT`.
- Datos LAB: 414 clientes, 26 aseguradoras y 7 asesores.
- Deploy, propagación y navegador: aprobados.
- Primera etapa fallida: `preview_redirect_ready`.
- Error exacto: `CANONICAL_INDEX_NOT_REACHED:/ays-lab-preview.html`.
- El gate no alcanzó Cliente 360, Aseguradoras ni la vista Asesor.

## Clasificación

`FUNCTIONAL_DEFECT` en el bootstrap LAB, con contradicción de presupuesto observada por el validador.

No es una regresión del permiso consultivo del Asesor. Entre el run previo que llegó a `mobile_asesor_menu` y este run no cambiaron `ays-lab-preview.html`, `sw.js`, Cliente 360, Aseguradoras, Router, Auth, Store ni datos.

## Causa raíz

La página puente ejecutaba en serie y sin presupuesto integral:

1. consulta y desregistro de Service Workers;
2. limpieza de cachés;
3. registro del Service Worker;
4. espera de `navigator.serviceWorker.ready`;
5. espera de control;
6. precarga secuencial de activos;
7. redirección al índice canónico.

Una promesa de Service Worker, caché o red podía impedir indefinidamente que se alcanzara `location.replace`. El gate observó correctamente que el documento quedó completo en `/ays-lab-preview.html`, sin errores de parseo ni navegación canónica.

## Corrección

Commit: `e68f0039b0d0ed6f7a17a5eeecb0274093e527ba`.

Único archivo funcional modificado:

`orbit360-platform/ays-lab-preview.html`

Cambios:

- presupuesto integral `PREVIEW_BOOTSTRAP_BUDGET_MS = 12000`;
- límites por operación PWA/caché/red;
- espera de worker acotada;
- precargas paralelas y best-effort;
- estado interno sanitizado `__ORBIT_PREVIEW_BOOTSTRAP__`;
- redirección canónica garantizada en `finally`;
- mismo runtime `20260717-2` y mismo destino A&S LAB.

## Preservado

- Service Worker y estrategia de caché;
- watchdog global del gate;
- contrato funcional 1.0.27;
- permiso consultivo de Aseguradoras para Asesor;
- límites de escritura del Asesor;
- Cliente 360 y Aseguradoras canónicos;
- Store, Auth, Router, Legal, Access y Firestore Rules;
- 414 clientes, 26 aseguradoras y 7 asesores;
- cero reimportación, merge o producción.

## Carriles

### A — frontend/UX

Sin cambio visual ni de renderers. La pantalla de preparación conserva el mismo copy cliente.

### B — PWA/pipeline

El bootstrap de la página puente pasa de espera abierta a preparación best-effort acotada con postcondición garantizada.

### C — datos A&S

Sin escrituras ni reimportaciones. Se preservan 414/26/7.

## Claude

- `REPLICABLE_CLAUDE_ACUMULADO`: toda página puente o bootstrap debe tener presupuesto integral y postcondición garantizada.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: canal LAB, Service Worker, Firebase, credenciales y gate.
- Patrón reusable: tareas de limpieza, registro y precarga no pueden impedir indefinidamente el acceso al shell canónico.

## Academia

`ACADEMIA_ACTUALIZAR`:

- diferencia entre una pantalla funcional y un bootstrap auxiliar bloqueado;
- operaciones best-effort frente a operaciones obligatorias;
- timeout del caller no equivale a cancelación de la operación subyacente;
- una postcondición crítica debe ejecutarse en `finally` cuando la preparación previa es degradable.

## Siguiente acción exacta

1. Ejecutar el preflight vinculante.
2. Ejecutar el mismo gate 1.0.27 exactamente una vez sobre el HEAD final.
3. Aceptar únicamente evidencia sanitizada `ok:true`.
4. Si falla, detenerse en la primera etapa nueva y clasificarla; no repetir este bootstrap, no revertir el permiso del Asesor y no reimportar datos.
