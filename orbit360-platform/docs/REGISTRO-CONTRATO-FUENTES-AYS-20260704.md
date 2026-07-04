# Registro contrato fuentes A&S

Fecha: 2026-07-04

Se agregó contrato canónico de fuentes de migración para Orbit 360 A&S.

Archivos:

- `tools/orbit360-generar-contrato-fuentes-ays.mjs`
- `tools/orbit360-test-generar-contrato-fuentes-ays.mjs`
- `orbit360-platform/docs/CONTRATO-CANONICO-FUENTES-MIGRACION-AYS-20260704.md`

Objetivo: unificar tipos de fuente, destinos permitidos, destinos prohibidos y reglas país/moneda antes de parser/importador real.

Restricciones: sin datos reales, sin Firestore, sin deploy, sin merge y sin modificar `Orbit.store`.