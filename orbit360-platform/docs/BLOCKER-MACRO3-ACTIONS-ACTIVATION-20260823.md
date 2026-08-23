# BLOQUEO MACRO-3 — ACTIVACIÓN GITHUB ACTIONS — 2026-08-23

## Clasificación

`ENVIRONMENT_FAILURE:ACTIONS_PUSH_EVENT_NOT_EMITTED_OR_NOT_OBSERVABLE_FROM_CONNECTOR_WRITES`

Antecedente inmediato: `PIPELINE_MECHANISM_FAILURE` con `VALIDATOR_STALE` secundario, corregidos source-only antes de runtime.

## Estado protegido

- Rama: `ays/backend-tenant-lab-v99-20260703`.
- PR #5: draft/open.
- Macro-1: `CLOSED_PASS`.
- Macro-2: `CLOSED_PASS`.
- Macro-3: abierta, detenida antes de autorización persistida/request/runtime.
- Candidata: artifact `9485621192` / candidateSourceHead `842f762f199f4c7dbf13062a33ca220d92398c51`.
- Identidad explícitamente autorizada por la usuaria: `9b50d4e95cf32cc8e693dd184ca945e1f532521f37ea8b64f7a1c65e546baa22`.
- La autorización de usuario NO está consumida: ledger continúa sin `activeRuntimeAuthorization`, sin `authorizationRecordPath`, sin `activeRequestPath` y con runtime cerrado.
- Deploy, producción, main y merge siguen no autorizados.

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

Se intentó activar el único workflow por dos superficies de escritura disponibles desde esta sesión:

- escritura/actualización de archivo en la rama;
- creación de commit + actualización directa del ref de la rama.

En ambos casos el repositorio avanzó al commit solicitado, pero no apareció el commit interno esperado `gate(f2): accept one-shot runtime attempt`, no apareció un status observable asociado al commit de activación y el ledger permaneció en revisión 30/package 24, con boundary inerte. Por STOP_RETRY no se realiza un tercer push de prueba.

## Decisión de control

El workflow queda nuevamente en freeze source-only. Si existiera un run tardío basado en el commit de reactivación anterior, el cambio de HEAD fuerza a fallar el remote CAS antes de publicar AUTH y antes de secrets/runtime.

No crear otra autorización, request, workflow ni plan paralelo. No reutilizar requests históricos. No modificar producto ni reconstruir artifact.

## Siguiente acción exacta

`RESOLVE_DETERMINISTIC_GITHUB_ACTIONS_ACTIVATION_CHANNEL_WITHOUT_MAIN_OR_PARALLEL_WORKFLOW`

Solo después de demostrar un canal de activación determinista se retira el freeze una vez y se ejecuta el mismo Macro-3 inline usando la autorización explícita existente. Si la capacidad disponible no permite disparar Actions sin un push humano/externo, registrar la limitación como ambiente y no seguir parcheando el producto o el control plane.

Este bloqueo no cambia el Plan Maestro ni reabre Macro-1/Macro-2.
