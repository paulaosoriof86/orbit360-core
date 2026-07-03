# Normalización movimientos financieros históricos A&S GT/CO desde ChatGPT

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** corregido al alcance definitivo indicado por Paula; datos reales NO subidos al repo.

## Archivo fuente procesado

```txt
Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx
```

## Alcance definitivo

El archivo se usa únicamente para movimientos históricos financieros de Guatemala y Colombia hasta antes de finalizar mayo.

La hoja `Listado producción 2025-2026` queda ignorada para migración operativa y no debe usarse para clientes, pólizas, cobros, cartera, Firestore LAB, seed demo ni reportes reales de producción.

## Resultado financiero estructural sin datos reales

| Métrica | Resultado |
|---|---:|
| Hojas totales del libro | 44 |
| Hojas mensuales GT/CO detectadas | 38 |
| Hojas históricas migrables hasta abril 2026 | 36 |
| Hojas mayo 2026 solo referencia/no cierre | 2 |
| Hojas soporte/no mensuales | 6 |
| Registros candidatos históricos hasta abril 2026 | 804 |
| Ingresos candidatos | 256 |
| Egresos candidatos | 548 |
| Registros candidatos Guatemala | 568 |
| Registros candidatos Colombia | 236 |

Estos conteos son estructurales. No contienen importes ni terceros en el repo y no equivalen a carga Firestore.

## Regla aplicada corregida

- Movimientos históricos financieros → futura colección `finmovs`, solo con autorización explícita.
- Mayo 2026 → referencia/no cierre; será llenado y conciliado manualmente.
- Junio y julio → cierre manual y conciliación con planillas/estados de cuenta.
- Producción detectada en el mismo workbook → ignorada para migración.
- Clientes, pólizas y cobros → se migrarán después desde archivos actualizados y separados.
- Cartera → nunca se crea desde movimientos financieros.

## Colección destino futura

```txt
finmovs
```

No se habilitan como destino desde este archivo:

```txt
clientes
polizas
cobros
cartera
aseguradoras
asesores
```

## Documentos vigentes

```txt
orbit360-platform/docs/ALCANCE-DEFINITIVO-MOVIMIENTOS-HISTORICOS-GT-CO-20260703.md
orbit360-platform/docs/CIERRE-MOVIMIENTOS-HISTORICOS-FINANCIEROS-GT-CO-20260703.md
orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260703-MOVIMIENTOS-HISTORICOS.md
```

## Documentos superados

Los documentos de producción/pólizas derivados de la hoja `Listado producción 2025-2026` quedan como trazabilidad únicamente y no deben usarse para migración operativa.

## Estado

- Normalización privada local: corregida al alcance financiero.
- Datos reales en repo: no.
- Escritura Firestore: no.
- Carga LAB: no.
- Deploy: no.
- Merge/main: no.
