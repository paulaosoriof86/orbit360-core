# Bloque 1 — Causa raíz del primer directorio visible incompleto

Fecha: 2026-07-21  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`  
Contrato: `1.0.35`

## Clasificación

- `FUNCTIONAL_DEFECT`
- Código: `FIRST_VISIBLE_DIRECTORY_INCOMPLETE`

## Evidencia que descarta entrega, cache y datos

Preflight estático aprobado:

```text
Run: 29884864315
Artifact: 8516143596
Digest: sha256:c2556e34b5a511c654d7a22877aa70e389ed2bf400a49516856eeca8527f621a
HEAD: 5bbbefdd39c62bc6a8ff762640bd3e12824bbadb
Contrato: GO_GATE_CONTRACT
Controles: 1197/1197
Activos críticos locales: 9/9
```

Gate final dirigido:

```text
Run: 29884976786
Artifact: 8516204588
Digest: sha256:674e048034cbb2ad1a2951c5c92f03733b0a65ecd448383a2e81165a17629e61
HEAD: 9db201d7b13a7520e097f65d36698e6640d56cbb
Hosting LAB: aprobado
Activos críticos remotos exactos: 9/9
Functions desplegadas: no
Rules desplegadas: no
Producción: intacta
```

Los nueve activos remotos coincidieron en bytes y SHA-256 con el HEAD. Por tanto, el fallo no provenía de una versión antigua, cache, pipeline de entrega, reimportación ni datos.

## Fallo observado

```text
Etapa: desktop_direction_client360
Código: INSURER_INACTIVE_REASON_MISSING
```

El validador navega al directorio, espera que `.asg-grid` sea visible y comprueba inmediatamente que la tarjeta inactiva contenga `.m1-inactive-reason` con el texto `Inactiva:`.

Ese criterio es correcto: el primer contenido visible debe estar completo, no completarse después de que el usuario ya lo vio.

## Causa raíz

La barrera visual `20260721.4`:

1. marcaba la ruta como pendiente;
2. aplicaba el owner canónico mediante `setTimeout` y dos ciclos de `requestAnimationFrame`;
3. comprobaba correctamente `directoryReady` antes de declarar el estado estable;
4. pero su CSS pendiente ocultaba únicamente `#asg-ficha` y no ocultaba `.asg-grid`.

Por tanto, el directorio se hacía visible antes de que `enhanceDirectory` insertara el motivo de inactividad. El estado interno terminaba estabilizándose, pero el primer pintado visible ya había incumplido el contrato.

## Corrección funcional

Barrera corregida:

```text
Archivo: orbit360-platform/core/client-insurer-visual-stability-barrier-v20260721.js
Commit: 04737846f00780a50d1c9394371a37dbdee6e6dc
Versión pública: 20260721.4
Revisión visual: 20260721.4a-first-visible-complete
Release crítico: block1-critical-runtime-20260721-4
```

La corrección:

- mantiene ocultos y no interactivos tanto `#asg-ficha` como `#host .asg-grid` mientras la ruta está pendiente;
- ejecuta el owner canónico de forma inmediata antes de programar la estabilización asíncrona;
- libera el directorio solo cuando `directoryReady` confirma que todas las tarjetas inactivas muestran `Inactiva:`;
- conserva el loop acotado para reemplazos posteriores del DOM;
- no modifica el renderer `modules/aseguradoras.js`;
- no escribe en `Orbit.store`;
- no reimporta ni altera datos;
- no crea otro owner, bridge o renderer.

## Contrato ejecutable

```text
Archivo: orbit360-platform/tools/orbit360-aseguradoras-owner-contract-v20260717.js
Commit: 8f225f6ccf9ca6b212a7621a09f67afce8745742
```

El contrato exige ahora:

- revisión `20260721.4a-first-visible-complete`;
- CSS pendiente para `.asg-grid`;
- `directoryFirstPaintGuard:true`;
- owner aplicado y readiness comprobado antes de `setTimeout`;
- motivo `Inactiva:`;
- idempotencia 27/27;
- una mutación base, una transformación canónica y cero entregas posteriores;
- cero escrituras.

## Impacto en Academia

La Academia M1 `1.225` ya contiene las dos reglas exactas:

- una aseguradora inactiva debe mostrar el motivo y conservar el histórico;
- el primer contenido visible ya debe usar la proyección canónica.

No se añade una lección duplicada. Esta bitácora queda como evidencia del caso concreto y confirma la aplicación práctica de esas reglas.

## Alcance preservado

```text
Clientes: 414
Aseguradoras: 26
Asesores: 7
Referencias históricas: 91
Credenciales de portal: 26
Colombia: intacta
Reimportación: no requerida
Escrituras operativas: 0
```

No se modificaron Store, Auth, Firestore Rules, Functions, proveedores protegidos, datos reales ni producción.

## Siguiente acción exacta

Ejecutar una sola validación estática del contrato `1.0.35`. Debe probar sintaxis, manifiesto local 9/9, arquitectura, owner contract con `directoryFirstPaintGuard:true`, idempotencia 27/27 y cero acciones externas.

Solo evidencia estática `ok:true` podrá autorizar separadamente un único deploy Hosting LAB y gate final. Si vuelve a fallar la misma etapa, se congela sin otro reintento.
