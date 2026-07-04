# Registro validador manifest contra contrato A&S

Fecha: 2026-07-04

Se agregó validador seguro para comparar manifests de fuente contra el contrato canónico de migración.

Archivos:

- `tools/orbit360-validar-manifest-contra-contrato-fuentes-ays.mjs`
- `tools/orbit360-test-validar-manifest-contra-contrato-fuentes-ays.mjs`

Validaciones principales:

- source_type autorizado;
- destinos permitidos según fuente;
- destinos prohibidos bloqueados;
- campos requeridos declarados;
- país/moneda coherentes;
- bloqueo de payloads o filas embebidas en manifest.

Impacto: antes de cualquier parser o dry-run real, el manifest puede bloquearse si intenta mezclar fuentes o escribir colecciones equivocadas.

Restricciones: no datos reales, no Firestore, no deploy, no merge, no `Orbit.store`.