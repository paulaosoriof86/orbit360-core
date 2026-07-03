# Bitácora cambios A&S backend — producción/pólizas — 2026-07-03

## 2026-07-03 — Normalización privada de producción/pólizas A&S

- **Módulo/área:** Migración real A&S / Producción / Pólizas / Clientes / Aseguradoras / Asesores.
- **Síntoma/necesidad:** La normalización previa del Excel de movimientos dejó pendiente procesar la hoja `Listado producción 2025-2026` para generar estructuras CRM reales sin subir datos al repositorio.
- **Esperado:** Transformar la hoja en `clientes[]`, `polizas[]`, `aseguradoras_referenciadas[]`, `asesores_referenciados[]` y, si era posible inferirlo, `cobros[]`, respetando deduplicación y reglas de cartera.
- **Causa raíz:** El libro mezcla secciones financieras y producción; la hoja de producción contiene datos reales de pólizas/clientes en secciones GTQ, COP y S/D, además de títulos, encabezados repetidos, subtotales y totales que no son registros importables.
- **Archivo/función:** Procesamiento privado local de `Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx`, hoja `Listado producción 2025-2026`; documentación en `docs/NORMALIZACION-PRODUCCION-POLIZAS-AYS-GT-CO-CHATGPT-20260703.md` y actualización de `docs/NORMALIZACION-MOVIMIENTOS-PRODUCCION-AYS-GT-CO-CHATGPT-20260703.md`.
- **Fix o mejora aplicada:** Se normalizaron 404 registros útiles, se deduplicaron 352 pólizas canónicas, 216 clientes, 28 aseguradoras referenciadas y 13 asesores/vendedores. Las 52 ocurrencias duplicadas de póliza quedaron separadas para validación histórica/renovación. No se generaron cobros definitivos porque la hoja no contiene forma de pago ni estado de cobro; se prepararon 231 candidatos de revisión, marcados como no importables a cartera sin validación.
- **Impacto en prototipo comercializable:** Aprendizaje aplicable al prototipo base: el importador de producción debe distinguir registros reales vs subtotales/totales, separar monedas por país, deduplicar pólizas conservando la vigencia más reciente como canónica, y nunca crear cartera si no hay evidencia de saldo pendiente.
- **Estado:** RESUELTO DOCUMENTALMENTE / payload privado local generado / sin escritura Firestore / sin datos reales en repo.

## Pendientes derivados para backend / migración

1. Cruzar pólizas con directorio de aseguradoras GT/CO ya normalizado.
2. Validar grupos de pólizas duplicadas antes de carga LAB.
3. Resolver registros con moneda `S/D` y país no confiable.
4. Complementar con forma de pago, cuotas y estado de cobro antes de generar `cobros[]` reales.
5. Correr auditoría de calidad de relaciones con el payload privado antes de cualquier escritura LAB.
6. Mantener autorización explícita de Paula para carga Firestore LAB.

## Pendientes derivados para Claude / prototipo

1. En módulo Importar, mejorar lectura multi-sección de hojas de producción con encabezados repetidos, subtotales, totales y secciones por moneda.
2. Agregar vista de prevalidación: registros útiles, excluidos, duplicados, S/D, moneda/pais y candidatos de cobro.
3. En importador visual, impedir que candidatos de cobro se carguen como cartera real si no hay estado de pendiente o forma de pago.
4. Mostrar explicación clara: producción histórica/actual no equivale automáticamente a cartera.
