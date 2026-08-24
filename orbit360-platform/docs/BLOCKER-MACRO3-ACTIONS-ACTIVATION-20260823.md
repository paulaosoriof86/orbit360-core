# BLOQUEO MACRO-3 — ACTIVACIÓN GITHUB ACTIONS — 2026-08-23

> **HISTORICAL SUPPORTING EVIDENCE — NOT CURRENT STATE AUTHORITY.** Este documento conserva el diagnóstico del canal push descartado; el estado vivo se deriva exclusivamente del ledger y sus proyecciones canónicas.

## Clasificación

`ENVIRONMENT_FAILURE:ACTIONS_PUSH_EVENT_NOT_EMITTED_OR_NOT_OBSERVABLE_FROM_CONNECTOR_WRITES`

Antecedente inmediato: `PIPELINE_MECHANISM_FAILURE` con `VALIDATOR_STALE` secundario, corregidos source-only antes de runtime.

## Estado protegido al momento del diagnóstico

- Rama: `ays/backend-tenant-lab-v99-20260703`.
- PR #5: draft/open.
- Macro-1: `CLOSED_PASS`.
- Macro-2: `CLOSED_PASS`.
- Macro-3: abierta, detenida antes de autorización persistida/request/runtime.
- Candidata: artifact `9485621192` / candidateSourceHead `842f762f199f4c7dbf13062a33ca220d92398c51`.
- Identidad explícitamente autorizada por la usuaria: `9b50d4e95cf32cc8e693dd184ca945e1f532521f37ea8b64f7a1c65e546baa22`.
- La autorización de usuario no estaba consumida: ledger continuaba sin `activeRuntimeAuthorization`, sin `authorizationRecordPath`, sin `activeRequestPath` y con runtime cerrado.
- Deploy, producción, main y merge seguían no autorizados.

## Evidencia de causa

Se reparó y endureció el mecanismo Macro-3 para operar con un solo workflow físico y un solo transition owner:

1. cero `workflow_dispatch`/`workflow_run`/dispatch REST o CLI;
2. cero `actions:write`;
3. `F2_RUNTIME_ATTEMPT_ACCEPT` consume el presupuesto antes de preflight (`allowedExecutions:0`);
4. el intento queda ligado al `GITHUB_RUN_ID`;
5. el terminal debe usar el mismo run id;
6. generic reducer obligatorio para PASS o cualquier clasificación admitida;
7. commits internos de AUTH/terminal fuera de `on.push.paths`, sin auto-retrigger;
8. remote CAS antes de cada publicación;
9. runtime únicamente read-only después del gate; cero writes/deploy/production/main/merge.

Se intentó activar el único workflow por dos superficies de escritura disponibles desde esa sesión:

- escritura/actualización de archivo en la rama;
- creación de commit + actualización directa del ref de la rama.

En ambos casos el repositorio avanzó al commit solicitado, pero no apareció el commit interno esperado `gate(f2): accept one-shot runtime attempt`, no apareció un status observable asociado al commit de activación y el ledger permaneció en revisión 30/package 24, con boundary inerte. Por STOP_RETRY se descartó continuar por push.

## Decisión de control histórica

El workflow quedó en freeze source-only y se prohibió repetir el canal push. No crear otra autorización, request, workflow persistente ni plan paralelo. No reutilizar requests históricos. No modificar producto ni reconstruir artifact.

## Siguiente acción histórica

`RESOLVE_DETERMINISTIC_GITHUB_ACTIONS_ACTIVATION_CHANNEL_WITHOUT_MAIN_OR_PARALLEL_WORKFLOW`

La continuidad posterior debe consultar el ledger y el comentario vivo de PR #5. Este documento no cambia el Plan Maestro ni reabre Macro-1/Macro-2.
