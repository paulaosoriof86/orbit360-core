# Pendiente único M5 — RC ae6bb2a3

Fecha: 2026-07-29

## Estado cerrado

- M1–M4: cerrados.
- M5 5.0.1–5.0.10: cerrados.
- Runtime smoke 5.0.11: ejecutado exactamente una vez; stop-line cerrado; autorización consumida.
- Causa raíz 5.0.11: `FUNCTIONAL_DEFECT` + `DATA_CONTRACT_FAILURE` en la proyección Access↔membership LAB.
- Remediación estática 5.0.12: cerrada.
- Nueva RC: `ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61`.
- Activos críticos: 42/42.
- LAB actual: 24/25.
- Única diferencia: `core/access-role-session-owner-v20260728.js`.
- Firestore writes runtime 5.0.11: 0.
- Operational writes runtime 5.0.11: 0.
- Counts/digests: estables.

## Evidencia runtime 5.0.11

```txt
Package run: 30457621192
Package job: 90595169193
Package artifact: 8726195633
Runtime request: 136cca57600c0aef146ad5b121aeb746a7d0dd4c
Runtime run: 30457847993
Runtime job: 90595950599
Runtime artifact: 8726316517
Runtime digest: sha256:61740f99806fc8353d0f2cbddf5a48b8432c27ced33dbb2e5808a94372f4135e
Preflight: 17/17
Contract: 42/42
Snapshots: 11/11 before + 11/11 after
First failure: MEMBERSHIP_BOUNDARY_NOT_ACTIVE
```

## Evidencia remediación 5.0.12

```txt
Final verification run: 30460202680
Job: 90603978220
Artifact: 8727238222
Digest: sha256:51e1e36221fecf121bc2c121b445abf5d78f6fb2de8c0cff8376a86c56f74378
Workflow safety: 13/13
Canonical preflight: 36/36
Membership fixture: 23/23
Protected files unchanged: true
Secrets/Firestore/runtime/browser/deploy: false/false/false/false/false
```

## Pendiente autorizado actualmente

Ninguno.

```txt
staticRemediationAuthorized: false
hostingDeployAuthorized: false
allowedHostingDeployExecutions: 0
runtimeSmokeAuthorized: false
allowedRuntimeSmokeExecutions: 0
visualReviewAuthorized: false
productionAuthorized: false
policiesAuthorized: false
```

## Próxima autorización requerida

Una sola entrega Hosting LAB de la RC exacta `ae6bb2a3…`.

Alcance permitido únicamente después de autorización explícita independiente:

- canal Hosting LAB `orbit360-ays-lab`;
- frontend Hosting solamente;
- una ejecución;
- publicación del nuevo `core/access-role-session-owner-v20260728.js`;
- paridad pública posterior obligatoria 25/25.

Alcance prohibido:

- Firestore y datos;
- runtime smoke y navegador;
- Functions y Rules;
- producción;
- `main` y merge;
- revisión visual;
- Pólizas y cualquier otra fuente real.

## Gate posterior

Solo después de paridad 25/25 podrá solicitarse un nuevo runtime smoke independiente. Ese runtime deberá:

- usar `tools/orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs`;
- validar que la membership autenticada quede proyectada y bound;
- verificar Dirección desktop, Operativo tablet y Asesor móvil;
- probar 414 clientes, 26 aseguradoras y 7 asesores;
- mantener contenido Academia transitorio;
- cerrar con snapshots antes/después idénticos;
- Firestore writes 0 y operational writes 0.

Pólizas continúa bloqueado hasta que su bloque solicite y reciba la fuente real vigente específica.
