# Mapeo de columnas por sinónimos — Importación A&S v1.104

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** mapeador creado e integrado al primer ensayo sin escritura.

## 1. Objetivo

Reducir renombres manuales después de convertir Excel a CSV. El mapeador analiza encabezados, sugiere colección Orbit y campos destino usando un diccionario de sinónimos.

## 2. Archivos creados

```txt
tools/orbit360-sinonimos-importacion-ays-v104.json
tools/orbit360-mapear-columnas-importacion-ays-v104.mjs
tools/orbit360-mapear-columnas-importacion-ays-v104.ps1
```

También se actualizó:

```txt
tools/orbit360-run-primer-ensayo-importacion-ays-v104.ps1
```

## 3. Modo seguro por defecto

El mapeador corre en dry-run por defecto:

```txt
tools/orbit360-mapear-columnas-importacion-ays-v104.ps1
```

Este modo:

- lee CSV locales;
- sugiere colección;
- sugiere campos destino;
- genera reportes en `_orbit360_reports`;
- no modifica CSV;
- no escribe Firestore;
- no sube datos al repo.

## 4. Aplicar normalización local

Solo si se desea generar CSV normalizados locales:

```txt
tools/orbit360-mapear-columnas-importacion-ays-v104.ps1 -Aplicar
```

Internamente exige confirmación `MAPEAR_AYS` y escribe únicamente en:

```txt
_orbit360_imports/ays_real/_normalizados
```

Esa carpeta está ignorada por Git.

## 5. Colecciones cubiertas por sinónimos

- asesores
- aseguradoras
- clientes
- vehiculos
- polizas
- cobros
- comisiones
- facturas
- finmovs
- reclamos

## 6. Integración al primer ensayo

El script:

```txt
tools/orbit360-run-primer-ensayo-importacion-ays-v104.ps1
```

ahora ejecuta mapeo por sinónimos en dry-run después de convertir Excel y antes de validar/cargar payload.

## 7. Regla de uso

El mapeo sugerido no debe considerarse carga final automática. Antes de escribir en LAB debe revisarse:

1. colección sugerida;
2. confianza del mapeo;
3. campos no detectados;
4. campos obligatorios faltantes;
5. moneda y país;
6. duplicados.

## 8. Estado

Mapeo por sinónimos listo para ensayo local. Pendiente ejecutar con archivos reales y revisar reportes antes de aplicar normalización o escribir en LAB.
