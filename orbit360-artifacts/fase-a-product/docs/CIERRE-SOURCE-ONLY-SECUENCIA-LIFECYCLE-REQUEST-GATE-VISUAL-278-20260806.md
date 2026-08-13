# Cierre source-only — secuencia lifecycle → request del gate visual 2.7.8

Fecha: 2026-08-06  
Gate: `block2.7-visual-matrix-corrected-post-auth-lab-v20260805`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR rector: #5 draft/open

## Clasificación previa

```text
PIPELINE_MECHANISM_FAILURE
LIFECYCLE_ACTIVATION_PARENT_COMMIT_OMITTED
```

El run `31104465513` creó un request sobre un lifecycle todavía congelado. El preflight negó correctamente `authorizationReserved` y `executionBoundaries` antes de secretos, navegador o deploy.

## Implementación

Se incorporaron owners independientes y source-only:

- `tools/orbit360-visual-matrix-lifecycle-sequence-v20260806.mjs`;
- `tools/fixtures/orbit360-visual-matrix-lifecycle-sequence-fixture-v20260806.json`;
- `tools/orbit360-test-visual-matrix-lifecycle-sequence-v20260806.mjs`;
- `.github/workflows/orbit360-visual-matrix-lifecycle-sequence-source-v20260806.yml`.

La máquina de estados exige:

```text
lifecycle congelado
→ commit exclusivo de activación
→ request hijo en commit exclusivo
→ parentHead exacto
→ GO_GATE_CONTRACT
```

La activación implícita queda prohibida.

## Evidencia

```text
status: PASS_LIFECYCLE_SEQUENCE_SYNTHETIC
checks: 39/39
failed: 0
```

Ruta:

```text
orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-lifecycle-sequence-source-test-sanitized-v20260806.json
```

### Camino negativo

Un request creado mientras el lifecycle permanece congelado produce:

```text
STOP_GATE_CONTRACT
authorizationReserved
executionBoundaries
```

### Camino positivo

En un repositorio temporal se crearon, en orden:

1. baseline congelado;
2. commit que modifica únicamente el lifecycle;
3. commit hijo que añade únicamente el request;
4. request ligado al SHA exacto del commit de activación.

El router canónico produjo:

```text
GO_GATE_CONTRACT
failed: 0
ok: true
```

## Límites observados

```text
request runtime persistido: no
lifecycle real activado: no
secretos leídos: no
Firestore leído: no
Firestore/Auth/operational writes: 0
runtime/navegador/deploy: no
producción/main/merge: no
```

El lifecycle rector queda en:

```text
SOURCE_SEQUENCE_PASS_PENDING_EXPLICIT_REAUTHORIZATION
```

Todas las capacidades de riesgo permanecen en `false` y `allowedExecutions` permanece en `0`.

## Causa raíz cerrada

La falla no pertenecía a Auth, hidratación, carga lenta, renderización, datos, Firebase ni Hosting. Pertenecía a la omisión del commit padre de activación en el control plane.

La prueba sintética convierte la secuencia en un contrato verificable y evita volver a consumir una autorización con un lifecycle congelado.

## Siguiente acción exacta

Se requiere una nueva autorización macro explícita para:

1. activar el lifecycle en su propio commit padre;
2. verificar ese parent;
3. crear un request nuevo de un solo archivo en el commit hijo;
4. validar `parentHead` y diff exclusivo;
5. ejecutar `GO_GATE_CONTRACT` antes de secretos;
6. únicamente con PASS, continuar con backup, máximo un Hosting LAB, precheck y matriz read-only;
7. aplicar rollback y `STOP_RETRY` ante cualquier fallo.

No crear request ni activar capacidades antes de esa autorización.
