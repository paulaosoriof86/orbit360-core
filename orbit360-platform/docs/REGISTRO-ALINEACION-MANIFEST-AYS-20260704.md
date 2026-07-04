# Registro alineación manifest A&S

Fecha: 2026-07-04

Se alineó el validador principal de manifests con el contrato canónico de fuentes.

Archivos actualizados:

- `tools/orbit360-validar-manifest-fuente-ays.mjs`
- `tools/orbit360-test-validar-manifest-fuente-ays.mjs`

Cambios:

- Banco debe ir a `conciliacionBanco`, no a `finmovs`.
- Documentos pueden ir a `documentos` o `parchesPendientes`, no a `clientes` directo.
- Planilla aseguradora queda orientada a `cobros`.
- Configuración queda limitada a `configuracion` y `catalogos`.
- Tests sintéticos actualizados.

Sin datos reales, sin Firestore, sin deploy, sin merge y sin tocar `Orbit.store`.