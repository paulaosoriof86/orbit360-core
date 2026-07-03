# Normalización movimientos y producción A&S GT/CO desde ChatGPT

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** normalización privada local realizada; datos reales NO subidos al repo.

## Archivo fuente procesado

- `Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx`

## Resultado

- Hojas totales del libro: 44.
- Hojas mensuales GT/CO procesadas: 38.
- Movimientos reales/históricos normalizados a `finmovs`: 780.
- Pendientes/no facturados separados como `facturas` CxC/CxP: 13.
- Pólizas detectadas en `Listado producción 2025-2026`: 441.

## Regla aplicada

- `Recaudado`, `Pagado` o histórico sin estado explícito → `finmovs`.
- `Pendiente` o `No Facturado` → no es movimiento de caja; se separa como CxC/CxP.
- Moneda por país: GT = GTQ, CO = COP.
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

El libro también contiene `Listado producción 2025-2026`, que sirve para arrancar migración de pólizas históricas/actuales. Este listado debe transformarse a:

```txt
polizas[]
clientes[] deduplicados por nombre/documento si existe
aseguradoras[] por nombre
asesores[] por vendedor
```

## Estado

- Normalización privada local: realizada.
- Datos reales en repo: no.
- Escritura Firestore: no.
- Pendiente: validar pólizas contra clientes/aseguradoras ya normalizadas y clasificar estado por vigencia.
