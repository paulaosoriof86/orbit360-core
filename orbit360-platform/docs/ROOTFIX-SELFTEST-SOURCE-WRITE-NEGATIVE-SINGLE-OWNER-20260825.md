# HISTORICAL INCIDENT EVIDENCE — NOT CURRENT STATE AUTHORITY

# Rootfix — selftest source-write negative con owner único — 2026-08-25

## Incidente

El run source-only `32894311783` ejecutó correctamente el guard semántico, el exact F2 source path, evidencia class-wide, scratch transitions, pre-provider gate, CAS readback, STOP_RETRY, topology negatives, publication surface, run-id binding, runtime register read-only y router nativo. Falló únicamente porque `sourceRewriteMutationNegativePass` seguía siendo calculado por una fixture histórica duplicada dentro del selftest principal.

Clasificación: `VALIDATOR_STALE:SELFTEST_NEGATIVE_SOURCE_WRITE_ASSERTION_OLD_REASON_CODE` dentro de `PIPELINE_MECHANISM_FAILURE`.

## Causa raíz

El guard canónico evolucionó de una heurística `ACTIVE_SOURCE_REWRITE_FORBIDDEN` a una semántica de escritura real `ACTIVE_SOURCE_WRITE_FORBIDDEN`, pero `tools/orbit360-control-plane-selftest-v20260824.mjs` conservaba una segunda implementación del test negativo que:

1. modificaba temporalmente `register`;
2. volvía a ejecutar el guard;
3. interpretaba directamente el reason-code histórico.

La fixture duplicada podía divergir del owner conductual aunque el guard real funcionara correctamente.

## Rootfix

1. El único owner del test negativo es `tools/orbit360-source-write-guard-behavioral-selftest-v20260825.mjs`.
2. El selftest principal ejecuta ese owner y deriva de su contrato machine-readable:
   - `sourceWriteGuardBehavioralPass`;
   - `temporaryInfrastructureAllowedPass`;
   - `actualSourceWriteNegativePass`;
   - `sourceRewriteMutationNegativePass` queda solo como alias de compatibilidad, verdadero únicamente si las tres pruebas anteriores pasan.
3. Se eliminó del selftest principal la mutación duplicada de `register` y la interpretación del reason-code del guard.
4. Semantic contract v10 exige un único owner y prohíbe fixtures negativas duplicadas.
5. Writer registry v17 registra el mismo owner y la delegación obligatoria.
6. Macro3 ejecuta el owner canónico, exige los tres resultados y valida que contract + registry apunten al mismo owner.

## Alcance

Solo control-plane, validadores y documentación. No modifica candidata `9504702901`, producto, datos reales, Auth funcional, Firestore, provider, navegador, deploy, producción, main ni merge.

## Estado histórico de la prueba que motivó el rootfix

Run `32894311783`: FAILURE source-only. Todos los pasos posteriores al selftest quedaron skipped. Cero runtime, browser, secrets, Firestore, writes, deploy o producción.

## Gate de salida

No hay rerun del run fallido. Tras canonizar este rootfix se permite un único `CONTROL_PLANE_SELFTEST` fresco desde el mismo estado 48/42. Solo un PASS con handshake durable habilita `CONTROL_PLANE_HARDENING_CLOSE`.

Clasificación Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.
