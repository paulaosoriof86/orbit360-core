# HISTORICAL INCIDENT EVIDENCE — NOT CURRENT STATE AUTHORITY

# Rootfix — Source-write guard semántico — 2026-08-25

## Incidente

El run source-only `32891163228` falló antes de cualquier mutación canónica durante `CONTROL_PLANE_REGRESSION_REOPEN`. El owner, ledger y evidencia de la regresión cumplían sus contratos; el rechazo provenía del guard activo de reescritura de fuente.

Clasificación: `VALIDATOR_STALE` dentro de `PIPELINE_MECHANISM_FAILURE`.

## Causa raíz

El guard anterior trataba la mera presencia de infraestructura temporal —por ejemplo `os.tmpdir()`— como evidencia de reescritura de código fuente. El nuevo transition-precondition owner usa legítimamente un worktree scratch aislado, por lo que el heurístico context-free producía un falso bloqueo.

## Rootfix

1. El guard activo valida operaciones reales de escritura/copia/rename dirigidas a `.js/.mjs/.cjs`; no considera temporales o worktrees evidencia de mutación por sí solos.
2. `tools/orbit360-source-write-guard-behavioral-selftest-v20260825.mjs` prueba obligatoriamente:
   - infraestructura temporal + worktree scratch permitidos;
   - una escritura real inyectada hacia fuente `.mjs` es rechazada;
   - cleanup del worktree scratch.
3. `tools/orbit360-control-plane-transition-precondition-owner-v20260825.mjs` ejecuta ese selftest antes de simular `CONTROL_PLANE_REGRESSION_REOPEN`; no puede devolver PASS si el guard conductual falla.
4. El mismo owner conserva la simulación del owner canónico sobre scratch y verifica que el ledger canónico no cambie.
5. En fallo, el contrato JSON sigue saliendo por stdout y se replica sanitizado a stderr para observabilidad causal en GitHub Actions.
6. Semantic contract y writer registry declaran el selftest y las políticas de infraestructura temporal permitida / source-write real prohibido.
7. Macro3 consume el mismo transition-precondition owner en el estado terminal de mecanismo; por tanto no mantiene una segunda implementación del predicado.

## Alcance

Solo control-plane, validadores y documentación. No modifica candidata `9504702901`, producto, datos reales, Auth funcional, Firestore, provider, navegador, deploy, producción, main ni merge.

## Gate de salida

La reparación solo se considera cerrada con evidencia source-only de la secuencia completa:

`REGRESSION_REOPEN -> CONTROL_PLANE_SELFTEST -> durable handshake -> CONTROL_PLANE_HARDENING_CLOSE`

Sin reruns. Un fallo activa STOP_RETRY y diagnóstico causal.

## Carriles

- A frontend/UX/Academia: congelado.
- B backend/seguridad/gates: rootfix de mecanismo.
- C datos reales/migración: congelado.

Clasificación Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.
