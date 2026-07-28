# M4 4.2.10 — Revalidación durable post-retiro read-only

Fecha: 2026-07-28  
Gate: `block4-post-retirement-revalidation-readonly-v20260728`  
Contrato: `4.2.10`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Necesidad

Después del cierre 4.2.9, el retiro atómico dejó el origen en 414 clientes / 26 aseguradoras y el overlay target-only en 0/0, con cuatro snapshots de rollback y cuatro eventos append-only. Antes de evaluar cualquier escritura de las 61 normalizaciones GT/GTQ se requiere una verificación durable nueva e independiente.

## Clasificación

`DATA_CONTRACT_REVALIDATION_READONLY`.

No es una corrección funcional ni una nueva migración. No modifica Clientes, Aseguradoras, configuración, memberships, Rules, Hosting, Functions, producción, main ni merge.

## Contrato de salida

La única ejecución autorizada debe demostrar:

```text
source clientes: 414
source aseguradoras: 26
target-only clientes: 0
target-only aseguradoras: 0
snapshots legibles del retiro 4.2.9: 4
eventos append-only legibles del retiro 4.2.9: 4
escrituras operativas: 0
```

La evidencia exportada debe ser agregada y sanitizada, sin IDs, valores crudos, PII ni secretos.

## Orden metodológico

1. Solicitud inmutable ligada al commit padre.
2. `node tools/orbit360-validar-gate-contracts-v20260717.mjs block4-post-retirement-revalidation-readonly-v20260728`.
3. Solo con `GO_GATE_CONTRACT`, resolver la cuenta LAB existente.
4. Ejecutar una sola lectura durable.
5. Validar evidencia sanitizada.
6. Consumir la autorización.
7. Solo si pasa, evaluar una autorización separada para las 61 correcciones GT/GTQ.

## Pólizas y demás fuentes

Pólizas continúan bloqueadas. La hoja histórica de producción no es fuente de Pólizas. Cuando corresponda el bloque Pólizas, se debe solicitar a Paula el listado/fuente vigente específico y no inferirlo desde producción. El mismo principio aplica a Vehículos, Recibos/cartera, Cobros, planillas, financiero y documentos: cada fuente se solicita cuando su bloque la necesite.

## Claude y Academia

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`; no se envían secretos, datos reales ni implementación del gate.  
Academia: `ACADEMIA_ACTUALIZAR`; enseñar separación entre lectura de revalidación, autorización de escritura y fuente real por entidad.

## Siguiente acción exacta

Crear la solicitud inmutable de una sola ejecución read-only. Si el resultado es `ok:true`, cerrar 4.2.10 y preparar, sin ejecutar todavía, la decisión separada sobre los 61 cambios GT/GTQ.
