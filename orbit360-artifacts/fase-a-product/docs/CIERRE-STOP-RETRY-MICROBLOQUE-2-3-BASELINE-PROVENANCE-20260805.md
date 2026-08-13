# CIERRE STOP_RETRY — MICROBLOQUE 2.3

Fecha local: 2026-08-04 23:23 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate: `GO_LAB_CANDIDATE_VISIBLE`  
Run: `30977831814`  
Estado: `STOP_RETRY_DEFINITIVE_BASELINE_PROVENANCE`

## Resultado observado

La única ejecución autorizada inició con el request v3 `d354bca083e4a952b4ec27ef1625486d530f075c` y se detuvo en la verificación de request/baseline, antes del preflight canónico.

```text
Functions verificadas: 0/4
Functions deploy intentado: no
Hosting deploy intentado: no
URL LAB retenida: no
Rutas visuales ejecutadas: 0/8
Snapshot before: no
Snapshot after: no
Secretos: no
Firebase: no
Firestore read: no
Firestore writes: 0
Auth writes: 0
Rules: no
Reimportación: no
Producción/main/merge: no
```

## Clasificación

```text
PIPELINE_MECHANISM_FAILURE
```

No se demostró:

- `FUNCTIONAL_DEFECT`;
- `DATA_CONTRACT_FAILURE`;
- `SECURITY_FAILURE`;
- fallo de las cuatro Functions;
- pérdida de datos;
- alteración de la candidata.

## Causa raíz

Owner:

```text
.github/workflows/orbit360-block12-visual-layoutfree-reactivation-lab-v20260804.yml
```

El workflow hizo checkout con `fetch-depth: 80` y después ejecutó:

```text
git diff --quiet 548cffa50cddfd93ad2118f5a06e9bb420699bde..HEAD^
```

El baseline congelado estaba fuera del historial superficial disponible. Git devolvió:

```text
fatal: Invalid revision range 548cffa50cddfd93ad2118f5a06e9bb420699bde..HEAD^
```

La falla ocurrió en `REQUEST_BASELINE_PROVENANCE_BEFORE_CANONICAL_PREFLIGHT`.

## Root fix aplicado source-only

Commit:

```text
ed655ef5221cf84c5930ba4ce07da586a6fca64f
```

Cambios:

```text
fetch-depth: 0
git cat-file -e "$ORBIT360_SOURCE_BASELINE^{commit}"
```

El workflow existente conserva el mismo owner y no se creó una variante. La actualización del workflow no coincide con el path disparador, por lo que no produjo otro runtime.

## Evidencia

```text
artifactId: 8918942209
digest: sha256:c7ccb5f221b2986009a94657011750d36d94b05228ca595377d87cb3d0904f09
request blob: 82461e6a9699f1d8469d201be90bc40688e50613
workflow rootfix blob: 5b3a0246d17d5fad76203e0d2cb0380746a4ea9d
```

El archivo `preflight-sanitizado.json` incluido en el artefacto era una evidencia histórica versionada del repo; este run no ejecutó ni produjo el preflight canónico.

## STOP_RETRY

- La autorización quedó consumida.
- No se reejecuta el run `30977831814`.
- No se modifica el request v3 consumido.
- No se crea otro request runtime sin autorización explícita nueva.
- No se repiten los 18 escenarios funcionales.

## Siguiente acción exacta

Preparar source-only un nuevo path de request vinculado al HEAD que esté vigente en ese momento, conservar el checkout completo y el guard del baseline, y validar el contrato sin secretos ni deploy. Solo después solicitar una nueva autorización para una única ejecución LAB.
