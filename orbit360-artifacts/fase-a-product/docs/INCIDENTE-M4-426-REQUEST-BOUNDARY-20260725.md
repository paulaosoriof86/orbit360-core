# Incidente M4 4.2.6 — frontera del request

- Clasificación: `VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`.
- Run fallido: `30164487060`.
- Etapa: preflight antes de secretos.
- Check: `NO_REQUEST_IN_PACKAGE`.
- Causa raíz: el validador exigía ausencia del request durante una ejecución activada por ese mismo request.
- Reparación: contrato semántico con tres estados: request ausente, histórico consumido y activo ligado a `HEAD^`.
- Seguridad: cero secretos, Firestore, runtime y escrituras en el run fallido.
- Estado: reparación estática preparada; nueva ejecución requiere autorización independiente.
- Claude: `REPLICABLE_CLAUDE_ACUMULADO` solo como patrón de validadores, sin backend ni datos A&S.
- Academia: diferenciar presencia de archivo, vigencia de autorización y binding inmutable.
