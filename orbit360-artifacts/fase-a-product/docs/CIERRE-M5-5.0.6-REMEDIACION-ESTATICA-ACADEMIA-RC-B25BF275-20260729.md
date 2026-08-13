# M5 5.0.6 — Cierre de remediación estática y nueva RC

Fecha: 2026-07-29 UTC / 2026-07-28 Guatemala  
Gate: `block5-release-candidate-visualization-v20260728`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 `draft/open`

## Corte

La ejecución runtime smoke 5.0.5 se detuvo correctamente al detectar que contenido estático versionado de Academia intentaba usar `Orbit.store.insert/update` durante el bootstrap LAB. El adaptador LAB traduce esas llamadas en escrituras Firestore, por lo que el smoke las bloqueó antes de que se completaran.

El mismo análisis detectó una segunda causa independiente: `ays-lab-preview.html` usaba la revisión visual/PWA `20260723-10` como parámetro runtime, mientras el owner contractual del backend LAB reconoce `20260717-2`.

Clasificaciones:

- `FUNCTIONAL_DEFECT` + `DATA_CONTRACT_FAILURE`: contenido estático de Academia tratado como mutación durable.
- `VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`: revisión visual confundida con runtime backend.

## Remediación reusable

Se agregó `core/academia-static-content-write-policy-v20260729.js`, versión `20260729.2`, limitado al store explícito LAB.

La política:

- carga contenido seed y addenda versionada de Academia solo en el caché de la sesión;
- no envía esas inyecciones estáticas a Firestore;
- reaplica contenido estático después de snapshots;
- preserva progreso, certificación y demás estado del usuario;
- mantiene durables las mutaciones explícitas del usuario, como progreso, cursos creados y acciones operativas;
- no altera la API pública `Orbit.store`.

`data/academia-v1230-operational-directory-v20260722.js` carga el owner antes de programar su `apply()` en LAB. `ays-lab-preview.html` mantiene separadas la revisión visual `20260723-10` y el runtime backend `20260717-2`.

El loader y el store LAB protegidos fueron preservados:

- `core/backend-lab-loader.js`: restaurado exactamente a su baseline canónico.
- `data/store-firestore-lab.local.js`: sin cambios.

## Evidencia estática

Package check:

```txt
Run: 30415573496
Job: 90461241309
Commit: 43ce8f0da202b2d4057a63bbdc199755db8555ea
Artifact: 8710028296
Digest: sha256:3ae2d78a5239ed5be90ebb7ef87ec4148ce0baa84b59ff8de28faf2cf44e4495
```

Cierre inmutable:

```txt
Authorized base: fa1289693f58fc7d714aa0e4c1cc662287777a44
Request commit: b1552ffe248012ef59901dc326adfa671805b84b
Run: 30415732795
Job: 90461724776
Artifact: 8710079365
Digest: sha256:7d28bc0a43e30353a93c4aae975a87636e01f02e0f32cacfa5c4ef905a90cf1c
Preflight: 24/24
Contrato estático: 26/26
Fixtures Academia: 18/18
```

Capacidades utilizadas:

```txt
Secrets: no
Firestore read/write: no / no
Runtime/browser: no / no
Hosting deploy: no
Functions/Rules: no
Producción/main/merge: no
Escrituras operativas: 0
```

## Nueva release candidate

```txt
RC anterior: d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045
RC nueva:    b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091
Activos críticos: 42/42
Activos públicos esperados: 25
Activos LAB coincidentes: 22
Diferencias: 3
```

Diferencias LAB exactas:

1. `ays-lab-preview.html`: existe, pero conserva el hash anterior.
2. `data/academia-v1230-operational-directory-v20260722.js`: existe, pero conserva el hash anterior.
3. `core/academia-static-content-write-policy-v20260729.js`: todavía no está publicado, HTTP 404.

Estado: `M5_RC_READY_LAB_DELIVERY_REQUIRED`.

## Estado de autorización

La autorización del gate estático 5.0.6 está consumida. Permanecen bloqueados:

- Hosting LAB;
- runtime smoke y navegador;
- revisión visual;
- Firestore y escrituras operativas;
- Functions, Rules, producción, `main`, merge y Pólizas.

## Academia

Academia debe enseñar la diferencia entre:

- contenido estático versionado que se monta de forma transitoria;
- progreso/certificación del usuario que sí requiere persistencia;
- mutación operativa real;
- defecto funcional y validador obsoleto;
- revisión visual/PWA y runtime contractual backend.

## Clasificación Claude

- Política reusable de contenido estático: `REPLICABLE_CLAUDE_ACUMULADO`.
- Integración LAB, gate, workflow y evidencia: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Datos reales, credenciales y artefactos de ejecución: no se envían.

## Siguiente acción exacta

Solicitar autorización explícita independiente para **una sola entrega Hosting LAB** de la RC `b25bf275…`, sin Firestore, datos, Functions, Rules, producción, `main` ni merge. Después de la entrega se debe exigir paridad pública `25/25` antes de considerar otra autorización de runtime smoke.
