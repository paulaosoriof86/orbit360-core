# Claude acumulado — patrón lifecycle dos fases + STOP consumption

Fecha: 2026-08-07  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Un pipeline protegido que separa validación source-only de runtime debe modelar ambas fases explícitamente.

1. `SOURCE_ONLY_ACTIVATION_VALIDATED`: cero capacidades runtime, sin request activo.
2. transición source-controlled y validada a `AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST` + fase runtime canónica.
3. creación de exactamente un commit/archivo de request ligado al parent SHA de la transición.
4. gate canónico antes de secretos.
5. ante cualquier STOP, consumo/freeze automático del request aunque todavía no se hayan leído secretos.

## Anti-patrón detectado

Permitir que un guard acepte un lifecycle source-only mientras router/engine requieren una fase runtime. Esto crea validadores localmente correctos pero globalmente incompatibles.

También es anti-patrón persistir evidencia de fallo sin consumir la autorización one-shot que disparó la ejecución.

## Contratos mínimos

Guard, router y engine deben compartir:

- mismo phase id;
- mismo status runtime-pending;
- mismas capacidades exactas;
- mismo requestVersion;
- mismo gate/contract;
- mismo tenant/proyecto/rama;
- mismo baseline y restaurador;
- límites de deploy/escrituras;
- semántica one-shot/no replay.

El sourcecheck de un workflow armado debe fallar si no incluye consumo automático ante STOP.

## Evidencia

`PASS_TWO_PHASE_LIFECYCLE_AND_STOP_CONSUMPTION_SOURCE_ONLY` con 12/12 request↔lifecycle y 31/31 control-plane. Relay real fail-closed y cero runtime/secrets/Hosting/browser/writes.

No incluir datos reales, secretos, credenciales ni backend tenant-specific al replicar el patrón.
