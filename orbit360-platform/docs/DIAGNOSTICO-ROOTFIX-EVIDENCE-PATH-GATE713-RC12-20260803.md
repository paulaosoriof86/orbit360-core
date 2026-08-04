# Diagnóstico y root fix — rutas de evidencia Gate 7.13 RC1.2

Fecha operativa: 2026-08-03  
Proyecto: Gravicentra Insurance / Orbit 360 A&S

## Clasificación

```text
VALIDATOR_STALE
PIPELINE_MECHANISM_FAILURE
```

## Incidencia repetida

La etapa de antirregresión Auth obtuvo PASS funcional, pero el workflow no encontró el JSON en el workspace. La familia apareció en los runs `30877460688` y `30879185924`, siempre antes de secretos, Firebase, navegador y deploy.

## Causa raíz

El validador histórico utilizaba:

```js
const ROOT = process.cwd();
const outPath = path.join(ROOT, OUT);
```

Cuando el validador se ejecutaba desde un worktree de la candidata y `OUT` representaba el destino absoluto del workspace, `path.join` acoplaba indebidamente ambos árboles. El proceso imprimía PASS, pero guardaba la evidencia en otra ubicación.

## Owner exacto

```text
tools/orbit360-validar-auth-membership-antiregression-v20260803.mjs
```

Owner corregido:

```text
tools/orbit360-validar-auth-membership-antiregression-rootfix-v20260803.mjs
```

## Correctivo estructural

El nuevo validador separa explícitamente:

- `SOURCE_ROOT`: árbol inmutable que contiene Auth, Store y Guard de la candidata;
- `OUTPUT_PATH`: ubicación observable donde el workflow exige la evidencia.

Reglas:

```text
SOURCE_ROOT = path.resolve(variable o cwd)
OUTPUT_PATH absoluto = path.normalize(valor)
OUTPUT_PATH relativo = path.resolve(cwd, valor)
```

Además, el validador comprueba que la ruta de salida sea absoluta, escribe el archivo, verifica inmediatamente que exista y conserva la evidencia sanitizada.

## Barrera metodológica

Por ser la segunda ocurrencia de la misma familia, se aplicó `STOP_RETRY`. El producto quedó congelado hasta obtener una prueba aislada que demuestre:

1. lectura source-only de la candidata exacta `b699ba329960cd830121b57452ce558399aa84fb`;
2. PASS de todos los checks Auth;
3. creación del JSON exactamente en el destino absoluto solicitado;
4. cero secretos, Firebase, escrituras, navegador, deploy o producción;
5. worktree inmutable después de la prueba.

Solo tras esa evidencia puede reanudarse el macrobloque desde la frontera anterior a secretos. No corresponde repetir Gate 7.11 ni reconstruir la candidata.

## Impacto Cloud / Claude / Academia

Clasificación:

```text
BACKEND_PROTEGIDO_NO_CLAUDE: implementación específica del gate y pipeline
REPLICABLE_CLAUDE_ACUMULADO: patrón SOURCE_ROOT / OUTPUT_PATH desacoplados
ACADEMIA_ACTUALIZAR: diferencia entre defecto funcional y validador obsoleto
```

Patrón reusable:

> Un validador que inspecciona una candidata en un worktree nunca debe inferir que la evidencia pertenece al mismo árbol. La raíz de lectura y la ruta de salida son contratos independientes y deben probarse por separado.
