# ACADEMIA — DELTA CONTROL-PLANE Y AUTORIZACIONES — 2026-08-26

## Qué debe enseñar Academia

Este caso se incorpora como patrón reusable para Operaciones, Dirección y roles técnicos autorizados.

### Diferenciar defecto funcional de mecanismo

Un fallo de transporte, CAS, trigger, owner, validator o snapshot stale se clasifica como `PIPELINE_MECHANISM_FAILURE` o `VALIDATOR_STALE`; no autoriza tocar producto, reimportar datos ni modificar módulos funcionales.

### Regla STOP_RETRY

Si la misma familia de mecanismo falla dos veces, no se repite la etapa. Se congela producto/datos, se diagnostica la causa de transporte y se corrige el mecanismo o se usa el camino mínimo ya aprobado.

### Autorización y frontera de riesgo

Persistir/reservar un intento no equivale a consumir la autorización. El one-shot solo puede consumirse al entrar en la frontera privilegiada definida por el lifecycle. Un fallo previo de transporte no debe provocar otra solicitud de autorización humana.

### Transporte de intents

Para evitar carreras por snapshots stale, todo PR técnico reusable debe seguir esta secuencia: cerrar PR → reset a HEAD vivo → materializar intent estando cerrado → reabrir → una sola mutación de nonce → un solo `synchronize`.

Está prohibido resetear una rama técnica con el PR abierto o producir múltiples eventos para una misma transición.

### Lectura de evidencia

Un CAS fail-closed significa que el estado cambió entre snapshot y ejecución. No demuestra un defecto de producto. La evidencia debe mostrar si autorización, request, runtime, browser, secrets, Firestore, writes, deploy o producción llegaron a ejecutarse.

### Estado de referencia de este caso

Readiness source-only PASS: run `32914461679`.

Cierre canónico: commit `c712d23429365dfe5662547505d8f096712baaac`, ledger/package `75/69`, `CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS`, sin autorización/request/runtime activos.
