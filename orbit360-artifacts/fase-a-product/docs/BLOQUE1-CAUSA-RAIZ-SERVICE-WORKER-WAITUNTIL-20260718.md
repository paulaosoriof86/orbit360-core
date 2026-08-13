# Bloque 1 — ciclo de vida `waitUntil` del Service Worker

Fecha: 2026-07-18  
Proyecto: Orbit 360 — Alianzas y Soluciones  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate único: `block1-client360-insurers-lab-v20260717`  
Contrato objetivo: `1.0.18`  
Producción/main/merge: no autorizados

## Evidencia de entrada

Run: `29648678441`  
Commit: `ac03838e4f7fc766fd24ab4af9551e26bc2219c1`  
Contrato: `1.0.17`

Confirmaciones:

- preflight `GO_GATE_CONTRACT`;
- 414 clientes, 26 aseguradoras y 7 asesores;
- snapshots pre-auth eliminados;
- sin mensajes de permisos denegados de Firestore antes del login;
- proyección canónica aprobada aproximadamente a los 135 segundos;
- `tenant-insurer-config-p10.js` respondió HTTP 200 desde Service Worker;
- la solicitud no terminó y el navegador no parseó el script;
- `runtimeOwnerDiagnostics` no pudo completarse porque `page.evaluate` quedó esperando;
- primer error: `PIPELINE_STEP_TIMEOUT:canonical_tenant_insurer_core_ready`;
- watchdog global no excedido;
- resultado `ok:false`.

La corrección de Auth/snapshots funcionó. El bloqueo restante estaba en el ciclo de vida del Service Worker.

## Clasificación

`PIPELINE_MECHANISM_FAILURE`.

Owner: PWA — Service Worker/caché/transporte.

## Causa raíz

La estrategia caché-first creaba la actualización de red dentro de una promesa de `cache.match()` y llamaba:

```txt
event.waitUntil(refreshPromise)
```

solo después de resolver esa promesa asíncrona.

`waitUntil` debe extender la vida del evento durante el despacho del evento. Al registrarse tardíamente, la promesa de `respondWith` podía entregar encabezados HTTP 200 desde caché, pero no completar el cuerpo de respuesta. El navegador observaba la respuesta iniciada sin `requestfinished` ni parseo del script.

## Corrección

`sw.js` ahora:

1. crea `cachePromise` y `refreshPromise` durante el handler de `fetch`;
2. registra `event.waitUntil(refreshPromise.catch(...))` de forma sincrónica;
3. registra `event.respondWith(...)` de forma independiente;
4. responde inmediatamente desde caché cuando existe;
5. usa la actualización acotada como respuesta solo en cache miss;
6. mantiene timeout de red en 8 segundos;
7. crea una caché aislada `orbit360-v20260717-2-pwa2` para retirar la implementación anterior;
8. conserva el runtime `20260717-2` y los presupuestos funcionales.

## Preservado

- watchdog global: 900.000 ms;
- proyección: 450.000 ms;
- reglas Firestore;
- Auth;
- adaptador auth-gated;
- Router owner-aware;
- Cliente 360 y Aseguradoras;
- 414/26/7;
- cero reimportación y cero producción.

## Carriles

### A — frontend/UX

Sin cambios visuales ni de renderers.

### B — PWA/pipeline

Avance:

- evento Service Worker extendido correctamente;
- respuesta de caché desacoplada de la revalidación;
- caché anterior retirada por nombre de build interno;
- primer error y owners continúan sanitizados.

### C — datos A&S

Sin escrituras, reimportaciones ni nuevas fuentes.

## Claude

Clasificación: `REPLICABLE_CLAUDE_INMEDIATO`.

Patrones:

- `waitUntil` no se registra dentro de callbacks tardíos;
- `respondWith` y revalidación en segundo plano deben declararse durante el handler;
- HTTP 200 no equivale a cuerpo terminado ni script parseado;
- un cambio de estrategia de caché debe aislar su cache key;
- transporte, parseo y owner readiness son gates separados.

## Academia

Caso:

> Un script devuelve HTTP 200 desde Service Worker, pero nunca aparece como `requestfinished` ni se parsea.

Diagnóstico correcto:

1. revisar el ciclo de vida del evento `fetch`;
2. comprobar dónde se registra `waitUntil`;
3. separar la respuesta de caché de la actualización de red;
4. no aumentar el timeout del owner;
5. validar nuevamente la finalización y el parseo.

## Siguiente acción exacta

```txt
1. Registrar contrato 1.0.18.
2. Ejecutar preflight vinculante.
3. Ejecutar el mismo gate una sola vez.
4. Aceptar exclusivamente resultado sanitizado ok:true.
```

Si falla: no reintentar; leer `failureStage`, `error`, `contractResponses`, `parsedScripts`, `runtimeOwnerDiagnostics` y `routerRuntimeContracts` antes de otra modificación.
