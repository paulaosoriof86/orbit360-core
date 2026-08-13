# Orbit 360 A&S — cierre M5 5.0.27

Fecha: 2026-07-29
Gate: `block5-release-candidate-visualization-v20260728`
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Resultado

`M5_CONTROL_PLANE_REDESIGN_527_STATIC_PASS_CLOSED`

El bloque 5.0.27 resolvió la causa raíz estructural detectada después de los dos fallos de package 5.0.26: múltiples consumidores estaban duplicando o adivinando nombres de propiedades del contrato del resolver responsive.

No se ejecutó runtime, navegador, Firestore, secretos, deploy, producción ni Pólizas.

## Causa raíz cerrada

Clasificación: `VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`.

Patrón anterior:
- package 5.0.26 intento 1 consumió una ruta obsoleta `staticAttempt` en vez de `staticVerification`;
- package 5.0.26 intento 2 volvió a asumir un shape inexistente `scopeFallback`;
- el contrato canónico real usa `scopedExactTextFallback` e `insurerFicha`.

La corrección no fue otro reemplazo puntual de nombres. Se creó un único owner de shape y un lector reusable que normaliza y valida el contrato antes de cualquier wrapper runtime.

## Implementación

Owner único:
- `tools/orbit360-responsive-title-resolver-contract-v20260729.json`

Lector canónico:
- `tools/orbit360-contract-shape-reader-v20260729.mjs`
- versión `20260729.1`

Fixtures:
- `tools/orbit360-contract-shape-reader-fixtures-v20260729.mjs`

Contrato schema-driven de la candidata 5.0.25:
- `tools/orbit360-m5-runtime-smoke-525-contract-schema-driven-v20260729.mjs`

El contrato histórico defectuoso se conserva como evidencia y no se reescribe:
- `tools/orbit360-m5-runtime-smoke-525-contract-v20260729.cjs`

## Fixtures de compatibilidad

El lector comprueba que:
- reordenar propiedades JSON no rompe el contrato;
- ausencia de `scopedExactTextFallback` falla con ruta precisa;
- un alias inventado como `scopeFallback` no se acepta;
- ausencia de `insurerFicha` falla;
- tipo incorrecto para umbrales falla;
- schemaVersion no soportado falla de forma explícita.

Esto evita que futuros consumidores inventen aliases o shapes alternativos.

## Evidencia

Commit de ejecución: `320466cfcb08ad08e6ea0253bac1c410db31c2c2`
Run: `30484633453`
Job: `90687113637`
Artifact: `8737091613`
Digest: `sha256:b53db58f87ac63b4ce96fdb7cc2dac6a67490b70f9cd1758e5b9b22195dcb511`

Resultados:
- preflight canónico: 16/16 PASS;
- contrato schema-driven candidata 5.0.25: 13/13 PASS;
- fallos: 0;
- producto protegido sin cambios: true;
- RC: `ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61`;
- remote LAB: 25/25;
- candidata browser SHA: `70d6ad22553bd0387fa08dd2eeeb6e3b9834fa12`;
- closer SHA: `bf9301d1ed8bfa5d75f8d17924bd6685c520cb94`.

## Seguridad

Durante 5.0.27:
- secrets: false;
- Firestore read: false;
- Firestore writes: 0;
- operational writes: 0;
- runtime: false;
- browser: false;
- Hosting/Functions/Rules: false;
- producción/main/merge: false;
- visual: false;
- Pólizas: false.

El workflow 5.0.27 quedó congelado después del PASS.

## Carriles

### A — frontend / UX / Academia

No hubo modificación de frontend ni UX. Se preserva la candidata 5.0.25 y su resolver semántico responsive ya auditado estáticamente.

### B — backend / seguridad / Orbit.store

No se modificó backend protegido, store, Auth, Rules, Functions ni políticas. El avance fue exclusivamente de control plane estático.

### C — datos reales / migración A&S

No se accedió ni modificó dato real. Baseline preservado: 414 clientes, 26 aseguradoras, 7 asesores; GT/CO 398/16; Persona/Empresa 391/23; missing currency 0; target-only 0/0.

## REPLICABLE_CLAUDE_ACUMULADO

- Un contrato JSON debe tener un único owner de shape.
- Los validadores deben consumir el contrato mediante un lector/normalizador central, no repetir rutas manualmente.
- Reordenar propiedades no debe afectar validación.
- Alias no declarados deben fallar, no aceptarse silenciosamente.
- Los fixtures deben incluir shape válido, ruta faltante, alias inventado, tipo inválido y schemaVersion incompatible.
- Un contrato histórico defectuoso se preserva como evidencia; la corrección se introduce por una ruta nueva y auditable.
- Package pre-runtime debe ser capaz de probar todo esto con cero capacidades operativas.

Clasificación Claude: `REPLICABLE_CLAUDE_ACUMULADO`.

## ACADEMIA_ACTUALIZAR

Academia debe enseñar explícitamente:
- diferencia entre `FUNCTIONAL_DEFECT`, `VALIDATOR_STALE` y `PIPELINE_MECHANISM_FAILURE`;
- por qué cambiar un nombre de propiedad uno por uno no corrige una causa raíz estructural;
- concepto de single source of truth / owner único de schema;
- validadores schema-driven y fixtures negativos;
- diferencia entre autorización recibida, request creado y autorización consumida;
- stop-line obligatorio después de dos fallos de la misma etapa;
- por qué un PASS estático no autoriza runtime, visualización ni producción.

## Estado vigente

M1–M4: cerrados.

M5:
- 5.0.24: PASS;
- 5.0.26: STOPPED tras dos package failures;
- 5.0.27: PASS cerrado;
- candidata runtime 5.0.25: intacta y no ejecutada;
- autorización runtime: false / 0;
- revisión visual: bloqueada;
- producción: bloqueada;
- Pólizas: bloqueado.

Estado actual autoritativo:
- `tools/orbit360-m5-release-candidate-control-overlay-527-v20260729.json`

## Siguiente acción exacta

Solicitar una **nueva autorización explícita e independiente** para una sola ejecución runtime LAB de la candidata 5.0.25 usando un wrapper nuevo posterior a 5.0.27. No reutilizar 5.0.26.

El wrapper futuro deberá ejecutar primero el preflight canónico, usar el contrato schema-driven 5.0.25, snapshots Firestore read-only antes/después, write guard, cero escrituras, sin Hosting/Functions/Rules/producción/main/merge/Pólizas.

Solo una evidencia sanitizada `ok:true` habilita la revisión visual única de M5.
