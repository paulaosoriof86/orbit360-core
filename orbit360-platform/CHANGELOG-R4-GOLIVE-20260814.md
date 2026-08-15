# CHANGELOG R4 GO-LIVE · 2026-08-14 / 2026-08-15

## R4 prepublish · 2026-08-14

Autorización recibida para backup/rollback, publicación en `app.aysseguros.com` y E2E productivo usando únicamente el paquete R3 certificado.

### Package integrity

- ZIP: `orbit360-fase-a-product-r3-4f70f0dd6e87.zip`;
- SHA256: `4fd52a748fa130fd069b2d2684e1944369164aeb0646fe728067dd7b4ce29e69`;
- source head: `4f70f0dd6e870e8c7443a7638a9dc6e954eace1b`;
- rebuild: no.

## Publicación manual · 2026-08-15

Paula cargó y extrajo el paquete exacto en `/home/ayssegur/public_html/app.aysseguros.com`. `https://app.aysseguros.com` mostró el login y el manifest publicado coincidió con R3, fileCount 194.

## R4 browser frontier #1

Run `31903805595`, job `95058471779`: pre-browser PASS; browser cancelado por timeout.

`PIPELINE_MECHANISM_FAILURE / R4_HARNESS_UNBOUNDED_BROWSER_AWAIT_AND_FINAL_ONLY_EVIDENCE`

## Rootfix bounded observability

Rootfix `442ca5fc5a6ca6f70e7607daaa108ee0b84d8956`.

Run `31907519696`, job `95067552998`: SUCCESS source-only; gate/watchdog/evidencia incremental PASS, global deadline 480000 ms, secrets/browser/data skipped, writes 0.

## R4 browser frontier #2

Run `31907938110`, job `95068560384`.

PASS antes del fallo: gate, identidad protegida, resolver read-only, 1 actor elegible, roles requeridos, target 200, login visible, manifest R3 exacto, writes 0.

Primer fallo: `/core/auth.js` → HTTP 500 en `auth-asset-validated`. Login no fue enviado; contraseña, `emailVerified`, browser membership y runtime no fueron evaluados.

`ENVIRONMENT_FAILURE / R4_PUBLISHED_AUTH_ASSET_MISMATCH`

## Refreeze anti-bucle

Commit `6c15b7ccaee4a56be50912148470949e9a28317b`.

Control run `31908033440`, job `95068778079`: SUCCESS source-only; install/secrets/identity/browser skipped.

## HTTP-only diagnosis #1

Commit `474e022382920382f6e0f408038d4734908521ec`.

Run `31908342723`, job `95069516527`; artifact `9252961845`.

- `core/config.js`, `core/legal.js`, `core/access-scope.js`: GET 200 + SHA exacto R3;
- `core/auth.js`, `core/auth-password-change-v20260805.js`, `core/user-credential-selfservice-v20260805.js`: HEAD 500 / GET 500;
- los tres 500: Apache, HTML 712 bytes, misma firma;
- paquete R3 sin `orbit360-platform/.htaccess`.

`ENVIRONMENT_FAILURE / R4_CORE_STATIC_DELIVERY_BROADER_FAILURE`

## Evidencia cPanel

Capturas del 15-ago-2026 confirmaron:

- interfaz ModSecurity no expuesta en cPanel;
- Imunify360 expone solo Escáner de malware y Defensa proactiva, sin WAF/Incidents;
- Defensa proactiva indica que el modo lo establece el administrador del servidor;
- interfaz `Errores` sí disponible;
- mensajes visibles `AH01630: client denied by server configuration` apuntan a `/home/ayssegur/public_html/app.aysseguros.com/php.ini` y no a `auth.js`.

Por tanto, esos mensajes de `php.ini` no se usan para atribuir el fallo Orbit a una regla concreta.

## HTTP-only diagnosis #2 · FINAL

Workflow `Orbit360 R4 HTTP Sensitive Name Matrix 20260815`.

Commit `2862d283f5d29ba40646a56d0ad29fe4eee36af8`.

Run `31912332328`, job `95079202582`: SUCCESS como mecanismo. Artifact `9254004177`, digest `sha256:7e42593c463a85f9402609ce39ca62f74918765fd4d7e2fac2585045960de364`.

Gate canónico PASS. Sin secretos, browser, datos, deploy, rebuild ni writes.

Resultado ambiental:

- todos los assets probados, incluidos neutros, respondieron HEAD 200 con `server: Apache`, `content-type: text/html; charset=utf-8` y tamaño aproximado 11.9–12.1 KB;
- todos los GET terminaron `socket hang up`;
- por tanto la segunda matriz no permite distinguir nombres sensibles: una capa Apache/seguridad/edge está interceptando genéricamente las sondas automatizadas.

Clasificación:

`ENVIRONMENT_FAILURE / R4_HOSTING_SECURITY_EDGE_INTERCEPTION_GENERIC`

## STOP_RETRY y siguiente acción

Se consumieron dos diagnósticos HTTP de la misma familia. No ejecutar un tercero y no reabrir browser/Auth.

Siguiente owner: administración server-side de HostDime. Abrir un único caso técnico para `app.aysseguros.com`, aportar la cronología reproducible y pedir identificación del rule ID/directiva/handler/control exacto en Apache/ModSecurity/Imunify/audit logs. Corregir únicamente el falso positivo u owner demostrado; no desactivar seguridad globalmente.

Después del fix de hosting: una sola verificación HTTP-only exigiendo 200 + MIME JavaScript + SHA-256 exacto R3 para todos los assets afectados. Solo con PASS se reabre browser/Auth.

Avance permanece 100% funcional / 75% técnico / 67% gates hasta `POST_GO_LIVE_SMOKE_PASS`.
