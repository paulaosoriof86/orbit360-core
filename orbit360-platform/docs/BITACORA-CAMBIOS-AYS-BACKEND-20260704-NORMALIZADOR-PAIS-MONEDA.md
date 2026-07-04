# Bitácora backend A&S — Normalizador país/moneda

Fecha: 2026-07-04
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5
Estado: RESUELTO como herramienta metadata-only; integración a parser pendiente.

## Necesidad

Evitar que el backend/importador asuma Guatemala/GTQ o Colombia/COP sin evidencia confiable. Este fue un hallazgo P0 en la auditoría del candidato Claude.

## Esperado

- Detectar país/moneda desde metadatos.
- Bloquear país/moneda incoherentes.
- Bloquear país ambiguo.
- Sugerir moneda cuando país es confiable, pero exigir validación si la moneda no aparece explícita.
- No usar defaults para escritura.

## Archivos agregados

- `tools/orbit360-normalizar-pais-moneda-ays.mjs`
- `tools/orbit360-test-normalizar-pais-moneda-ays.mjs`

## Reglas implementadas

- GT + GTQ: listo metadata.
- CO + COP: listo metadata.
- GT sin moneda: requiere validación; sugiere GTQ pero no autoriza escritura automática.
- CO sin moneda: requiere validación; sugiere COP pero no autoriza escritura automática.
- GT + COP: bloqueado.
- CO + GTQ: bloqueado.
- Guatemala y Colombia en la misma metadata: bloqueado por ambigüedad.

## Impacto

Cierra una brecha crítica para migraciones multi-país. Evita mezclar monedas o clasificar registros por país sin evidencia suficiente.

## Restricciones cumplidas

No deploy. No merge. No main. No carga LAB. No datos reales. No escritura Firestore. No modificación de `Orbit.store` ni backend protegido.
