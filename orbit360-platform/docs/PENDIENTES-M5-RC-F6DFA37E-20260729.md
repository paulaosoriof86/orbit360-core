# Pendiente único M5 — RC f6dfa37e

Fecha: 2026-07-29 UTC / 2026-07-29 Guatemala

## Estado cerrado

- M1–M4: cerrados.
- M5 5.0.1–5.0.7: cerrados.
- Runtime smoke 5.0.8: ejecutado una sola vez; stop-line cerrado; autorización consumida.
- Remediación estática 5.0.9: cerrada.
- Hosting LAB 5.0.10: cerrado con una sola ejecución autorizada.
- RC: `f6dfa37ec1449b627c04cde2caf7d3c43acfe453fb0a7eb73924861bb4e7d324`.
- Activos críticos: 42/42.
- Paridad pública LAB: 25/25.
- Mismatches: 0.
- Firestore read/write: false / 0.
- Operational writes: 0.
- Runtime/browser durante Hosting: false/false.
- Functions/Rules/producción/main/merge/Pólizas: no.

## Evidencia Hosting 5.0.10

```txt
Package run: 30455383510
Package job: 90587512533
Package artifact: 8725278032
Package digest: sha256:b4547ef695c7d5973eb578ee4930b1ab5f13a52a2e97f549d08a10014d5e805f

Request commit: f7249c9b38c1a613ee957056f0e408ee54c67678
Delivery run: 30455636671
Delivery job: 90588374673
Delivery artifact: 8725398148
Delivery digest: sha256:7fd3d5f8076f77f12435673dd8105666b488984174d448696ce91bcdf26e1824

Preflight: 24/24
Contract: 22/22
Remote assets: 25/25
Hosting deploy executions: 1
Redeploy: false
```

## Pendiente autorizado actualmente

Ninguno.

```txt
hostingDeployAuthorized: false
allowedHostingDeployExecutions: 0
runtimeSmokeAuthorized: false
allowedRuntimeSmokeExecutions: 0
visualReviewAuthorized: false
productionAuthorized: false
```

## Próxima autorización requerida

Un único runtime smoke LAB independiente sobre la RC exacta `f6dfa37e…`.

Alcance permitido solo después de autorización explícita separada:

- lectura Firestore read-only necesaria para snapshots y bootstrap;
- navegador/runtime una sola vez;
- `tools/orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs` como owner obligatorio;
- Dirección desktop, Operativo tablet y Asesor móvil;
- 414 clientes, 26 aseguradoras y 7 asesores;
- contenido Academia transitorio sin alcanzar escritura durable;
- snapshots antes/después idénticos;
- cero escrituras Firestore y operativas.

Alcance que sigue prohibido:

- Hosting/redeploy;
- escrituras Firestore o datos;
- Functions y Rules;
- producción;
- `main` y merge;
- revisión visual hasta cerrar runtime con `ok:true`;
- Pólizas y cualquier otra fuente real.

## Gate posterior

Solo si el runtime smoke independiente termina con evidencia sanitizada `ok:true`, conteos/digests estables y cero escrituras podrá habilitarse la revisión visual única.

Pólizas continúa bloqueado hasta que su bloque solicite y reciba la fuente real vigente específica.
