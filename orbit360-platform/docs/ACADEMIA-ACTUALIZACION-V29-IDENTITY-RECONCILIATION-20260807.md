# Academia Orbit 360 — actualización v29
Fecha: 2026-08-07

## Lección: identidad no es procedencia
Un registro puede carecer de `source`, batch y actor y aun así poder adjudicarse objetivamente como duplicado mediante una identidad exacta contra un baseline autoritativo. Esto no autoriza inferencias por nombre aproximado ni por fecha.

## Regla operativa
1. Preferir identificador documental fuerte exacto cuando existe.
2. Si la fuente de migración ya definió un criterio de duplicado exacto, puede reutilizarse únicamente en su forma exacta y documentada. Para clientes A&S el dry-run sanitizado define `IDENTIDAD_NORMALIZADA_IGUAL` y separa expresamente duplicados probables, que no se fusionan automáticamente.
3. Una coincidencia de nombre con documento fuerte distinto es contradicción.
4. Referencias demo/prototipo se procesan solo en memoria y nunca se mezclan con datos reales.
5. Si no existe coincidencia objetiva, la evidencia debe cambiar de fuente: auditoría externa registrada. No repetir los mismos campos ni convertir `createTime` en prueba de legitimidad.

## Diferencia de causas
- `VALIDATOR_STALE`: la evidencia objetiva demuestra que el contrato/validador quedó desactualizado.
- `DATA_CONTRACT_FAILURE`: falta o contradice evidencia necesaria para adjudicar datos.
- `PIPELINE_MECHANISM_FAILURE`: el mecanismo de prueba falla antes de producir evidencia de producto/datos.

## Gate condicionado
La reconciliación de identidad precede al universe gate. Solo con los 16 casos resueltos se valida 414 clientes / 26 aseguradoras / 7 asesores. Visualización queda después del universe PASS.
