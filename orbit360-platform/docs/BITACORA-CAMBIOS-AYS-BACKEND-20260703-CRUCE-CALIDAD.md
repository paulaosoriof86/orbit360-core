# Bitácora cambios backend A&S — Cruce calidad producción/pólizas

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Tipo:** auditoría de calidad / migración privada  
**Estado:** RESUELTO para documentación; ABIERTO para resolución de bloqueos antes de LAB.

## Entrada

- **Módulo / área:** Migración real A&S — Producción, pólizas, aseguradoras, asesores y cartera.
- **Síntoma/necesidad:** después de normalizar producción/pólizas era necesario cruzar las aseguradoras referenciadas contra directorios GT/CO, revisar duplicados y bloquear cualquier carga insegura a LAB.
- **Esperado:** identificar qué está listo para dry-run estructural, qué sigue bloqueado y qué debe mejorar el prototipo base/importador.
- **Causa raíz si aplica:** el Excel de producción mezcla secciones, monedas, registros históricos, posibles renovaciones, totales/subtotales y referencias que no siempre están homologadas con directorios.
- **Archivo/función:** análisis privado sobre payload local; documentación en `orbit360-platform/docs/CRUCE-CALIDAD-PRODUCCION-POLIZAS-ASEGURADORAS-AYS-GT-CO-20260703.md`.
- **Fix/mejora aplicada:** se generó cruce privado contra directorios GT/CO, clasificación de aseguradoras, revisión de duplicados, validación de país/moneda S/D, análisis de asesores/vendedores y readiness previo a LAB.
- **Impacto en prototipo comercializable:** aplica a prototipo base. El importador debe agregar prevalidación de aseguradoras, moneda, duplicados, asesor/vendedor y bloqueo de cartera sin evidencia de cobro.
- **Estado:** DOCUMENTADO / PENDIENTES ABIERTOS.

## Conteos documentados sin datos reales

| Métrica | Resultado |
|---|---:|
| Aseguradoras referenciadas | 28 |
| Coincidencias seguras país confiable | 21 |
| Probables bloqueadas por país/moneda S/D | 4 |
| No encontradas en directorio país | 3 |
| Pólizas canónicas revisadas | 352 |
| Listas para dry-run estructural sin cartera | 336 |
| Con advertencias no críticas | 4 |
| Bloqueadas críticas | 12 |
| Ocurrencias duplicadas revisadas | 52 |
| Posibles renovaciones/versiones históricas | 48 |
| Conflictos de duplicado | 4 |
| Cobros definitivos | 0 |
| Candidatos de cobro en validación | 231 |

## Pendientes bloqueantes antes de LAB

1. Resolver las aseguradoras no encontradas en el directorio del país.
2. Resolver país/moneda S/D.
3. Revisar conflictos de duplicados.
4. Decidir tratamiento de posibles renovaciones/versiones históricas.
5. Normalizar asesor/vendedor cuando sea entidad, mixto o sin asesor.
6. Mantener candidatos de cobro fuera de cartera real.

## Pendiente para prototipo base / Claude

Aplicar a prototipo base:

- Importador con cruce contra catálogo de aseguradoras por país.
- Estados de cruce exacto/probable/ambiguo/no encontrado/vacío.
- Bloqueo si país/moneda viene S/D.
- Clasificador de duplicados renovación/repetición/corrección/conflicto.
- Prevalidación de asesor/vendedor.
- Separación estricta entre producción, póliza, cobro y cartera.

## Restricciones cumplidas

- No deploy.
- No merge.
- No main.
- No Firestore.
- No payload real en repo.
- No secretos.
- No modificación de `data/store.js`.
- No modificación de backend LAB protegido.
