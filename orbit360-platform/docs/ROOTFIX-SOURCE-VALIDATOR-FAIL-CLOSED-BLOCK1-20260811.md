# Rootfix source validator fail-closed Block 1 — 2026-08-11

## Hallazgo
El run source de preparación `31511643685` mostró una inconsistencia entre el estado combinado del commit y la conclusión real del job. El job `93846644374` falló en `Validate exact segmented-bootstrap visual package`, aunque el contexto `orbit360/block1-final-native-visual-source` quedó publicado como success.

## Clasificación
`VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`.

## Causa raíz A — handoff canónico incompleto
La implementación `tools/orbit360-block1-final-native-matrix-v20260811.mjs` ya producía `bootstrapSyntheticPass` en modo validate-only, pero `tools/orbit360-block1-native-matrix-v23-canonical-v20260807.mjs` no propagaba ese resultado en su salida canónica. El workflow nuevo exigía correctamente el campo al wrapper y por eso el `jq` falló.

## Causa raíz B — publicación no fail-closed
El paso `Publish source status` se ejecutaba con `if: always()` y podía leer el archivo de evidencia PASS ya persistido en el checkout. Si una etapa anterior fallaba y `Seal` quedaba skipped, el publicador no distinguía evidencia heredada de evidencia generada en el run corriente y podía publicar success falso.

## Rootfix
1. El wrapper canónico importa `syntheticBootstrapNavigationContract`, expone los owners de bootstrap a nivel canónico y publica `bootstrapSyntheticPass` + detalle sintético en validate-only.
2. El source workflow valida por separado implementación y wrapper canónico.
3. `Seal` tiene id explícito y sella `head == GITHUB_SHA` y `sourceRunId == GITHUB_RUN_ID`.
4. El publicador solo puede publicar success si `steps.seal.outcome == success`, el estado previo del job sigue success y la evidencia corresponde exactamente a `context.sha`.
5. Si `Seal` no ocurre, el estado observable queda failure aunque exista una evidencia PASS antigua en el checkout.
6. El artifact de source solo se sube si `Seal` terminó success; no se vuelve a publicar evidencia heredada como si fuera del run actual.

## Seguridad
Source-only. No secretos, Firebase, browser, Hosting, Firestore/Auth/operational writes, Functions, Rules, reimportación, producción, main ni merge.

## Anti-bucle
Este es el único rootfix permitido después del primer fallo de esta etapa. Si el siguiente run source vuelve a fallar en la misma etapa/familia, se aplica `STOP_RETRY` sin tercer parche ni ejecución.

## Claude / Academia
`REPLICABLE_CLAUDE_ACUMULADO`: los wrappers deben propagar campos de evidencia que el gate consume; un status `always()` debe ser fail-closed y distinguir evidencia producida en el run actual de evidencia versionada heredada.

`ACADEMIA_ACTUALIZAR`: un estado verde de commit no sustituye la conclusión real del job cuando el propio publicador forma parte de lo auditado.
