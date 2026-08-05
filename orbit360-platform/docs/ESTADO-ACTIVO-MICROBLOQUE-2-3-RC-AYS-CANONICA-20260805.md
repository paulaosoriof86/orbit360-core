# ESTADO ACTIVO — MICROBLOQUE 2.3

Fecha local: 2026-08-04 23:23 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate: `GO_LAB_CANDIDATE_VISIBLE`  
Estado: `STOP_RETRY_DEFINITIVE_BASELINE_PROVENANCE`

## Ejecución consumida

```text
run: 30977831814
job: 92215587847
request: d354bca083e4a952b4ec27ef1625486d530f075c
artifact: 8918942209
```

## Primera etapa fallida real

```text
REQUEST_BASELINE_PROVENANCE_BEFORE_CANONICAL_PREFLIGHT
PIPELINE_MECHANISM_FAILURE
SOURCE_BASELINE_NOT_PRESENT_IN_SHALLOW_CHECKOUT
```

Error observado:

```text
fatal: Invalid revision range 548cffa50cddfd93ad2118f5a06e9bb420699bde..HEAD^
```

El checkout usó profundidad `80`, insuficiente para contener el baseline congelado.

## Frontera observada

```text
preflight canónico ejecutado: no
secretos: no
Firebase: no
Firestore read: no
Firestore writes: 0
Auth writes: 0
Functions deploy intentado: no
Functions verificadas: 0/4
Hosting deploy intentado: no
URL LAB: no
browser: no
rutas: 0/8
snapshot before: no
snapshot after: no
Rules: no
reimportación: no
producción/main/merge: no
```

`0/4` significa `no ejecutado`, no fallo de Functions.

## Root fix source-only aplicado

```text
commit: ed655ef5221cf84c5930ba4ce07da586a6fca64f
fetch-depth: 0
guard: git cat-file -e "$ORBIT360_SOURCE_BASELINE^{commit}"
```

El workflow existente fue corregido sin crear una variante. La modificación no activó runtime.

## STOP_RETRY

- autorización consumida;
- ejecuciones restantes: 0;
- no rerun del run `30977831814`;
- request v3 consumido e inmutable;
- no nuevo request runtime sin autorización explícita;
- no repetición de los 18 escenarios funcionales.

## Siguiente acción exacta

Preparar source-only un nuevo path de request y sincronizarlo con el workflow existente, vinculado al HEAD vigente y con la corrección de provenance preservada. Después de un PASS source-only, solicitar una sola autorización LAB nueva. No incluye Rules, reimportación, producción, main o merge.
