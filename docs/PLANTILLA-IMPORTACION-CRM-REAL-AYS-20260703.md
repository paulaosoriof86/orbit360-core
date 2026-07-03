# Plantilla de importación CRM real A&S — Orbit 360

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-continuidad-20260703`  
**Archivo generado:** `Plantilla_Importacion_CRM_Real_AYS_Orbit360.xlsx`  
**Estado:** plantilla de apoyo, no reemplaza export real del CRM.

## 1. Propósito

La plantilla sirve para normalizar datos si el CRM actual no exporta todos los campos de forma ordenada. Si el CRM actual exporta Excel/CSV completo, se debe preferir el export real y usar esta plantilla solo como mapa de campos y validación.

## 2. Hojas incluidas

- `Instrucciones`
- `Asesores`
- `Aseguradoras`
- `Clientes`
- `Polizas`
- `Cobros_Cartera`
- `Cobros_Historicos`
- `Vehiculos`
- `Siniestros`
- `Comisiones_Facturas`
- `FinMovs`
- `Listas`

## 3. Regla de uso

- No pegar datos reales en `seed.js`.
- No hardcodear datos reales en módulos.
- Usar la plantilla solo para carga al backend/tenant A&S o como normalizador previo.
- Guardar cada importación como `import_batch`.
- Generar reporte de creados, actualizados, duplicados, omitidos y por revisar.

## 4. Relación con CRUD manual

La plantilla acelera migración, pero no reemplaza la operación diaria. La plataforma debe permitir crear y editar manualmente los mismos registros desde UI.

## 5. Estado

**Estado:** GENERADA EN SANDBOX.  
**Uso:** adjuntar/usar cuando se requiera normalizar el export del CRM actual A&S.
