# CIERRE M6 — RECOVERY 6.1.4 / VALIDATOR_STALE

Fecha: 2026-07-30  
Gate único: `block6-go-live-product-v20260730`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Necesidad

Recuperar M6 desde el estado fail-closed posterior a los incidentes 6.1.0/6.1.2, con Firestore read-only + Hosting, readiness acotado, smoke de tres roles, integridad before/after y rollback automático. Storage permanecía diferido fail-closed.

## Ejecución autorizada

Request inmutable: `tools/orbit360-m6-recovery-request-v20260730.json`  
Commit disparador: `b8c8c651de062e77622230074ee89674972d7959`  
Run: `30519954902`  
Artifact recovery: `8750370291`  
Digest artifact: `sha256:f61bf7b95a1bc68c9d6d17ad5ef2b76270cdcc9e3aa485b6af5ae82a2a9449b5`

## Avance visible

Antes del smoke, el recovery confirmó:

- preflight canónico 6.1.4: PASS;
- identidad/configuración Web: PASS;
- snapshot before: PASS;
- clientes: 414;
- aseguradoras: 26;
- asesores fuente: 7;
- membership: 1;
- config: 1;
- shell productivo efímero: PASS;
- Firebase deploy Firestore Rules read-only + Hosting: PASS;
- Hosting readiness acotado: PASS HTTP 200;
- Storage: fuera del deploy / diferido fail-closed.

Versión Hosting creada por el deploy: `24e2410260805bef`.

## Fallo observado

El smoke terminó en etapa `login` con:

```text
page.waitForFunction: Timeout 30000ms exceeded
```

No se demostró un fallo funcional del producto antes de corregir.

## Clasificación

`VALIDATOR_STALE`

## Causa raíz

Archivo: `tools/orbit360-m6-product-browser-smoke-v20260730.mjs`  
Función/owner: espera de arranque posterior al login.

La llamada pretendía un timeout de 60 segundos:

```text
waitForFunction(fn, { timeout: 60000, polling: 100 })
```

Pero Playwright define esa API como `waitForFunction(pageFunction, arg?, options?)`. El objeto se estaba enviando como `arg`; las opciones no se aplicaban y Playwright usaba su timeout por defecto de 30 segundos, coincidente exactamente con la evidencia.

## Seguridad y rollback

Al no cerrar el smoke, el mismo bloque autorizado ejecutó rollback automático:

- Firebase rollback: PASS;
- Hosting rollback version: `95784955f9cf5e0b`;
- rollback readiness: PASS HTTP 200;
- Firestore: deny-all;
- Hosting: shell neutro;
- Storage: no activo / inexistente;
- producción funcional: no live.

## Integridad de datos

Snapshot after e integridad: PASS.

```text
conteos estables: true
digests estables: true
Firestore data writes: 0
operational writes: 0
network write candidates: 0
```

No se reimportaron clientes ni aseguradoras. No se tocaron Pólizas.

## Fix

Validador corregido y versionado:

- `schemaVersion`: `orbit360-m6-product-browser-smoke-v2`;
- `validatorRevision`: `20260730.2`;
- próxima candidata de recovery: `6.1.6`;
- firma corregida: `waitForFunction(fn, undefined, { timeout: 60000, polling: 100 })`;
- diagnóstico sanitizado de login agregado para futuros timeouts.

También se preserva la lectura contractual de `steps.<id>.outcome`; con `continue-on-error`, la apariencia visual del step no sustituye el outcome real ni la evidencia del smoke.

## Prueba del fix

Gate congelado en fase estática `6.1.5`, cero capacidades.

Run de validación estática: `30520801419`.

Resultado:

```text
static preflight: PASS
job productivo 6.1.6: SKIPPED
secret access: false
Firestore read/write: false / 0
browser/runtime: false
Rules/deploy/production: false
```

## Reutilización

Registrado en:

- `LEDGER-M6-FIXES-REUTILIZABLES-PROTOTIPO-CLAUDE-ACADEMIA-20260730.md`;
- `ACADEMIA-M6-CAUSA-RAIZ-READINESS-ROLLBACK-20260730.md`.

Patrones reutilizables:

- validar firmas reales de APIs de automatización;
- diferenciar `outcome` de presentación bajo `continue-on-error`;
- diagnosticar timeout sin asumir defecto funcional;
- congelar producto cuando el instrumento está obsoleto;
- corregir validador antes de reabrir riesgo;
- mantener rollback fail-closed e integridad de datos.

## Estado

```text
M6 6.1.4: ROLLED_BACK_SAFE
causa raíz: CERRADA
6.1.5 static remediation: PASS
6.1.6: PREPARADO / INERTE
request 6.1.6: AUSENTE
producción: FAIL-CLOSED
Pólizas: BLOQUEADAS hasta cerrar M6
```

La autorización 6.1.4 fue consumida y no se reutiliza. Una nueva transición productiva 6.1.6 requiere una autorización explícita única porque vuelve a abrir deploy/producción después del rollback.
