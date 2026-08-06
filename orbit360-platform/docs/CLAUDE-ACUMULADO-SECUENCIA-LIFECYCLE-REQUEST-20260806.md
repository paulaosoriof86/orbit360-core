# Claude acumulado — patrón lifecycle padre + request hijo

Fecha: 2026-08-06  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Todo gate que reserve capacidades sensibles debe separar físicamente:

1. autorización humana;
2. activación del lifecycle;
3. request ejecutable;
4. ejecución del gate.

La activación vive en un commit padre exclusivo. El request vive en el commit hijo y debe ser el único archivo modificado. El request declara el SHA exacto del padre.

## Invariantes

- no activar capacidades implícitamente desde el request;
- no crear request con lifecycle congelado;
- `GO_GATE_CONTRACT` antes de secretos, Firebase, navegador o deploy;
- un request consumido o retirado no se reutiliza;
- la ruta puede recrearse, pero la identidad es el commit nuevo, su parent y su diff exclusivo;
- el camino negativo también debe probarse;
- una prueba source-only no persiste un request runtime;
- producto y datos permanecen congelados ante fallos del control plane.

## Implementación reusable

```text
tools/orbit360-visual-matrix-lifecycle-sequence-v20260806.mjs
tools/orbit360-test-visual-matrix-lifecycle-sequence-v20260806.mjs
tools/fixtures/orbit360-visual-matrix-lifecycle-sequence-fixture-v20260806.json
```

La máquina de estados ofrece:

- validación del lifecycle congelado;
- transición explícita a lifecycle reservado;
- construcción de request sintético;
- validación de vínculo exacto con el parent;
- rechazo de activación implícita.

## Evidencia

```text
PASS_LIFECYCLE_SEQUENCE_SYNTHETIC
39/39
```

Camino negativo:

```text
STOP_GATE_CONTRACT
authorizationReserved
executionBoundaries
```

Camino positivo:

```text
GO_GATE_CONTRACT
failed: 0
```

## Límites para Claude

Claude puede reutilizar la arquitectura, nombres genéricos de estados, pruebas negativa/positiva y validación de commits.

Claude no debe recibir ni modificar:

- secretos;
- credenciales;
- datos reales A&S;
- usuarios reales;
- adaptadores Firestore protegidos;
- Rules;
- Auth productivo;
- requests vigentes o consumidos;
- decisiones de autorización específicas del tenant.

## Resultado esperado en futuras candidatas

Cada candidata debe incluir lifecycle, owner, fixture, test, workflow, evidencia, documentación y Academia alineados. Si el mismo checkpoint falla dos veces, se congela runtime y se corrige el mecanismo antes de otra autorización.
