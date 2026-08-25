# HISTORICAL INCIDENT EVIDENCE — NOT CURRENT STATE AUTHORITY

# Rootfix F2 — validadores pre-provider ligados a literales — 2026-08-25

Este documento registra el diagnóstico y la corrección de la iteración asociada al run `32898203403`. No define el estado vivo, la siguiente acción ni una autorización. La autoridad operacional continúa siendo `orbit360-continuity-ledger-v20260820.json` y sus proyecciones canónicas.

## Clasificación causal

- Clasificación observada por el terminal: `PIPELINE_MECHANISM_FAILURE`.
- Clasificación causal corregida: `VALIDATOR_STALE`.
- Código causal: `VALIDATOR_STALE:F2_PREPROVIDER_VALIDATORS_BOUND_TO_IMPLEMENTATION_LITERALS`.
- Producto/candidata: sin defecto nuevo demostrado; artifact `9504702901` permanece congelado e intacto.

## Evidencia

El run `32898203403` persistió y aceptó correctamente un único intento F2. El request quedó con `runtimeAttemptAccepted=true`, `allowedExecutions=0`, `runtimeAttemptCount=1` y `runtimeRunId` ligado al run. El fallo ocurrió después, antes de provider/browser, porque `tools/orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs` exigía que el YAML contuviera literalmente `allowedExecutions==0`.

El contrato semántico vigente ya establecía `sourceTextMayNotProveBehavior=true` y `literalImplementationStringChecksForbidden=true`. Por tanto el problema era un validador obsoleto frente al contrato vigente, no ausencia del comportamiento one-shot.

El análisis de la misma familia detectó además que `tools/orbit360-f2-exact-candidate-source-validator-v20260819.mjs` infería comportamiento de rootfixes mediante tokens de implementación. Dejarlo intacto habría trasladado el mismo defecto a una etapa posterior.

## Implementación

1. `orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs` fue convertido a validación semántica/conductual basada en request aceptado, binding del run, certificación durable, contrato semántico, writer registry y owner canónico de topología del workflow.
2. `orbit360-f2-exact-candidate-source-validator-v20260819.mjs` conserva identidad de artifact, certificación, manifest, full rehash, archivos requeridos y entrypoints; ya no usa tokens internos para afirmar comportamiento funcional.
3. Se creó `orbit360-f2-validator-semantic-policy-audit-v20260825.mjs`, auditoría source-only que rechaza la reintroducción de estas comprobaciones literales.
4. Macro3 ejecuta esa auditoría. Como Macro3 forma parte del selftest ejecutado antes de consumir una autorización F2, una regresión de esta familia debe bloquear el proceso antes de materializar un nuevo one-shot.
5. No se modificó el workflow físico porque ya delega el gate source-only en el selftest/Macro3; duplicar la llamada en YAML habría creado un segundo owner de la misma política.
6. No se modificaron contrato ni writer registry porque ambos ya contenían la regla correcta; el defecto era incumplimiento del validador respecto de esas autoridades, no ausencia de política.

## Seguridad y efectos

- runtime: no ejecutado;
- browser: no ejecutado;
- secrets: no leídos;
- Firestore: no leído;
- writes: 0;
- deploy: no;
- producción: no;
- main/merge: no;
- replay: prohibido.

## Cierre metodológico

No corresponde rerun del run `32898203403`. El intento quedó consumido. La secuencia correcta es: canonizar este rootfix source-only → reabrir el control-plane mediante el owner existente usando la evidencia durable del run sellado → ejecutar selftest exacto → cerrar hardening → solamente después solicitar/usar una autorización F2 fresca.

## Clasificación para Claude y Academia

- Código/owners/gates: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Patrón reusable conceptual “behavioral evidence over implementation literals”: `REPLICABLE_CLAUDE_ACUMULADO`, únicamente como arquitectura/patrón, sin código protegido ni datos reales.
- Academia: `ACADEMIA_ACTUALIZAR`. Debe enseñar la diferencia entre `VALIDATOR_STALE` y defecto funcional, y que un validador no puede usar texto de implementación como prueba de comportamiento cuando existe un contrato semántico/conductual.

## Siguiente acción histórica de esta iteración

Canonizar el rootfix sin force y ejecutar `CONTROL_PLANE_REGRESSION_REOPEN` una sola vez desde el estado sellado 53/47, sin runtime ni autorización nueva.
