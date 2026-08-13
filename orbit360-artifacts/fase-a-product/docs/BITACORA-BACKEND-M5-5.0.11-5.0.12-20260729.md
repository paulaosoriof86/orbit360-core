# Bitácora backend — M5 5.0.11 y 5.0.12

Fecha: 2026-07-29

## Bloque

Runtime smoke LAB de RC `f6dfa37e…`, stop-line por membership no proyectada, diagnóstico de causa raíz y remediación estática Access con nueva RC `ae6bb2a3…`.

## Carriles

- **A — frontend/UX/Academia:** la UI mantiene selector multirol fail-closed; no se habilitó revisión visual.
- **B — backend/seguridad:** runtime read-only, snapshots antes/después, proyección membership genérica y cero escrituras.
- **C — datos reales:** 414 clientes, 26 aseguradoras, 7 asesores y destino 1/1/414/26 preservados; no hubo reimportación.

## Avance visible

1. Package runtime 5.0.11 cerró verde sin secretos.
2. Se creó request inmutable y se ejecutó exactamente un navegador/runtime.
3. Snapshot antes y después pasó 11/11; siete conteos y siete digests permanecieron idénticos.
4. Bootstrap normalizado, autenticación y legal fueron alcanzados.
5. Primer fallo funcional: `MEMBERSHIP_BOUNDARY_NOT_ACTIVE` antes de vistas por rol.
6. Se consumió la autorización y no se repitió el navegador.
7. Se diagnosticó que Access requería `Orbit.auth.productUser`, pero LAB solo aportaba identidad Firebase básica.
8. Se descartó restaurar el guard legado con rol/asesor hardcodeados.
9. `access-role-session-owner` v`20260729.3` proyecta membership autenticada read-only.
10. Gate estático 5.0.12 cerró verde y produjo RC `ae6bb2a3…`.

## Fuente/base

- Hosting 5.0.10: RC `f6dfa37e…`, paridad 25/25.
- Runtime package: run `30457621192`, artifact `8726195633`.
- Runtime request: commit `136cca57600c0aef146ad5b121aeb746a7d0dd4c`.
- Runtime: run `30457847993`, artifact `8726316517`.
- Stop-line: `runtime-gate-crm-v20260716/m5-runtime-smoke-511-attempt-closure.json`.
- Static verification final: run `30460202680`, artifact `8727238222`.

## Diagnóstico de causa raíz

### Access / membership

- Necesidad: multirol, scopes y advisor deben derivarse de membership autenticada.
- Esperado: LAB resuelve una membership canónica y construye una proyección read-only.
- Causa: `core/auth.js` exponía identidad Firebase, mientras `access-role-session-owner` solo acepta `Orbit.auth.productUser` en un entorno que exige membership.
- Incompatibilidad legacy: `backend-lab-auth-guard.js` intenta un rol/asesor fijo; el owner actual lo rechaza correctamente por no provenir de membership.
- Clasificación: `FUNCTIONAL_DEFECT` + `DATA_CONTRACT_FAILURE`.

### Corrección

`core/access-role-session-owner-v20260728.js` v`20260729.3`:

- deriva tenant del runtime;
- deriva UID del usuario Firebase autenticado;
- lee `tenants/{tenantId}/members/{authenticatedUid}` con `.get()`;
- normaliza roles, default/active role, advisor, team, countries, scopes y módulos;
- valida tenant, UID, estado y roles;
- proyecta solo `Orbit.auth.productUser`;
- permanece fail-closed si membership falta o es inválida;
- no escribe membership ni backend;
- no introduce hardcodes A&S.

No se modificaron:

- `data/store.js`;
- `data/store-firestore-lab.local.js`;
- `core/auth.js`;
- `core/backend-lab-init.js`;
- `core/backend-lab-loader.js`;
- `core/backend-lab-auth-guard.js`;
- `core/importa.js`;
- `firestore.rules`.

## Pipeline 5.0.12

Hubo incidentes del mecanismo durante el cierre estático. No fueron defectos adicionales del producto:

- fixture/validator obsoleto;
- workflow con self-scan autorreferencial;
- checkout superficial sin commit histórico para diff.

Después de repetición de la misma etapa se detuvieron reintentos ciegos, se congelaron cambios funcionales y se corrigió el mecanismo. La seguridad del workflow se movió a `tools/orbit360-m5-membership-projection-512-workflow-safety-v20260729.mjs` y la comparación histórica usa checkout completo.

Todos esos intentos permanecieron sin secretos, Firestore real, navegador, runtime o deploy.

## Pruebas/evidencia

```txt
Runtime 5.0.11 preflight: 17/17
Runtime 5.0.11 contract: 42/42
Snapshots: 11/11 + 11/11
Counts stable: true
Digests stable: true
Firestore writes: 0
Operational writes: 0

Static 5.0.12 workflow safety: 13/13
Static 5.0.12 preflight: 36/36
Membership fixture: 23/23
Protected files unchanged: true
```

## Estado

```txt
RC anterior: f6dfa37ec1449b627c04cde2caf7d3c43acfe453fb0a7eb73924861bb4e7d324
RC nueva: ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61
Critical assets: 42/42
LAB: 24/25
Mismatch: core/access-role-session-owner-v20260728.js
```

## Acumulado Claude

- Proyección genérica identidad → membership → roles/scopes/advisor: `REPLICABLE_CLAUDE_ACUMULADO`.
- Fail-closed sin membership y prohibición de fallback hardcodeado: `REPLICABLE_CLAUDE_ACUMULADO`.
- Firebase, paths reales, gates, artifacts y workflows: `BACKEND_PROTEGIDO_NO_CLAUDE`.

## Impacto Academia

Actualizar de forma acumulada:

- identidad Auth no equivale a autorización/membership;
- roles, scopes y advisor nacen de membership;
- membership ausente/inválida cierra acceso;
- fixtures deben cubrir caso válido, faltante e inválido;
- un pipeline rojo no equivale a defecto funcional ni a escritura durable;
- validadores de workflow no deben ser autorreferenciales.

## Pendiente

Hosting LAB de RC `ae6bb2a3…` requiere una autorización nueva e independiente. Runtime, revisión visual y Pólizas permanecen bloqueados.

## Siguiente acción exacta

Una única entrega Hosting LAB de RC `ae6bb2a3…`, seguida de paridad pública 25/25. Solo después podrá solicitarse otro runtime smoke independiente.
