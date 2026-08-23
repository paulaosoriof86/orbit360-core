# MACRO-3 — Corrección de causa raíz del mecanismo de activación F2

**Fecha:** 2026-08-23 (America/Guatemala)  
**Módulo:** Control plane / Macro-3 / F2 productive acceptance  
**Estado:** `SOURCE_ONLY_ROOT_CAUSE_FIXED_PENDING_CANONICAL_PREFLIGHT`  
**Clasificación primaria:** `PIPELINE_MECHANISM_FAILURE`  
**Clasificación secundaria:** `VALIDATOR_STALE`

## Necesidad

Evitar que la autorización F2 one-shot se desperdicie o quede atrapada por un mecanismo de activación no ejecutable, y eliminar la posibilidad de nuevos bucles por workflows paralelos, dispatch no alcanzable o retries implícitos.

## Evidencia y causa raíz

El repositorio usa `main` como rama por defecto, mientras que la rama operativa obligatoria es `ays/backend-tenant-lab-v99-20260703` y `main` no está autorizado para esta etapa.

La implementación previa intentaba lanzar el runtime F2 mediante `workflow_dispatch` hacia un workflow presente únicamente en la rama operativa. GitHub documenta que `workflow_dispatch` solo recibe eventos cuando el archivo del workflow existe en la rama por defecto. Por lo tanto, esa activación era inválida por diseño bajo la restricción vigente de no tocar `main`.

Además, GitHub documenta que un `push` realizado por un workflow usando `GITHUB_TOKEN` no genera un nuevo workflow run. Por ello, sustituir el dispatch por un segundo workflow disparado por el commit interno tampoco era una solución válida.

Fuentes oficiales:
- https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow
- https://docs.github.com/en/actions/concepts/security/github_token

## Fix

1. Se elimina el workflow runtime separado y queda una sola superficie workflow para Macro-3.
2. Se elimina `workflow_dispatch`, `workflow_run` y cualquier REST/CLI dispatch entre workflows.
3. El runtime F2 read-only se ejecuta inline dentro del workflow canónico después del gate obligatorio.
4. La autorización existente se recupera únicamente si el ledger sigue inerte, la identidad y candidata coinciden exactamente y no existe authorization/request materializado.
5. Antes del runtime se ejecuta `F2_RUNTIME_ATTEMPT_ACCEPT`: el presupuesto pasa a `allowedExecutions:0`, `runtimeAttemptAccepted:true`, `runtimeAttemptCount:1` y queda ligado a `GITHUB_RUN_ID`.
6. El gate, register y selftest exigen ese estado ya consumido de intento; un segundo intento falla con `STOP_RETRY`.
7. Todo intento aceptado debe producir evidencia terminal sanitizada y pasar por el reducer genérico, tanto para PASS como para todas las clasificaciones de fallo.
8. El checkout no persiste credenciales; las credenciales de escritura solo se montan temporalmente en los dos pasos de publicación CAS. Durante browser/Firestore/runtime no queda credencial Git persistida.
9. Se agrega `tools/orbit360-macro3-mechanism-preflight-v20260823.mjs`, que falla cerrado si reaparece un segundo workflow, chaining, dispatch, rebase, ausencia del one-shot accept o ausencia del reducer.

## Impacto

- **Producto:** ninguno; no se modifica la candidata `9485621192`.
- **Datos reales:** ninguno; Carril C permanece congelado.
- **Backend protegido:** no se modifica store/Auth/Firestore/rules.
- **Autorización F2:** se conserva la autorización explícita ya registrada; no se crea una segunda autorización.
- **Deploy/producción/main/merge:** siguen prohibidos.
- **Claude:** `BACKEND_PROTEGIDO_NO_CLAUDE` / patrón de control plane no se exporta como candidata de frontend.
- **Academia:** registrar como ejemplo de diferencia entre `PIPELINE_MECHANISM_FAILURE` y defecto funcional; no requiere cambio funcional del producto.

## Criterio de cierre

Solo se considera cerrada esta causa raíz cuando el gate source-only de mecanismo devuelve `MACRO3_MECHANISM_PREFLIGHT_PASS`, la autorización pendiente se materializa una sola vez, el intento queda aceptado con presupuesto cero antes de secrets/browser y el terminal se reduce sin replay.
