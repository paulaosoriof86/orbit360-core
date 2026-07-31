# Auditoría sanitizada de delta — Pólizas Canceladas 31/07/2026

Fecha: 2026-07-31  
Modo: `READ_ONLY_DIFF / NO_WRITE / NO_REIMPORT`  
Fuente manifestada: `Polizas Canceladas al 31 de julio.xlsx`  
SHA-256: `4c30282888cf7c84b2361d01fc9042d7a48384535f6463543275e9bd6bf0d8ff`  
Baseline comparado: paquete canónico privado de 1,373 Pólizas ya escrito en LAB.  
Contenido real/PII en repo: **NO**.

## Resultado

- registros de canceladas en fuente vigente: **470**;
- match fuerte contra baseline canónico por número de póliza + vigencia + asegurado + aseguradora: **470/470**;
- ambiguos: **0**;
- no encontrados: **0**;
- estado canónico `Cancelada`: **470/470**;
- estado fuente `Cancelada`: **470/470**;
- reimportación requerida para corregir estado: **NO**.

## Comparación de campos ya canónicos

- `primaNeta`: 469 coincidencias exactas/tolerancia monetaria; **1 diferencia**;
- `primaTotal`: 469 coincidencias exactas/tolerancia monetaria; **1 diferencia**;
- `frecuencia`: 460 coincidencias; 10 ausentes en ambas capas; diferencias con valor en ambas: 0;
- `conductoPago`: 411 coincidencias; faltantes de origen/canónico presentes; diferencias con valor comparable: 0.

La única discrepancia monetaria se conserva en `HOLD_REQUIERE_VALIDACION`; este análisis no modifica el baseline y no elige automáticamente cuál valor prevalece.

## Detalle adicional disponible en la fuente vigente

Cobertura estructural sobre las 470 pólizas canceladas:

- tipo de emisión: 470;
- fecha de cancelación: 470;
- bien asegurado: 407;
- frecuencia: 460;
- conducto de pago: 411;
- motivo de cancelación: 45;
- plan/coberturas: 30;
- comentarios de póliza: 23;
- concepto: 1.

Estos campos son candidatos de **enriquecimiento selectivo**, no de reimportación total.

## Decisión de causa raíz

El archivo actualizado de canceladas no invalida la migración de Pólizas ya ejecutada. La estrategia correcta es:

1. preservar los 1,373 documentos existentes;
2. no volver a crear IDs ni relaciones;
3. construir un diff por campo únicamente para atributos nuevos/actualizados;
4. dejar cualquier conflicto monetario o contractual en `REQUIERE_VALIDACION`;
5. no escribir mientras el manifiesto rector de fuentes permanezca `OPEN_PENDING_MORE_FILES`;
6. si al cerrar el manifiesto hay cambios elegibles, usar un único dry-run idempotente y una única autorización macro para el delta, nunca una reimportación.

## Estado

```text
MATCH: 470/470
STATE_ALREADY_CORRECT: 470/470
REIMPORT: NO
NEW_DETAIL_AVAILABLE: YES
MONETARY_CONFLICTS: 1 HOLD
FIRESTORE_WRITES: 0
OPERATIONAL_WRITES: 0
COBROS: NOT_TOUCHED
```
