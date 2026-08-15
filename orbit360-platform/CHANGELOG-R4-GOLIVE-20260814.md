# CHANGELOG R4 GO-LIVE · 2026-08-14 / 2026-08-15

## R4 prepublish · 2026-08-14

Autorización recibida para backup/rollback, publicación en `app.aysseguros.com` y E2E productivo usando únicamente el paquete R3 certificado.

### Package integrity

- ZIP: `orbit360-fase-a-product-r3-4f70f0dd6e87.zip`;
- SHA256: `4fd52a748fa130fd069b2d2684e1944369164aeb0646fe728067dd7b4ce29e69`;
- rebuild: no.

## Publicación manual · 2026-08-15

Paula cargó y extrajo el paquete exacto en `/home/ayssegur/public_html/app.aysseguros.com`.

Capturas confirmaron estructura raíz correcta y `https://app.aysseguros.com` mostró el login productivo Orbit 360. HostDime/hostname dejó de ser bloqueo para el smoke.

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

La recuperación del mecanismo queda cerrada. Auth humano continúa sin clasificar hasta una segunda frontera productiva válida. No se ejecuta esa frontera en la misma iteración.

Avance permanece 100% funcional / 75% técnico / 67% gates hasta `POST_GO_LIVE_SMOKE_PASS`.
