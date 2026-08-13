# Bitácora backend A&S — Validador manifest por fuente

Fecha: 2026-07-04
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5
Estado: RESUELTO como herramienta segura de validación previa.

## Necesidad

Antes de implementar parser Excel/CSV/PDF real, se requiere una barrera que valide metadatos del archivo sin leer ni subir filas reales al repositorio.

## Esperado

- Validar tipo de fuente.
- Validar país/moneda sin defaults peligrosos.
- Validar campos mínimos por fuente.
- Validar colecciones destino permitidas.
- Bloquear manifests con payload real embebido.
- Bloquear `write_enabled=true`.
- Mantener modo dry-run/preview.

## Archivos agregados

- `tools/orbit360-validar-manifest-fuente-ays.mjs`
- `tools/orbit360-test-validar-manifest-fuente-ays.mjs`

## Reglas implementadas

- Tipos de fuente autorizados:
  - clientes
  - aseguradoras
  - polizas
  - vehiculos
  - cobros_realizados
  - planilla_aseguradora
  - planilla_comisiones
  - estado_cuenta_bancario
  - financiero_historico
  - siniestros
  - documentos_soporte
  - configuracion_catalogo

- País/moneda:
  - GT -> GTQ
  - CO -> COP
  - país/moneda faltante exige validación.

- Bloqueos explícitos:
  - financiero_historico no puede escribir clientes/pólizas/cobros/aseguradoras.
  - estado_cuenta_bancario no puede crear clientes/pólizas/cobros directamente.
  - documentos_soporte no puede escribir clientes/pólizas directamente.
  - manifests con filas embebidas quedan bloqueados.
  - escritura activada queda bloqueada.

## Tests sintéticos

Casos cubiertos:

1. cliente válido;
2. financiero histórico intentando escribir clientes;
3. país/moneda incoherente;
4. payload de filas prohibido;
5. pólizas con campos mínimos faltantes.

## Impacto en prototipo comercializable

Permite validar migraciones de A&S y futuros clientes sin depender del formato exacto del archivo ni hardcodear datos. Reduce riesgo de contaminación entre fuentes.

## Restricciones cumplidas

No deploy. No merge. No main. No carga LAB. No datos reales. No escritura Firestore. No modificación de `Orbit.store` ni backend protegido.
