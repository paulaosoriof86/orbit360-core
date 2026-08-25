# ROOTFIX F2 — Provider current-step env binding — 2026-08-25

## Clasificación

`PIPELINE_MECHANISM_FAILURE`

Código observado en F2 run `32902848794`:

`PIPELINE_MECHANISM_FAILURE:IDENTITY_CONTEXT_NOT_BOUND`

## Necesidad y esperado

El provider read-only debe recibir el path de credenciales únicamente después del gate F2 GO y antes de cualquier lectura de Auth/Firestore. La autorización one-shot no puede gastarse por una diferencia entre la semántica de `$GITHUB_ENV` y el entorno del proceso actual.

## Causa raíz

El workflow crea un archivo temporal de service account, escribe `GOOGLE_APPLICATION_CREDENTIALS=<path>` en el archivo indicado por `$GITHUB_ENV` y, dentro del mismo shell step, invoca `orbit360-m6-resolve-smoke-identity-readonly-v20260730.mjs`.

GitHub Actions publica las entradas de `$GITHUB_ENV` a steps posteriores. Esa escritura no actualiza automáticamente `process.env` del proceso que se ejecuta dentro del mismo step. El resolver exigía `process.env.GOOGLE_APPLICATION_CREDENTIALS`, por lo que fallaba cerrado antes de Auth/Firestore aunque el path ya estuviera registrado en el runner environment file.

## Fix

- Nuevo owner puro `tools/orbit360-current-step-env-resolver-v20260825.mjs`.
- Precedencia: `process.env` → archivo actual `$GITHUB_ENV` → fail closed.
- El resolver de identidad enlaza el valor encontrado al `process.env` actual antes de `applicationDefault()`.
- Se conserva causalidad sanitizada y observaciones monotónicas.
- Se restauró `byUid` para mantener intacto el fallback genérico previamente existente.
- `tools/orbit360-f2-validator-semantic-policy-audit-v20260825.mjs` ejecuta un selftest source-only que simula exactamente el caso de variable escrita en `$GITHUB_ENV` pero ausente del entorno actual.

## Evidencia

Terminal canónico run `32902848794`: FAIL/no-replay con cero writes, cero deploy y cero producción. El terminal preservó por primera vez la causa exacta `IDENTITY_CONTEXT_NOT_BOUND`.

## Impacto

No modifica candidata `9504702901`, módulos de producto, datos A&S, Auth/Firestore productivos, reglas, deploy, main ni merge. Es una corrección de mecanismo pre-provider.

## Academia

Actualizar la explicación de gates/runtime para distinguir entre: variable escrita para steps futuros, variable disponible en el proceso actual y evidencia causal de qué recurso llegó realmente a observarse.

## Clasificación Claude

`BACKEND_PROTEGIDO_NO_CLAUDE`

## Estado

Rootfix source-only preparado. Requiere reapertura canónica, selftest exact-path, handshake y cierre de hardening antes de aceptar una nueva autorización F2.
