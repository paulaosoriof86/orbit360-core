# Alcance definitivo — movimientos históricos financieros GT/CO

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Estado:** alcance corregido y definitivo para el archivo de movimientos.

## Decisión de Paula

El archivo:

```txt
Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx
```

se debe usar únicamente para:

```txt
movimientos históricos financieros de Guatemala y Colombia hasta antes de finalizar mayo
```

La hoja `Listado producción 2025-2026` debe ignorarse para migración de clientes, pólizas, cobros o cartera.

## Fuentes definitivas para migración operativa

La migración operativa se hará posteriormente con archivos actualizados y separados por entidad:

1. Clientes.
2. Pólizas.
3. Cobros realizados.
4. Planillas de aseguradoras.
5. Estados de cuenta.
6. Conciliaciones y cierres manuales según corresponda.

## Cierre de mayo, junio y julio

El cierre de mayo, junio y julio se llenará manualmente y se conciliará con:

- planillas de aseguradoras;
- estados de cuenta;
- documentos de respaldo;
- conciliación financiera;
- registros manuales validados por A&S.

## Corrección sobre análisis previo de producción

Cualquier conteo o cruce derivado de la hoja `Listado producción 2025-2026` queda invalidado como fuente de migración operativa.

Debe leerse únicamente como ejercicio exploratorio/heurístico ya superado por esta instrucción.

No debe usarse para:

- crear clientes definitivos;
- crear pólizas definitivas;
- crear cobros;
- crear cartera;
- alimentar Firestore LAB;
- alimentar seed demo;
- alimentar reportes de producción real;
- tomar decisiones finales de migración.

## Regla operativa reforzada

A partir de esta corrección:

- No generar descargables para Paula salvo solicitud explícita de paquete actualizado para Claude o paquete de entrega.
- Documentar en GitHub los cambios de alcance, reglas y pendientes.
- Solicitar archivos uno a uno, únicamente cuando sean necesarios para el siguiente bloque real de backend.
- No avanzar con inferencias de pólizas/cartera desde archivos cuyo alcance sea financiero histórico.
- Mantener la separación estricta entre movimientos financieros, clientes, pólizas, cobros y cartera.

## Estado para backend

El archivo de movimientos queda apto solo para preparar la lógica de importación histórica financiera:

- `finmovs` históricos GT/CO;
- clasificación ingreso/egreso;
- moneda por país;
- fecha contable/operativa;
- categoría financiera;
- conciliación posterior;
- trazabilidad de origen.

No queda apto para migrar pólizas ni cartera.

## Pendientes reales siguientes

Cuando corresponda, solicitar a Paula uno a uno los archivos actualizados de:

1. Clientes.
2. Pólizas.
3. Cobros realizados.
4. Planillas de aseguradoras para conciliación.
5. Estados de cuenta/cierres para mayo, junio y julio.

## Pendiente para prototipo base / Claude

El importador debe permitir marcar el alcance del archivo antes de procesarlo:

- financiero histórico;
- clientes;
- pólizas;
- cobros;
- planillas de aseguradora;
- estados de cuenta;
- soporte documental.

Si el archivo se marca como financiero histórico, el importador debe bloquear inferencias automáticas hacia clientes, pólizas, cobros o cartera, salvo confirmación manual explícita.

## Restricciones cumplidas

- No deploy.
- No merge.
- No actualización de `main`.
- No escritura Firestore.
- No carga LAB.
- No datos reales en repo.
- No modificación de `data/store.js`.
- No modificación de backend LAB protegido.

## Estado final

**Alcance definitivo documentado.**

El archivo de movimientos queda exclusivamente como fuente de histórico financiero GT/CO hasta antes de finalizar mayo. La migración operativa de clientes, pólizas y cobros se hará con archivos separados y actualizados.
