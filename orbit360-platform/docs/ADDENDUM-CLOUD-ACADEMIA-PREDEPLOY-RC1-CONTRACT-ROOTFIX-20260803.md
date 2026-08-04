# Addendum Cloud / Claude / Academia — contrato predeploy RC1

Fecha: 2026-08-03  
Estado: `DOCUMENTADO / NO_ENVIADO / NO_DEPLOY`  
Fuente: cierre `CIERRE-ROOT-FIX-CONTRATO-PREDEPLOY-RC1-STATIC-PASS-20260803.md`

## Delta acumulado

| ID | Dominio | Patrón reusable | Clasificación | Estado |
|---|---|---|---|---|
| CL-098 | Gates | Un gate cerrado con PASS no queda automáticamente promovido como fuente activa del siguiente bloque. El registro, lifecycle, request, engine y workflow deben apuntar explícitamente al cierre aceptado. | `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO / PENDIENTE_ENVIO` |
| CL-099 | Validadores | Un predeploy no debe reutilizar una autorización runtime consumida ni un lifecycle histórico `STOP_RETRY`; necesita un contrato propio y una autorización nueva por capacidad. | criterio `REPLICABLE_CLAUDE_ACUMULADO`; mecanismo `BACKEND_PROTEGIDO_NO_CLAUDE` | `IMPLEMENTADO / PENDIENTE_ENVIO` |
| CL-100 | Academia | Enseñar la diferencia entre evidencia PASS, registro activo, autorización consumida y contrato del bloque siguiente. Un producto puede estar correcto mientras el pipeline permanece obsoleto. | `ACADEMIA_ACTUALIZAR` | `DOCUMENTADO / PENDIENTE_ENVIO` |
| CL-101 | Releases | Cada release candidate debe tener un sello propio que vincule baseline, commit, delta permitido, gate fuente, conteos y guards, sin reescribir los sellos históricos. | `REPLICABLE_CLAUDE_INMEDIATO` | `IMPLEMENTADO / PENDIENTE_ENVIO` |
| CL-102 | Seguridad | Un lifecycle puede declarar capacidades potenciales de lectura, pero el preflight estático debe mantener `executionAuthorized:false` hasta recibir un request nuevo, inmutable y explícito. | `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO / PENDIENTE_ENVIO` |
| CL-103 | Arquitectura SaaS | Los contratos de release y predeploy deben ser tenant-neutral en su mecanismo; los identificadores del primer tenant permanecen en configuración protegida y no en el patrón reusable. | `REPLICABLE_CLAUDE_INMEDIATO` | `IMPLEMENTADO / PENDIENTE_ENVIO` |
| CL-104 | Evidencia | El root fix de un pipeline debe tener workflow estático propio, sin secrets, que valide registro, lifecycle, engine, sello y workflow consumidor antes de pedir otra autorización. | `REPLICABLE_CLAUDE_ACUMULADO` | `IMPLEMENTADO / PENDIENTE_ENVIO` |
| CL-105 | Academia | Incorporar un caso práctico de `VALIDATOR_STALE`: el gate posterior cerró PASS, pero el entrypoint seguía consumiendo un lifecycle previo en `STOP_RETRY`. | `ACADEMIA_ACTUALIZAR` | `DOCUMENTADO / PENDIENTE_ENVIO` |

## Evidencia sanitizada

```text
source failure:
run 30868524436
job 91865447742
classification VALIDATOR_STALE + PIPELINE_MECHANISM_FAILURE
secrets/firestore/deploy 0/0/0

root fix static:
run 30870038645
job 91869981687
artifact 8877550818
sha256:8be99b33af2d2f90894c0be21582a6e4e113aa8a40c2f93a1959b29069530ddd
status GRAVICENTRA_RC1_PREDEPLOY_CONTRACT_STATIC_PASS
```

## Componentes implementados en el core

```text
tools/orbit360-gravicentra-insurance-rc1-release-seal-v20260803.json
tools/orbit360-validator-lifecycle-contract-gravicentra-rc1-predeploy-readonly-v20260803.json
tools/orbit360-validar-gate-contracts-engine-gravicentra-rc1-predeploy-readonly-v20260803.mjs
tools/orbit360-validar-gate-contracts-v20260717.mjs
.github/workflows/orbit360-gravicentra-rc1-predeploy-readonly-v20260803.yml
.github/workflows/orbit360-gravicentra-rc1-predeploy-contract-static-v20260803.yml
```

## Exclusiones del paquete externo

No se envían:

- IDs de proyecto, tenant o usuario;
- nombres de secrets;
- service accounts o tokens;
- workflows capaces de acceder a entornos reales;
- rutas internas de datos;
- conteos o digests que permitan reconstruir información real;
- requests con autorización activa;
- backend protegido.

El paquete externo debe expresar únicamente los patrones CL-098 a CL-105 mediante contratos genéricos y ejemplos ficticios.

## Estado honesto

```text
implementado en core: sí
documentado en GitHub: sí
validado estáticamente: sí
enviado a Cloud/Claude: no
incorporado al prototipo comercializable externo: no
Hosting desplegado: no
producción modificada: no
```

El envío a Cloud/Claude no bloquea el predeploy de A&S, pero debe permanecer como pendiente visible hasta existir evidencia efectiva de recepción e incorporación.
