# Pendiente único M5 — RC f6dfa37e

Fecha: 2026-07-29 UTC / 2026-07-28 Guatemala

## Estado cerrado

- M1–M4: cerrados.
- M5 5.0.1–5.0.7: cerrados.
- Runtime smoke 5.0.8: ejecutado una sola vez; stop-line cerrado; autorización consumida.
- Remediación estática 5.0.9: cerrada.
- Snapshots antes/después: conteos y digests estables.
- Firestore writes: 0.
- Operational writes: 0.
- Nueva RC: `f6dfa37ec1449b627c04cde2caf7d3c43acfe453fb0a7eb73924861bb4e7d324`.
- Activos críticos: 42/42.
- LAB actual: 24/25.
- Única diferencia: `index.html`.

## Pendiente autorizado actualmente

Ninguno.

```txt
staticRemediationAuthorized: false
hostingDeployAuthorized: false
allowedHostingDeployExecutions: 0
runtimeSmokeAuthorized: false
allowedRuntimeSmokeExecutions: 0
visualReviewAuthorized: false
```

## Próxima autorización requerida

Una sola entrega Hosting LAB de la RC exacta `f6dfa37e…`.

Alcance permitido después de autorización explícita independiente:

- canal `orbit360-ays-lab`;
- frontend Hosting solamente;
- una ejecución;
- publicación de `index.html` con el owner Academia antes del store Firestore;
- paridad pública posterior obligatoria 25/25.

Alcance prohibido:

- Firestore y datos;
- runtime smoke y navegador;
- Functions y Rules;
- producción;
- `main` y merge;
- revisión visual;
- Pólizas y cualquier otra fuente real.

## Gate de salida Hosting

```txt
RC = f6dfa37ec1449b627c04cde2caf7d3c43acfe453fb0a7eb73924861bb4e7d324
critical assets = 42/42
remote assets = 25/25
mismatches = 0
hosting deploy executions = 1
Firestore writes = 0
runtime/browser = false/false
Functions/Rules/production/main/merge = false
```

## Gate posterior

Solo después de la paridad 25/25 podrá solicitarse un nuevo runtime smoke independiente. Debe:

- usar `tools/orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs`;
- verificar Dirección desktop, Operativo tablet y Asesor móvil;
- probar 414 clientes, 26 aseguradoras y 7 asesores;
- observar contenido Academia transitorio en `cursos`, `lecciones`, `evaluaciones` y `config`;
- cerrar con cero intentos durables, cero escrituras y evidencia sanitizada `ok:true`.

Pólizas continúa bloqueado hasta que su bloque solicite y reciba la fuente real vigente específica.
