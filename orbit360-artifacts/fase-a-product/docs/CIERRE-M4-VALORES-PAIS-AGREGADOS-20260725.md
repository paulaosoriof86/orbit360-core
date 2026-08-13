# Cierre M4 — auditoría agregada de valores de país

Fecha: 2026-07-25  
Gate: `block4-client-country-values-readonly-v20260725`  
Contrato: `4.2.3`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Resultado vinculante

```text
Package commit: 27171f4fd5490c5f56f42bdf7c5ff4d1a775a8ff
Request commit: 79457224b095b9c54a0900ac9791c560fde9320d
Run: 30162227645
Job: 89689301112
Artifact: 8620551534
Digest: sha256:47bd6be2b68c5ace2dba7656305452aa7a6dc0c85dd2d4fca026e0f512493b6e
Preflight canónico: GO_GATE_CONTRACT 30/30
Contrato runtime: PASS 14/14
Workflow: success en primer intento
```

## Distribución sanitizada

La auditoría leyó exclusivamente `tenantId/{tenant}/clientes`, aisló los 61 clientes sin moneda y no exportó valores individuales.

```text
GT: 0
CO: 0
Vacío: 0
No canónico: 61
Conflicto: 0
Total: 61
```

La ejecución técnica cerró correctamente, pero confirmó un `DATA_CONTRACT_FAILURE`: ninguno de los 61 valores permite aplicar automáticamente GT→GTQ o CO→COP bajo el contrato canónico vigente.

## Causa raíz

El problema no es ausencia del campo `pais`: el gate 4.2.2 demostró que existe en los 61 documentos. El problema es semántico: los 61 valores son no canónicos para los aliases permitidos (`GT`, `Guatemala`, `GTM`, `CO`, `Colombia`, `COL`).

No se usaron como inferencia:

- código telefónico 502 o 57;
- provincia, departamento, ciudad o municipio;
- `paisFuente`;
- pólizas, banco o movimientos financieros.

## Decisión sobre migración parcial

La migración parcial de 353 clientes listos no está permitida por el contrato M4 vigente:

1. `durable-writer-plan-contract-p0.js` exige exactamente 414 clientes y 26 aseguradoras;
2. `durable-writer-dryrun-v20260724.mjs` calcula `approvalReady` únicamente cuando `requiresValidation===0`;
3. el dry-run conserva 61 clientes en `requires_validation`;
4. por tanto, escribir solo el subconjunto listo rompería la atomicidad y el alcance de la primera migración.

No se cambia este contrato para evadir el problema de datos.

## Seguridad

```text
Colecciones leídas: 1
Aseguradoras leídas: no
Destino leído: no
Valores brutos exportados: no
Registros individuales exportados: no
Escrituras: 0
Rules: sin cambios
Hosting/Functions: no
Importaciones: no
Producción: no
Merge/main: no
```

## Claude y Academia

Claude recibe únicamente el patrón reusable: validación agregada sin exponer registros, no inferir país desde señales débiles y mantener estados no canónicos en `REQUIERE_VALIDACION`. El runtime, Firestore, tenant, valores y herramientas del gate son `BACKEND_PROTEGIDO_NO_CLAUDE`.

Academia debe enseñar que una ejecución read-only puede cerrar en success y, al mismo tiempo, confirmar un contrato de datos insuficiente para autorizar escritura.

## Estado y siguiente acción exacta

```text
M4 auditoría esquema 4.2.2: CERRADA
M4 auditoría valores 4.2.3: CERRADA
DATA_CONTRACT_FAILURE: CONFIRMADO — 61 clientes
Propuesta automática GTQ/COP: 0
M4 escritura: BLOQUEADA
Pólizas: BLOQUEADO
```

Siguiente acción: localizar una fuente autorizada y trazable que declare el país de estos 61 clientes, o recibir una validación empresarial explícita y controlada por registro/lote. La futura corrección deberá producir diff, antes/después, fuente, actor, motivo, confirmación, auditoría y rollback. No corresponde otro run que vuelva a clasificar los mismos valores.
