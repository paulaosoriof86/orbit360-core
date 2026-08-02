# Claude acumulado — Write guard y diagnóstico sanitizado de owner

Fecha: 2026-08-02  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Una prueba read-only debe distinguir entre:

- llamada intentada a la API de escritura;
- escritura materializada en backend.

El guard debe bloquear `insert`, `update`, `remove` y preferencias persistentes antes del adapter.

## Evidencia mínima del intento

Capturar solo:

- operación;
- colección;
- nombres de claves del payload;
- rol activo;
- ruta activa;
- stack sanitizado;
- timestamp.

No capturar:

- valores del payload;
- nombres de clientes;
- documentos personales;
- correos reales;
- IDs completos;
- tokens;
- credenciales;
- URLs privadas;
- datos de tenant.

## Regla de interpretación

```text
attempts > 0 && backendWrites == 0
```

significa que la barrera de seguridad funcionó, pero el contrato read-only falló.

No debe transformarse automáticamente en PASS.

## Causa raíz antes de corregir

El stack debe permitir decidir entre:

- `FUNCTIONAL_DEFECT`: un render o cambio de vista produce una escritura indebida;
- `VALIDATOR_STALE`: el test ejecuta una interacción que por contrato es auditable;
- `DATA_CONTRACT_FAILURE`: la capa intenta escribir en una colección incompatible;
- `PIPELINE_MECHANISM_FAILURE`: la captura o cleanup fallan sin defecto de producto.

## STOP_RETRY

Si la misma operación aparece repetidamente en varios roles o viewports:

- detener la ejecución;
- no crear otro request;
- no parchear el módulo visible;
- identificar el owner;
- agregar prueba sintética;
- corregir una sola capa;
- exigir nueva autorización.

## Límites del paquete Claude

Este patrón puede compartirse como arquitectura y UX de pruebas. No incluir:

- identidad LAB;
- projectId;
- tenantId;
- colecciones o rutas reales del cliente;
- secretos;
- backend protegido;
- datos de A&S.
