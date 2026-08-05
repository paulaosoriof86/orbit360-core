# Academia Orbit 360 — Microbloque 2.3

## Tema

Diferenciar un defecto funcional de un fallo del mecanismo de checkout/provenance.

## Caso

El run `30977831814` no alcanzó el preflight canónico porque el checkout superficial no contenía el commit baseline requerido para comparar la candidata.

## Clasificación correcta

```text
PIPELINE_MECHANISM_FAILURE
```

No corresponde clasificarlo como:

- fallo de Functions;
- defecto de Cliente 360, Aseguradoras u otro módulo;
- pérdida de datos;
- error de scopes;
- fallo de seguridad.

## Regla operativa

Antes de afirmar que una candidata cambió respecto del baseline, el runner debe demostrar que ambos commits existen en el checkout.

```text
fetch-depth: 0
git cat-file -e "$BASELINE^{commit}"
git diff --quiet "$BASELINE"..HEAD^
```

## Aprendizaje por rol

### Dirección

Un valor `0/4 Functions` no significa que las Functions fallaron cuando la etapa de deploy nunca fue ejecutada.

### Operativo

La evidencia debe distinguir entre `no ejecutado`, `falló` y `pasó`. No deben interpretarse campos por su valor aislado.

### Asesor

Un bloqueo técnico del pipeline no altera clientes, pólizas, cobros ni gestiones asignadas.

### Equipo técnico

- El preflight debe ocurrir antes de secretos.
- Un checkout insuficiente se corrige en el owner del pipeline.
- El request consumido no se reutiliza.
- STOP_RETRY impide relanzar sin corregir y autorizar de nuevo.

## Evidencia del caso

```text
run: 30977831814
stage: REQUEST_BASELINE_PROVENANCE_BEFORE_CANONICAL_PREFLIGHT
secretos: no
Firebase: no
deploy: no
escrituras: 0
root fix: ed655ef5221cf84c5930ba4ce07da586a6fca64f
```
