# Registro prevalidación fuente A&S

Fecha: 2026-07-04

Se agregó un orquestador seguro para prevalidar fuentes separadas antes de parser o dry-run real.

Archivos:

- `tools/orbit360-prevalidar-fuente-ays.mjs`
- `tools/orbit360-test-prevalidar-fuente-ays.mjs`
- `tools/orbit360-validar-manifest-fuente-ays.mjs`
- `tools/orbit360-test-validar-manifest-fuente-ays.mjs`

Secuencia:

```txt
contrato -> validador manifest -> validador contra contrato -> dryrun estructural
```

Resultado: si un manifest mezcla fuentes, trae payload, usa país/moneda incoherente o intenta escribir destino no permitido, el flujo se bloquea antes de avanzar.

Restricciones: sin datos reales, sin Firestore, sin deploy, sin merge y sin tocar `Orbit.store`.