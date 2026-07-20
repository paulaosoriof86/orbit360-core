# Bloque 1 · Causa raíz del país de Clientes 360 · 2026-07-19

## Clasificación

`DATA_CONTRACT_FAILURE`.

## Síntoma confirmado

Cliente 360 cargaba los 414 expedientes, pero el filtro Colombia quedaba vacío porque el payload inicial había persistido país Guatemala por defecto. El problema no dependía de pólizas ni de moneda inferida desde relaciones posteriores.

## Evidencia de fuente

La fuente de Clientes conserva `Cod. Región`:

- `502` → Guatemala / GTQ;
- `57` → Colombia / COP;
- ausente o no confiable → `REQUIERE_VALIDACION`, sin moneda asumida.

La trazabilidad LAB conserva simultáneamente `trazabilidad.fila` y `_migration.sourceRow`. Ambos campos cubren los 414 registros, coinciden entre sí y permitieron cruzar la fuente sin usar nombres, documentos, teléfonos ni pólizas.

## Corrección de datos LAB

Run sanitizado `29708787497`:

- antes: 234 GT, 15 CO y 165 por validar;
- plan fuente y resultado: 337 GT, 16 CO y 61 por validar;
- 119 registros modificados;
- auditoría y rollback disponibles;
- cero PII o secretos en la evidencia;
- sin producción, merge ni main.

La corrección previa basada solo en geografía se conservó en auditoría, pero fue sustituida por la regla fuente más confiable.

## Prevención reusable

La proyección canónica:

- reconoce `pais`, `paisCodigo`, `codigoPais` y `country`;
- reconoce `codigoPaisTelefono`, `codRegion`, `codigoRegion` y `regionCode` cuando existan;
- trata un conflicto entre país declarado y código regional como `REQUIERE_VALIDACION`;
- nunca utiliza pólizas, primas o moneda derivada para inventar país;
- conserva `REQUIERE_VALIDACION` como estado canónico honesto.

El validador exige exactamente:

```txt
GT: 337
CO: 16
REQUIERE_VALIDACION: 61
```

y comprueba que el filtro Colombia muestre exactamente 16 registros.

## Preservado

- 414 clientes;
- 26 aseguradoras;
- 7 asesores;
- Store, Auth, Router, importador protegido y reglas;
- separación Clientes/Pólizas/Cobros;
- datos posteriores al 9 de julio pendientes para Bloque 4.
