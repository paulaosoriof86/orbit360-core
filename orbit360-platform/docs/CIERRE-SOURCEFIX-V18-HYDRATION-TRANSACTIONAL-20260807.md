# Cierre sourcefix v18 · hidratación transaccional · 2026-08-07

## Bloque
Bloque 1 / gate visual post-Auth. Rootfix source-only previo a runtime v18.

## Clasificación
- Causa inmediata v17: `INICIO_REQUIRED_HYDRATION_TIMEOUT`.
- Causa profunda: `PIPELINE_MECHANISM_FAILURE / HYDRATION_PARTIAL_INSTALL_REENTRANCY_STATE_LOSS`.
- Secundaria: `VALIDATOR_STALE / STALE_MATRIX_EVIDENCE_CARRYOVER`.

## Fuente/base
HEAD autorizado: `b4a80c5ab7ca4e719e4e1050eedfb4669ffefdf8`.
Request v17 permanece consumido/frozen y no reutilizable.

## Implementación
1. Binding del owner original de `Orbit.store` separado del wrapping progresivo de módulos.
2. `originalStore` y `originalStatus` se capturan una vez por identidad real de store y sobreviven a instalaciones parciales.
3. Un cambio real de identidad de store reinicia el binding; un simple reintento parcial no lo hace.
4. `mounted()` exige owner válido, markers del store y wrappers de módulos completos.
5. Nuevo checkpoint de precheck: `HYDRATION_OWNER_VALID`.
6. El clasificador distingue pérdida de owner como `PIPELINE_MECHANISM_FAILURE`, no como falla de datos.
7. Cada runtime limpia `PRECHECK`, `MATRIX`, `SUPERVISOR`, `FINAL` y artifacts antes de leer secretos/ejecutar navegador.
8. El sealer ignora evidencia de matriz anterior cuando la matriz actual fue `skipped`.

## Evidencia source-only
`PASS_V18_TRANSACTIONAL_HYDRATION_RUN_EVIDENCE_SOURCE_ONLY`.

Fixture progresivo:
- módulos parciales → owner válido y snapshot canónico preservado;
- módulos restantes → instalación completa;
- ownerGeneration = 1;
- snapshotAttached = true;
- 430 consultas de asesor → 1 build antes de invalidación;
- una invalidación → build 2;
- writes = 0.

Suites rectoras: request/lifecycle, watchdog, Windows signal, signal-safe, cross-runner, preflight portable y transport base-SHA: PASS.

## Carriles
- A frontend/UX: readiness corregido source-only; falta runtime visual.
- B backend/control-plane: composición y evidencia por run corregidas sin tocar Auth/Rules/store Firestore.
- C datos/migración: sin reimportación ni escrituras.

## Estado
Sourcefix v18: PASS source-only. `PASS_VISUAL_POST_AUTH` todavía NO hasta ejecutar runtime autorizado.

## Siguiente acción exacta
Transición source→runtime-pending v18 sin secretos/runtime; luego un único request exclusivo e inmutable; `GO_GATE_CONTRACT` antes de secretos; solo con GO restore/backup/max 1 Hosting LAB deploy/precheck/matriz read-only. Cualquier STOP consume/freeze y rollback sin segundo intento.