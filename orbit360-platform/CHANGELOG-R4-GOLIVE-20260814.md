# CHANGELOG R4 GO-LIVE · 2026-08-14 / 2026-08-15

## R4 prepublish · 2026-08-14

Autorización recibida para backup/rollback, publicación en `app.aysseguros.com` y E2E productivo usando únicamente el paquete R3 certificado.

### Package integrity

- ZIP: `orbit360-fase-a-product-r3-4f70f0dd6e87.zip`;
- SHA256: `4fd52a748fa130fd069b2d2684e1944369164aeb0646fe728067dd7b4ce29e69`;
- rebuild: no.

## Publicación manual · 2026-08-15

Paula cargó y extrajo el paquete exacto en `/home/ayssegur/public_html/app.aysseguros.com`.

Capturas confirmaron estructura raíz correcta y `https://app.aysseguros.com` mostró el login productivo Orbit 360. HostDime/hostname dejó de ser bloqueo para el smoke general de publicación.

## Auth humano observado

Un intento humano mostró el mensaje genérico de login. No se clasificó como contraseña incorrecta porque el owner productivo encapsula Auth, `emailVerified`, membership y activación en el mismo mensaje.

## R4 smoke productivo · frontera 1

Workflow `Orbit360 R4 Production Readonly Smoke 20260815`.

Run `31903805595`, job `95058471779`, HEAD `5c12be143b6241a0af335d78f227c0ad14b05008`.

PASS antes del browser: gate canónico, identidad protegida vinculada, resolver read-only, 1 actor elegible, roles requeridos presentes y 0 writes del resolver.

El browser permaneció activo hasta el timeout global y no produjo JSON final. Clasificación:

`PIPELINE_MECHANISM_FAILURE / R4_HARNESS_UNBOUNDED_BROWSER_AWAIT_AND_FINAL_ONLY_EVIDENCE`

No se atribuyó a producto/Auth por falta de evidencia de etapa.

## Freeze de recuperación

HEAD `73a9cfc6d0ae6d430919aa32fcc0be7871b94740` activó `ORBIT360_R4_SOURCE_ONLY_RECOVERY=true`.

Control run `31904861893`: SUCCESS con install/secrets/identity/browser skipped.

## Rootfix bounded observability · source-only PASS · 2026-08-15

Rootfix HEAD `442ca5fc5a6ca6f70e7607daaa108ee0b84d8956`.

Cambios restringidos al harness R4 y su workflow:

- deadline global 480000 ms;
- timeouts por stage;
- checkpoints y JSON incremental sanitizado;
- finalización signal-safe/bounded;
- watchdog sintético forced-hang;
- hash SHA-256 de `core/auth.js` publicado vs source R3 antes de credenciales.

Run `31907519696`, job `95067552998`: **SUCCESS**.

- canonical source gate PASS;
- synthetic watchdog PASS;
- forced timeout 120 ms observado;
- evidencia persistida antes del timeout;
- install skipped;
- secrets skipped;
- identity skipped;
- browser skipped;
- Firestore/data access 0;
- writes 0;
- productionTouched=false.

Artifact `9252752191`, digest `sha256:ffcf24398a445fdc13cc80b9ac2d91fa151b5fd7731d5b6510fadf1087a65421`.

## R4 smoke productivo · frontera 2 · fallo clasificado

Activación HEAD `9150d249e6eeeb1962d0831a541e18737e35b7e3`.

Run `31907938110`, job `95068560384`: **FAIL clasificado**.

PASS previos:

- canonical gate PASS;
- install PASS;
- protected identity bind PASS;
- identity resolver PASS;
- `eligibleSmokeIdentityCount=1`;
- `authUserCount=9`;
- `membershipCount=8`;
- roles requeridos presentes;
- resolver Firestore writes `0`;
- resolver operational writes `0`;
- navegación HTTPS PASS, HTTP 200;
- login form visible;
- manifest HTTP 200;
- manifest status `FASE_A_PRODUCT_R3_DURABLE_PACKAGE_CERTIFIED`;
- source head exacto;
- fileCount `194`.

Primer fallo terminal válido:

- stage: `auth-asset-validated`;
- `/core/auth.js`: HTTP `500`;
- SHA-256 publicado: no comparable/mismatch por respuesta 500;
- `authHttp.seen=false`;
- login no fue enviado;
- runtime no fue evaluado.

Clasificación:

`ENVIRONMENT_FAILURE / R4_PUBLISHED_AUTH_ASSET_MISMATCH`

No demuestra contraseña incorrecta, email no verificado, membership defectuosa ni defecto funcional del runtime.

Artifact `9252867826`, digest `sha256:854906ce4618e24f1c1c7c004ecf608b5919849637fdac1c1a8104a4299951e5`.

## Refreeze posterior al fallo

HEAD `6c15b7ccaee4a56be50912148470949e9a28317b` reactiva `ORBIT360_R4_SOURCE_ONLY_RECOVERY=true`.

Control run `31908033440`, job `95068778079`: **SUCCESS source-only**.

- gate PASS;
- watchdog PASS;
- install skipped;
- secrets skipped;
- identity skipped;
- browser skipped;
- deploy 0;
- productionTouched=false.

## Siguiente owner

No es Auth todavía. El siguiente diagnóstico pertenece a la capa de entrega HTTP de assets productivos.

Aislar `/core/auth.js` con requests directos no-store y compararlo contra assets hermanos de `/core` y contra el source/paquete R3. Determinar si el 500 proviene de regla/handler/seguridad/permisos del hosting o de integridad/entrega del archivo.

No modificar contraseña, usuarios, memberships, `core/auth.js`, paquete, datos, main ni merge antes de demostrar el owner.

Avance permanece 100% funcional / 75% técnico / 67% gates hasta `POST_GO_LIVE_SMOKE_PASS`.
