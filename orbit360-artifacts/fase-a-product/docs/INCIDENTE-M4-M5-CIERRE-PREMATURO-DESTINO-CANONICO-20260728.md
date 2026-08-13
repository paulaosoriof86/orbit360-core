# Incidente metodológico — M4/M5 cierre prematuro por destino canónico no cargado

Fecha: 2026-07-28

## Clasificación

- `VALIDATOR_STALE`: el cierre M4 y el readiness M5 no exigieron cardinalidad final del destino canónico productivo.
- `DATA_CONTRACT_FAILURE`: la fuente quedó limpia en 414 clientes / 26 aseguradoras, pero el destino canónico `tenants/{tenant}/data/{collection}/items` no recibió todavía esa migración.

No es un defecto de los 61 cambios GT/GTQ y no requiere rollback de esas correcciones.

## Evidencia

El contrato canónico de rutas productivas define:

```text
tenants/{tenant}/data/clientes/items
tenants/{tenant}/data/aseguradoras/items
```

El dry-run 4.1.0 comparó origen legacy contra esos destinos y encontró originalmente:

```text
clientes: 353 create + 61 requires_validation + 2 target-only
aseguradoras: 26 create + 2 target-only
```

Posteriormente:

- los 4 target-only fueron retirados;
- los 61 clientes faltantes de país/moneda fueron corregidos en origen;
- 4.2.10 confirmó origen 414/26 y destino canónico 0/0;
- 4.2.11 corrigió únicamente los 61 documentos de origen y no ejecutó la migración completa al destino.

Por tanto, el cierre `M4_CLOSED_SUCCESS` confundió saneamiento de fuente con migración durable al destino.

## Causa raíz

El criterio de cierre M4 verificaba:

- conteos de origen;
- ausencia de moneda faltante;
- ausencia de target-only;
- auditoría/rollback de las correcciones realizadas.

Pero omitió el criterio indispensable:

```text
canonicalTargetClients == 414
canonicalTargetInsurers == 26
```

El readiness M5 heredó la misma omisión y por eso pudo declarar `M5_RC_READY_FOR_RUNTIME_SMOKE` aunque la paridad visual LAB 22/22 fuera correcta.

## Acción correctiva

1. Reabrir M4 únicamente para migración canónica de Clientes + Aseguradoras.
2. Invalidar M5 5.0.0 como readiness de producto; conservar su hash/paridad como evidencia no suficiente.
3. Corregir contratos/gates para exigir 414/26 tanto en origen como en destino canónico.
4. Ejecutar un nuevo dry-run read-only contra el estado actual limpio:
   - origen 414/26;
   - destino 0/0;
   - propuesta esperada 414 creates de clientes + 26 creates de aseguradoras;
   - 0 requires_validation;
   - 0 target-only;
   - 0 secretos;
   - 0 escrituras.
5. Solo con dry-run verde solicitar autorización independiente para la migración durable real.
6. Revalidar M4 y recién después repetir M5 readiness sobre el mismo contrato corregido.

## Lo que NO se hace

- no rollback de 4.2.11;
- no reimportación desde archivos;
- no Pólizas;
- no Cobros/Recibos;
- no Rules/Functions/Hosting;
- no producción/main/merge;
- no creación de usuarios;
- no cambio de membership para resolver este incidente.

## Prevención permanente

Todo gate de cierre de una migración debe distinguir explícitamente:

```text
sourceCount
canonicalTargetCount
targetOnlyCount
requiresValidation
```

Un `sourceCount` correcto nunca vuelve a ser suficiente para declarar migración completa.

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE` para la implementación; patrón reusable de criterio source/target puede acumularse como `REPLICABLE_CLAUDE_ACUMULADO` sin datos reales.

Academia: `ACADEMIA_ACTUALIZAR` — enseñar diferencia entre saneamiento de fuente, migración de destino y readiness visual.
