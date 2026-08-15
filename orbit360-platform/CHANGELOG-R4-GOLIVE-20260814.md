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

PASS antes del browser:

- gate canónico;
- identidad protegida vinculada;
- resolver read-only;
- 1 actor elegible;
- roles requeridos presentes;
- 0 writes del resolver.

El browser step permaneció activo desde `19:24:57Z` hasta `19:44:28Z` y fue cancelado por timeout global. El artifact `9252029652` solo contiene preflight + identity summary; falta el JSON browser final.

Clasificación:

`PIPELINE_MECHANISM_FAILURE / R4_HARNESS_UNBOUNDED_BROWSER_AWAIT_AND_FINAL_ONLY_EVIDENCE`

No se atribuye a producto/Auth por falta de evidencia de etapa.

## Freeze de recuperación

HEAD `73a9cfc6d0ae6d430919aa32fcc0be7871b94740` activa `ORBIT360_R4_SOURCE_ONLY_RECOVERY=true`.

Control run `31904861893`: SUCCESS.

- gate PASS;
- install skipped;
- secrets skipped;
- identity skipped;
- browser skipped.

Próxima acción: rootfix source-only del harness con deadline, async timeouts y evidencia incremental. Sin producto, rebuild, reimportación, main ni merge.

Avance permanece 100% funcional / 75% técnico / 67% gates.
