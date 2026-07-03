# Normalización movimientos y producción A&S GT/CO desde ChatGPT

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** normalización privada local realizada; datos reales NO subidos al repo.

## Archivo fuente procesado

- `Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx`

## Resultado movimientos / finanzas

- Hojas totales del libro: 44.
- Hojas mensuales GT/CO procesadas: 38.
- Movimientos reales/históricos normalizados a `finmovs`: 780.
- Pendientes/no facturados separados como `facturas` CxC/CxP: 13.

## Resultado producción / pólizas

La hoja `Listado producción 2025-2026` fue procesada posteriormente como bloque específico de migración CRM.

Resultado sin datos reales:

- Filas no vacías detectadas en la hoja: 446.
- Registros útiles de producción/póliza tras excluir títulos, encabezados, subtotales y totales: 404.
- Pólizas canónicas deduplicadas por número + país/moneda: 352.
- Ocurrencias duplicadas separadas para validación histórica/renovación: 52.
- Clientes deduplicados por nombre normalizado: 216.
- Aseguradoras referenciadas: 28.
- Asesores/vendedores referenciados: 13.
- Cobros definitivos generados: 0.
- Candidatos de cobro para revisión: 231.

Documento específico:

```txt
orbit360-platform/docs/NORMALIZACION-PRODUCCION-POLIZAS-AYS-GT-CO-CHATGPT-20260703.md
```

## Regla aplicada

- `Recaudado`, `Pagado` o histórico sin estado explícito → `finmovs`.
- `Pendiente` o `No Facturado` → no es movimiento de caja; se separa como CxC/CxP.
- Moneda por país: GT = GTQ, CO = COP.
- Producción se transformó a `polizas`, `clientes`, `aseguradoras_referenciadas` y `asesores_referenciados`.
- Cobros/cartera NO se crean desde producción si no existe forma de pago, cuota, estado de cobro o confirmación de saldo pendiente.
- Los datos reales permanecen en archivo privado local y no se suben al repo.

## Colecciones destino

```txt
finmovs
facturas
polizas
clientes
aseguradoras
asesores
```

## Hallazgo importante

El libro contiene información financiera y CRM mezclada. La migración debe mantener separación estricta:

- Movimientos de caja reales → `finmovs`.
- Pendientes/no facturados → `facturas` CxC/CxP.
- Producción/pólizas → `polizas`, `clientes`, `aseguradoras`, `asesores`.
- Cartera/cobros → solo después de validar forma de pago y estado real pendiente.

## Estado

- Normalización privada local: realizada.
- Datos reales en repo: no.
- Escritura Firestore: no.
- Producción/pólizas: procesado como payload privado local.
- Pendiente: validar duplicados de póliza, registros S/D y candidatos de cobro antes de cualquier carga LAB.
