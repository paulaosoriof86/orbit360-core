# Cierre M5 5.0.10 — Hosting LAB RC f6dfa37e

Fecha: 2026-07-29

## Bloque

M5 5.0.10 — entrega Hosting LAB de la release candidate posterior a la remediación de causa raíz 5.0.9.

## Fuente/base

- Rama: `ays/backend-tenant-lab-v99-20260703`.
- PR #5: draft/open.
- RC exacta: `f6dfa37ec1449b627c04cde2caf7d3c43acfe453fb0a7eb73924861bb4e7d324`.
- Baseline previo: 42/42 activos críticos; LAB 24/25; única diferencia `index.html`.
- Cierre de remediación: `runtime-gate-crm-v20260716/m5-runtime-smoke-509-remediation-static-closure.json`.

## Clasificación

No hubo defecto nuevo durante la entrega. El bloque ejecutó la salida prevista del cierre 5.0.9.

Los defectos que originaron la RC ya estaban clasificados y remediados:

- `FUNCTIONAL_DEFECT + DATA_CONTRACT_FAILURE`: owner de contenido estático Academia demasiado tarde.
- `VALIDATOR_STALE + PIPELINE_MECHANISM_FAILURE`: evidencia de scripts con contrato string/objeto inconsistente.

## Implementación

### Carril A — frontend / UX / Academia

- Se publicó la RC exacta que contiene el orden corregido en `index.html`.
- No se realizó revisión visual en este bloque.
- No se cambió funcionalidad de Cliente 360 o Aseguradoras durante la entrega.

### Carril B — backend / seguridad / Orbit.store

- Se usó gate canónico 5.0.10 antes de secretos/deploy.
- El secreto se habilitó únicamente para Firebase Hosting después de preflight verde.
- No se ejecutó Firestore, navegador, runtime, Functions ni Rules.
- No se modificó el store Firestore LAB protegido.

### Carril C — datos reales / migración

- Sin lectura ni escritura de datos reales.
- Clientes/Aseguradoras no se reimportaron.
- Pólizas permanece fuera de alcance.

## Evidencia

### Package check

```txt
Commit: b063b1f784dd6bee70501baa12f80a7143846f1c
Run: 30455383510
Job: 90587512533
Artifact: 8725278032
Digest: sha256:b4547ef695c7d5973eb578ee4930b1ab5f13a52a2e97f549d08a10014d5e805f
Result: SUCCESS
Deploy: skipped
Secrets: skipped
```

### Entrega única autorizada

```txt
Authorized base: 5cf631026c8369d87508bec257e6dbf6ecddb1c5
Request commit: f7249c9b38c1a613ee957056f0e408ee54c67678
Run: 30455636671
Job: 90588374673
Artifact: 8725398148
Digest: sha256:7fd3d5f8076f77f12435673dd8105666b488984174d448696ce91bcdf26e1824
Preflight: 24/24
Contract: 22/22
Hosting deploy executions: 1
```

### Paridad pública final

```txt
Critical assets: 42/42
Remote assets checked: 25
Remote assets matched: 25
Mismatches: 0
Remote parity: true
Redeploy: false
```

### Límites verificados

```txt
Firestore read: false
Firestore writes: 0
Operational writes: 0
Runtime/browser: false/false
Functions/Rules: false/false
Production/main/merge: false/false/false
Pólizas: false
```

## Estado

`M5_LAB_HOSTING_DELIVERED_AND_25_OF_25_VERIFIED`.

La autorización Hosting fue consumida y quedó en cero ejecuciones disponibles. No existe permiso de redeploy.

## Academia

Actualizar/enseñar como patrón:

- el preflight vinculante ocurre antes del acceso a secretos;
- una entrega Hosting no debe implicar acceso a datos;
- paridad pública 25/25 es condición previa para volver a ejecutar runtime;
- autorización de Hosting y autorización de runtime son independientes.

## Clasificación Claude

- Diseño general de gate package → request inmutable → paridad pública: `REPLICABLE_CLAUDE_ACUMULADO`.
- Workflows, Firebase, secretos, artifacts y evidencias: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Sin datos reales ni secretos para Claude.

## Pendiente

No hay autorización activa.

## Siguiente acción exacta

Solicitar autorización explícita independiente para **un único runtime smoke LAB** sobre la RC `f6dfa37e…`, usando obligatoriamente `tools/orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs`, con snapshots antes/después y cero escrituras. Solo después de evidencia sanitizada `ok:true` podrá habilitarse la revisión visual única.
