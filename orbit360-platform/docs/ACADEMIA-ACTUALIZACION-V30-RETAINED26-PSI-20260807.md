# Academia — actualización v30

- Diferenciar registros importables de registros retenidos por calidad.
- `REQUIERE_VALIDACION` no equivale a borrado ni a cliente válido: es evidencia pendiente.
- Un registro retenido no debe convertirse en efectivo sin decisión humana/auditable.
- Para reconciliar datos reales sin exponer PII, usar intercambio cifrado efímero y devolver solo clasificación/digest.
- La ausencia de metadatos de procedencia exige cambiar de evidencia, no repetir el mismo validador.
- Si la adjudicación demuestra altas legítimas adicionales, el contrato debe marcarse stale; nunca se fuerza 414.
