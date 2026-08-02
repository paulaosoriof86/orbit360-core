# Cierre STOP_RETRY — Gate 7.11 rerun y composición canónica

Fecha: 2026-08-02
Repositorio: `paulaosoriof86/orbit360-core`
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Producto autorizado: `6ebcb7e82545a6a6810ecf55d2cc8b8ad2783979`

## Autorización consumida

La autorización cubrió una única reejecución read-only del macro Gate 7.11:

1. preflight con lifecycle registry validado;
2. verificación runtime focalizada del root fix de Academia;
3. solo con PASS y snapshots idénticos, Gate 7.11 acumulativo completo;
4. cero escrituras, reimportación, deploy y producción;
5. STOP_RETRY inmediato ante la misma etapa o familia de fallo.

## Ejecución

```text
run: 30767242588
job: 91548028728
executionHead: 41fbe5df341bf8aedad3a6e51257b97caef503d0
authorizedProductHead: 6ebcb7e82545a6a6810ecf55d2cc8b8ad2783979
artifact: 8839335174
digest: sha256:2e291d07f0565e66ace64e670590963c68514e15d94088fdf957fe7ddaca0b48
```

## Resultado

```text
status: STOP_RETRY
classification: PIPELINE_MECHANISM_FAILURE
stage: preflight_before_secrets
failedCheck: CANONICAL_PREFLIGHT_ENTRYPOINT
error: CANONICAL_LIFECYCLE_REVISION_MISMATCH
```

El lifecycle registry sí pasó `12/12`. El bloqueo ocurrió después, en el router canónico de gates.

## Causa raíz demostrada

El router `tools/orbit360-validar-gate-contracts-v20260717.mjs` exige:

```text
validatorLifecycleRevision = phase-capability-contract-v1
```

El lifecycle macro utilizó una revisión descriptiva propia:

```text
macro-rootfix-then-full-rerun-v2
```

El macro no debía reemplazar la revisión canónica. La descripción particular debe vivir en un campo separado, por ejemplo `macroLifecycleRevision`, conservando `validatorLifecycleRevision` como contrato transversal.

## Impacto de la ejecución

```text
static registry readiness: 12/12 PASS
secret access: false
firestore read: false
runtime executed: false
browser executed: false
root fix runtime executed: false
full Gate 7.11 executed: false
firestore writes: 0
operational writes: 0
reimport: false
deploy: false
production: false
main/merge: false
```

No se observó un fallo nuevo del producto ni del root fix de Academia.

## Prueba sintética fuera de runtime

Se creó una plantilla inerte compatible con el router canónico:

```text
tools/orbit360-gate711-canonical-lifecycle-template-v20260802.json
validatorLifecycleRevision: phase-capability-contract-v1
macroLifecycleRevision: macro-rootfix-then-full-canonical-v3
```

Resultado de la prueba sintética:

```text
run: 30767368027
job: 91548365047
artifact: 8839374033
digest: sha256:d07f7a8562876c16d92ccd427d988f806f6f837f87adf0da4edcd326851c2abf
status: GATE711_CANONICAL_LIFECYCLE_COMPOSITION_STATIC_PASS
checks: 12/12
secrets: false
firestore: false
runtime: false
browser: false
writes: 0
```

La causa previa fue reproducida y la composición corregida quedó probada estáticamente.

## Estado de seguridad

- macro workflow cerrado;
- request macro consumido y replay bloqueado;
- lifecycle macro en STOP_RETRY;
- workflow sintético cerrado;
- request sintético consumido;
- no existe ejecución runtime activa;
- no existe autorización activa;
- producto y datos congelados.

## Siguiente acción exacta

No repetir el run ni crear otro request bajo esta autorización.

Antes de cualquier autorización futura, preparar un único lifecycle/request que:

1. conserve `validatorLifecycleRevision: phase-capability-contract-v1`;
2. use `macroLifecycleRevision` para la variante del macro;
3. pase el router canónico completo en prueba estática;
4. permanezca ligado al mismo producto canónico y a los mismos digests;
5. no habilite escrituras, reimportación, deploy ni producción.

Solo después de esa preparación estática cerrada puede considerarse otra ejecución runtime.

## Clasificación

- Producto: congelado, sin defecto runtime nuevo observado.
- Pipeline: `PIPELINE_MECHANISM_FAILURE` diagnosticado.
- Claude: `REPLICABLE_CLAUDE_ACUMULADO` únicamente como patrón de contratos/owners, sin backend protegido.
- Academia: actualizar diferencia entre lifecycle canónico y etiqueta descriptiva del macro.
