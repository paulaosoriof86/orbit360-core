# ADDENDUM — PREDEPLOY RC1, CLOUD Y ACADEMIA

Fecha: 2026-08-03  
Estado: `DOCUMENTADO / NO_ENVIADO / NO_DEPLOY`  
Fuente: `CIERRE-PREDEPLOY-GRAVICENTRA-RC1-NO-GO-VALIDATOR-STALE-20260803.md`

## Nuevos patrones acumulados

| ID | Patrón | Clasificación | Estado |
|---|---|---|---|
| CL-098 | Un gate cerrado en PASS no se convierte automáticamente en el contrato activo. El entrypoint canónico debe promover el lifecycle, request y evidencia aceptados. | `REPLICABLE_CLAUDE_ACUMULADO` | `DOCUMENTADO / ROOT_FIX_PENDIENTE` |
| CL-099 | Request, lifecycle, manifest, sello, registro y workflow deben sincronizarse juntos. Si el producto está cerrado pero el registro apunta a un `STOP_RETRY` histórico, el resultado es `VALIDATOR_STALE`, no defecto funcional ni pérdida de datos. | `REPLICABLE_CLAUDE_ACUMULADO` | `DOCUMENTADO / ROOT_FIX_PENDIENTE` |
| CL-100 | Academia debe enseñar la diferencia entre “gate aprobado”, “candidata sellada” y “contrato canónico activo”, incluyendo el STOP pre-risk antes de secrets. | `ACADEMIA_ACTUALIZAR` | `DOCUMENTADO` |

## Evidencia

```text
run: 30868524436
job: 91865447742
artifact: 8877002560
digest: sha256:d61c81d34fb9b69aee0eca9c232064aad94ebc28012c6df2985a8c7c4153da47
status: VALIDATOR_STALE
classification: PIPELINE_MECHANISM_FAILURE
checks: 12/18 PASS
failed: LIFECYCLE, AUTHORIZATION, REQUEST, CUMULATIVE, DIGESTS, NO_WRITES
```

No se accedió a secretos, Firestore, Hosting ni datos reales. No hubo deploy, Rules, Functions, producción, main o merge.

## Alcance externo permitido

Puede enviarse a Cloud/Claude únicamente la arquitectura reusable:

- promoción obligatoria de cierres PASS al registro activo;
- binding exacto de lifecycle y request;
- actualización conjunta de manifest y sello;
- separación entre autorización runtime consumida y contrato read-only de predeploy;
- STOP antes de secrets cuando el contrato activo está obsoleto.

No se envían:

- nombres de proyectos, tenants, secretos o usuarios;
- conteos o digests de datos reales;
- workflows operativos;
- owners backend protegidos;
- identificadores internos de autorización.

## Impacto en Academia

Agregar una lección por rol técnico sobre:

1. evidencia vigente frente a archivo histórico;
2. `VALIDATOR_STALE` frente a `FUNCTIONAL_DEFECT`;
3. por qué no se corrigen módulos ni se reimportan datos cuando falla el registro contractual;
4. por qué un preflight debe detenerse antes de credenciales;
5. cómo promover un cierre PASS sin abrir otra auditoría general.

## Estado Cloud

```text
implementado en producto: no aplica
root fix contractual interno: pendiente
paquete reusable documentado: sí
paquete enviado: no
recepción confirmada: no
incorporación en prototipo comercializable: no
```
