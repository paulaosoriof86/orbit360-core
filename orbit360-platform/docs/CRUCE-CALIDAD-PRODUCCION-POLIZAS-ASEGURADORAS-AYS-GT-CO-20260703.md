# Cruce de calidad producción/pólizas vs aseguradoras A&S GT/CO

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Bloque:** cruce y auditoría de calidad antes de cualquier carga LAB  
**Fuente privada:** payload normalizado de producción/pólizas  
**Directorios privados:** directorios de aseguradoras GT/CO  
**Estado:** documentado sin datos reales; no apto aún para carga Firestore LAB completa.

## 1. Alcance

Este bloque no reabre ni reemplaza la normalización de producción/pólizas ya cerrada. Usa el payload privado normalizado como insumo y cruza sus aseguradoras referenciadas contra los directorios GT/CO para identificar calidad de datos antes de cualquier dry-run o escritura LAB.

El repo conserva solo conteos, reglas, hallazgos y pendientes. No se suben nombres de clientes, números de póliza, importes, payloads ni datos reales.

## 2. Resultado del cruce de aseguradoras

| Métrica | Resultado |
|---|---:|
| Aseguradoras referenciadas en producción/pólizas | 28 |
| Coincidencias seguras con país confiable | 21 |
| Coincidencias probables bloqueadas por país/moneda S/D | 4 |
| No encontradas en directorio del país | 3 |
| Nombres ambiguos | 0 |
| Nombres vacíos en lista de aseguradoras referenciadas | 0 |

Interpretación:

- Las 21 coincidencias seguras pueden usarse para homologación estructural, siempre sin crear cartera.
- Las 4 coincidencias probables no se deben autovincular porque el país/moneda quedó como `S/D`.
- Las 3 no encontradas deben resolverse contra directorio, aliado, canal o configuración antes de carga LAB.

## 3. Calidad de pólizas canónicas antes de LAB

| Estado de calidad | Pólizas |
|---|---:|
| Listas para dry-run estructural sin cartera | 336 |
| Con advertencias no críticas por asesor/vendedor | 4 |
| Bloqueadas por causas críticas | 12 |
| Total pólizas canónicas revisadas | 352 |

Las 12 bloqueadas críticas se originan por una o más de estas causas:

- país/moneda `S/D`;
- aseguradora no homologada en el país detectado;
- vigencia no válida;
- aseguradora vacía.

## 4. Duplicados de póliza

| Clasificación | Grupos | Ocurrencias duplicadas |
|---|---:|---:|
| Posible renovación / versión histórica | 48 | 48 |
| Conflicto | 4 | 4 |
| Repetición exacta | 0 | 0 |
| Posible corrección de importe | 0 | 0 |

Regla aplicada:

- Si se conserva el mismo número de póliza, mismo asegurado y misma aseguradora, pero cambia vigencia, se clasifica como posible renovación o versión histórica.
- Si cambia asegurado o aseguradora bajo el mismo número, se clasifica como conflicto.
- Los conflictos no pueden cargarse automáticamente.

## 5. Moneda y país S/D

| Hallazgo | Resultado |
|---|---:|
| Pólizas con país/moneda S/D | 4 |
| Coincidencia probable de aseguradora, pero país/moneda no confiable | 4 |

Regla: no asignar país automáticamente por nombre de aseguradora si la sección/moneda original viene `S/D`. Debe resolverse con fuente operativa o validación humana.

## 6. Asesores/vendedores

| Estado | Grupos | Registros/pólizas referenciadas |
|---|---:|---:|
| Persona identificable | 8 | 388 |
| Entidad no persona | 1 | 6 |
| Compuesto / aliado / mixto | 3 | 6 |
| Sin asesor | 1 | 4 |

Regla: el asesor/vendedor puede quedar como advertencia si la póliza está estructuralmente correcta, pero debe normalizarse antes de reportes comerciales, comisiones, metas o asignaciones de cartera.

## 7. Cartera y cobros

No se genera cartera real.

| Métrica | Resultado |
|---|---:|
| Cobros definitivos | 0 |
| Candidatos de cobro que permanecen en validación | 231 |

Motivo: producción/póliza no equivale a cobro pendiente. Para cartera se requiere evidencia de saldo, forma de pago, estado de cobro, cuotas o recibos pendientes.

## 8. Listo para dry-run LAB vs bloqueado

### Potencialmente listo para dry-run estructural

- 336 pólizas canónicas con país/moneda, vigencia y aseguradora homologada.
- El dry-run debe excluir cartera real y mantener cobros como candidatos pendientes.
- El dry-run debe ejecutarse solo con autorización explícita.

### Sigue bloqueado

- 12 pólizas con bloqueo crítico.
- 52 duplicados hasta decidir si son renovaciones/histórico/conflictos.
- 231 candidatos de cobro como cartera real.
- Cualquier registro que requiera asesor definitivo para comisiones, metas o cartera.

## 9. Pendientes backend / migración

1. Resolver las 3 aseguradoras no encontradas en el directorio del país.
2. Resolver las 4 pólizas con país/moneda `S/D`.
3. Revisar 4 conflictos de duplicados antes de permitir carga automática.
4. Decidir tratamiento de 48 posibles renovaciones/versiones históricas.
5. Normalizar asesor/vendedor en 16 registros/pólizas con entidad, compuesto o sin asesor.
6. Mantener los 231 candidatos de cobro fuera de cartera real.
7. Preparar dry-run LAB solo después de autorización explícita.

## 10. Pendientes para prototipo base / Claude

Aplicar al importador manual/inteligente de producción/pólizas:

1. Cruce automático contra catálogo de aseguradoras por país.
2. Estados de cruce: exacto, alias seguro, probable, ambiguo, no encontrado, vacío.
3. Bloqueo si país/moneda viene `S/D`, aunque el nombre parezca coincidir.
4. Panel previo de duplicados: renovación, repetición, corrección, conflicto.
5. No sobrescribir pólizas con conflicto de asegurado o aseguradora.
6. Advertencias separadas para asesor entidad, asesor compuesto/aliado y sin asesor.
7. Separar póliza lista para dry-run de cobro/cartera real.
8. Bloquear cartera si no hay saldo, cuotas, forma de pago o estado real de cobro.

## 11. Restricciones cumplidas

- No deploy.
- No merge.
- No actualización de `main`.
- No escritura Firestore.
- No subida de datos reales al repo.
- No payload privado en GitHub.
- No secretos.
- No modificación de `data/store.js`.
- No modificación del backend LAB protegido.

## Estado final

**Cruce y auditoría de calidad: DOCUMENTADO.**

Siguiente paso recomendado: resolver bloqueos críticos y preparar un dry-run LAB únicamente de estructura, sin cartera, cuando exista autorización explícita.
