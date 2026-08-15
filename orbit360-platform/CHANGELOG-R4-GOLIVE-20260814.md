# CHANGELOG R4 GO-LIVE · 2026-08-14 / 2026-08-15

## R4 prepublish · 2026-08-14

Autorización recibida para backup/rollback, publicación en `app.aysseguros.com` y E2E productivo usando únicamente el paquete R3 certificado.

### Package integrity

- ZIP: `orbit360-fase-a-product-r3-4f70f0dd6e87.zip`;
- SHA256: `4fd52a748fa130fd069b2d2684e1944369164aeb0646fe728067dd7b4ce29e69`;
- source head: `4f70f0dd6e870e8c7443a7638a9dc6e954eace1b`;
- rebuild: no.

## Publicación manual · 2026-08-15

Paula cargó y extrajo el paquete exacto en `/home/ayssegur/public_html/app.aysseguros.com`.

`https://app.aysseguros.com` mostró el login productivo Orbit 360. El manifest publicado coincide con R3 y fileCount 194.

## R4 browser frontier #1

Run `31903805595`, job `95058471779`.

Pre-browser PASS; browser cancelado por timeout del harness.

Clasificación:

`PIPELINE_MECHANISM_FAILURE / R4_HARNESS_UNBOUNDED_BROWSER_AWAIT_AND_FINAL_ONLY_EVIDENCE`

## Rootfix bounded observability · source-only PASS

Rootfix `442ca5fc5a6ca6f70e7607daaa108ee0b84d8956`.

Run `31907519696`, job `95067552998`: SUCCESS.

- gate PASS;
- forced-hang watchdog PASS;
- evidencia incremental PASS;
- global deadline 480000 ms;
- auth asset SHA check incorporado antes de credenciales;
- secrets/browser/data skipped;
- writes 0.

## R4 browser frontier #2 · FAIL clasificado

Activación `9150d249e6eeeb1962d0831a541e18737e35b7e3`.

Run `31907938110`, job `95068560384`.

PASS antes del fallo:

- gate;
- protected identity bind;
- identity resolver read-only;
- 1 actor elegible;
- roles requeridos presentes;
- target HTTPS 200;
- login visible;
- manifest 200 + source R3 exacto;
- resolver writes 0.

Primer fallo:

`/core/auth.js` → HTTP 500 en stage `auth-asset-validated`.

Login no fue enviado. Auth, `emailVerified`, browser membership y runtime no fueron evaluados.

Clasificación inicial:

`ENVIRONMENT_FAILURE / R4_PUBLISHED_AUTH_ASSET_MISMATCH`

Artifact `9252867826`.

## Refreeze anti-bucle

Commit `6c15b7ccaee4a56be50912148470949e9a28317b`.

Control run `31908033440`, job `95068778079`: SUCCESS source-only; install/secrets/identity/browser skipped.

## Diagnóstico HTTP-only del patrón de assets · 2026-08-15

Commit `474e022382920382f6e0f408038d4734908521ec`.

Run `31908342723`, job `95069516527`: SUCCESS como mecanismo source-only.

Artifact `9252961845`, digest `sha256:0ac94926266abff0cf6c219b565fe334b10f013deb51d889e0f8cef4d4909932`.

Controles:

- canonical gate PASS;
- watchdog PASS;
- cache bypass/no-store;
- browser false;
- secrets false;
- data access false;
- Firestore/Auth/operational writes 0;
- deploy false;
- package rebuild false.

### Assets neutros — PASS exacto R3

- `core/config.js`: HEAD 200 / GET 200 / SHA exacto R3;
- `core/legal.js`: HEAD 200 / GET 200 / SHA exacto R3;
- `core/access-scope.js`: HEAD 200 / GET 200 / SHA exacto R3.

### Assets ligados a autenticación/credenciales — FAIL Apache idéntico

- `core/auth.js`: HEAD 500 / GET 500;
- `core/auth-password-change-v20260805.js`: HEAD 500 / GET 500;
- `core/user-credential-selfservice-v20260805.js`: HEAD 500 / GET 500.

Los tres GET 500 retornan `text/html; charset=iso-8859-1`, 712 bytes, `server: Apache` y la misma firma de cuerpo `07e2c9e80962ab9ff4072c4d192e5b5e51d993d7e100c5af563c2eeff21cc002`.

El source R3 no contiene `orbit360-platform/.htaccess`.

Clasificación machine-readable:

`ENVIRONMENT_FAILURE / R4_CORE_STATIC_DELIVERY_BROADER_FAILURE`

Interpretación: no hay evidencia de corrupción general del paquete. La entrega Apache/hosting discrimina múltiples assets de autenticación/credenciales. La familia de owner es regla/handler/security policy/metadata del hosting. El ID exacto de una regla ModSecurity no está probado aún y requiere log/audit server-side.

## Siguiente gate

Mantener browser R4 congelado source-only. Obtener evidencia server-side para los tres HTTP 500 reproducibles e identificar regla/directiva exacta. No desactivar seguridad globalmente; preferir whitelist puntual para `app.aysseguros.com` si se demuestra un falso positivo.

Antes de reabrir browser/Auth deben pasar:

- los tres assets afectados HTTP 200;
- SHA-256 exacto contra R3;
- cero cambio en producto/paquete/datos;
- evidencia sanitizada del rootfix del hosting.

Avance permanece 100% funcional / 75% técnico / 67% gates hasta `POST_GO_LIVE_SMOKE_PASS`.
