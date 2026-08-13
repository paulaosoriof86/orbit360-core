# Bloque 1 — Evidencia sanitizada del preflight

Fecha: 2026-07-17  
Gate: `block1-client360-insurers-lab-v20260717`  
Contrato: `1.0.4`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Necesidad

El preflight fail-closed detenía correctamente el workflow antes de secrets, Firebase, sincronización, Hosting y Playwright. Sin embargo, cuando bloqueaba, el workflow no conservaba sus checks y el comentario automático del PR mostraba únicamente `RESULTADO_NO_GENERADO`.

Esa falta de evidencia impedía distinguir con certeza entre:

- una referencia retirada todavía activa;
- un token prohibido demasiado amplio;
- un owner ausente;
- un archivo requerido faltante;
- una contradicción de workflow, rama, proyecto o canal.

## Clasificación

`VALIDATOR_STALE`

El validador detectaba el bloqueo, pero el pipeline descartaba la evidencia necesaria para corregir la causa exacta.

## Implementación

### Preflight

`tools/orbit360-validar-gate-contracts-v20260717.mjs` ahora genera siempre:

`orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json`

El archivo contiene únicamente:

- gateId;
- estado y clasificación;
- totales aprobados/fallidos;
- IDs de checks fallidos;
- rutas y tokens del contrato;
- banderas `containsPII:false` y `containsSecrets:false`.

No contiene credenciales, UID, correos, datos de clientes, documentos ni payloads del tenant.

### Workflow

El mismo workflow:

- incluye la evidencia del preflight en el artefacto sanitizado;
- la muestra en el resumen;
- la usa en el comentario automático del PR cuando el runtime no se ejecutó;
- mantiene omitidas todas las etapas posteriores si el preflight falla.

### Registro

El contrato se actualizó a `1.0.4` con:

- `preflightEvidence` explícito;
- estado `ACTIVE_DIAGNOSTIC_PREFLIGHT`;
- regla de que no se corrige runtime sin conservar primero la evidencia exacta del preflight.

## Archivos funcionales no modificados

- Auth y Legal;
- backend LAB y Firestore;
- Cliente 360 y Aseguradoras;
- Orbit.store y adaptadores;
- datos, importadores y rules.

## Claude

- `REPLICABLE_CLAUDE_ACUMULADO`: todo gate bloqueante debe conservar evidencia estructurada de su primer fallo.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: workflow, secrets, Firebase y detalles del entorno LAB.
- Patrón reusable: un pipeline fail-closed debe ser también observable; bloquear sin explicar el check exacto genera correcciones por síntomas.

## Academia

`ACADEMIA_ACTUALIZAR` con la diferencia entre:

- bloquear correctamente;
- diagnosticar correctamente;
- publicar evidencia sanitizada sin exponer datos ni secretos.

## Siguiente acción exacta

Leer los IDs fallidos del preflight `1.0.4`. Solo entonces:

- retirar una referencia si es realmente un artefacto activo prohibido; o
- corregir el contrato si el token es obsoleto o demasiado amplio.

No se ejecuta Firebase, navegador, revisión visual ni producción mientras el estado no sea `GO_GATE_CONTRACT`.
