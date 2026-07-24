# Resultado M2 runtime read-only — DATA_CONTRACT_FAILURE

Fecha: 2026-07-24  
Gate: `block2-product-readonly-runtime-v20260723`  
Contrato: `2.2.0`  
Run: `30103556811`  
Commit evaluado: `83e881394495a678cf343e2f4977669175e01cbe`  
Artifact: `8600630817`  
Digest: `sha256:de7cac22d8db427006938fd67c288177b6cb86a1154dc1f0566951cdee0ed99c`

## Resultado vinculante

```text
Preflight canónico: GO_GATE_CONTRACT 41/41
Contrato estático: PASS 21/21
Proyecto: MATCH
Web config: derivada read-only
Auth: legible — 2 usuarios
Memberships: 1
Identidad existente elegible: 1
Runtime: ejecutado
Bootstrap canónico ready: no
Store instalado: no
Clasificación: DATA_CONTRACT_FAILURE
```

## Seguridad preservada

```text
Proyecto nuevo: no
Usuarios creados o modificados: 0
Memberships creadas o modificadas: 0
Rules modificadas: no
Escrituras de configuración: 0
Escrituras operativas: 0
Hosting: no
Functions: no
Importaciones: no
Pólizas/M3: no
Merge/main: no
```

## Frontera exacta del fallo

El proyecto, la cuenta existente, la configuración web, Auth y la membership se resolvieron correctamente. La falla ocurrió cuando `backendProductReadOnlyBootstrapP0.start` devolvió estado no listo. Como consecuencia:

- `storeInstalled: false`;
- `snapshotsAttached: false`;
- `noFallback: false` porque no existió store instalado que pudiera reportarlo;
- `localWriteBlocked: false` porque no existió store sobre el cual ejecutar la prueba local.

## Brecha de diagnóstico

El owner runtime redujo el resultado del bootstrap a un booleano y no conservó en la evidencia sanitizada:

- fase final del bootstrap;
- códigos de error del estado;
- errores de readiness;
- estado de adjunción de snapshots.

Esto se clasifica adicionalmente como `PIPELINE_MECHANISM_FAILURE`. La subcausa exacta del bootstrap no queda probada y no debe inventarse.

## Hipótesis principal respaldada por contratos

La infraestructura LAB define el usuario `orbit.lab@demo.com`, mientras el contrato productivo de readiness incluye ese mismo correo entre los marcadores prohibidos y genera `auth_demo_no_permitido` cuando aparece en la identidad autenticada.

Esto constituye la hipótesis más fuerte, pero sigue siendo una inferencia: el artefacto no preservó el correo o el código interno de la identidad seleccionada. Antes de corregir el contrato o los datos debe probarse estáticamente la identidad exacta y preservar los errores sanitizados del bootstrap.

## Estado

La autorización única quedó consumida. No se permite reejecución.

## Siguiente acción exacta

`diagnóstico estático de causa raíz con el artefacto existente → corregir exclusivamente la cobertura de evidencia sanitizada → determinar si el conflicto es identidad LAB vs readiness productivo o una falla posterior de snapshots → nueva decisión de autorización solo con causa probada`

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.  
Academia: actualizar diferencia entre `DATA_CONTRACT_FAILURE` y `PIPELINE_MECHANISM_FAILURE` secundario.
