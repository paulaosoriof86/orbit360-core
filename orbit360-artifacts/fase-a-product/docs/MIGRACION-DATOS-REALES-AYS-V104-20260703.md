# Migración de datos reales A&S — carril seguro v1.104

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** preparación, validación, payload dry-run y cargador LAB controlado.

## 1. Objetivo

Acercar Orbit 360 al uso real de A&S sin comprometer estabilidad ni escalabilidad. Este carril permite preparar, validar y ensayar carga de archivos reales localmente antes de escribir en Firestore LAB.

## 2. Regla principal

Los datos reales NO se suben al repositorio, NO se escriben en `data/seed.js` y NO se hardcodean en módulos.

Los datos reales viven localmente en:

```txt
_orbit360_imports/ays_real
```

Esa carpeta está ignorada por Git.

## 3. Archivos creados

```txt
tools/orbit360-schema-importacion-ays-v104.json
tools/orbit360-validar-importacion-ays-v104.mjs
tools/orbit360-preparar-importacion-ays-v104.ps1
tools/orbit360-cargar-importacion-ays-lab-v104.mjs
```

También se actualizó:

```txt
.gitignore
tools/orbit360-run-flujo-ays-lab-v99.ps1
```

## 4. Orden de trabajo

1. Preparar carpetas y plantillas locales.
2. Colocar CSV/JSON reales en `_orbit360_imports/ays_real`.
3. Validar estructura y reglas mínimas.
4. Corregir errores de columnas, ids, país o moneda.
5. Ejecutar dry-run de payload.
6. Ejecutar flujo maestro A&S LAB v104.
7. Solo con autorización explícita, escribir en Firestore LAB.

## 5. Preparar carpetas locales

Desde la raíz del repo local:

```txt
tools/orbit360-preparar-importacion-ays-v104.ps1
```

Este script:

- verifica rama obligatoria;
- crea `_orbit360_imports/ays_real`;
- crea plantillas CSV vacías si faltan;
- no reemplaza archivos existentes;
- no hace commit;
- no hace push;
- no hace deploy;
- no carga datos.

## 6. Validar archivos reales

```txt
node tools/orbit360-validar-importacion-ays-v104.mjs _orbit360_imports/ays_real
```

El validador revisa:

- columnas requeridas por colección;
- ids faltantes;
- ids duplicados;
- país reconocido;
- moneda reconocida;
- nombres de columnas sensibles no permitidas;
- compatibilidad con esquema de colecciones Orbit.

## 7. Colecciones iniciales soportadas

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
- documentos
- gestiones
- negocios

## 8. Reglas de negocio protegidas

- Moneda por país; no mezclar GTQ/COP/USD en totales brutos.
- Producción, metas y comisiones sobre prima neta recaudada.
- Factura de comisión a aseguradora crea CxC, no movimiento de caja.
- `finmov` solo cuando entra o sale dinero real.
- Pólizas vigentes/por renovar generan cartera y recibos.
- Pólizas vencidas/canceladas quedan como histórico, no cartera.
- Cartera = cobros pendientes de pólizas vigentes/por renovar del año actual.

## 9. Dry-run y carga LAB controlada

Dry-run, sin escritura:

```txt
node tools/orbit360-cargar-importacion-ays-lab-v104.mjs --input _orbit360_imports/ays_real --tenant alianzas-soluciones
```

Escritura LAB, solo con autorización explícita y configuración local:

```txt
node tools/orbit360-cargar-importacion-ays-lab-v104.mjs --input _orbit360_imports/ays_real --tenant alianzas-soluciones --project <PROJECT_ID_LAB> --write --confirm ESCRIBIR_LAB_AYS
```

El cargador:

1. lee únicamente `_orbit360_imports/ays_real`;
2. genera payload local en `_orbit360_exports`;
3. escribe solo en `tenantId/alianzas-soluciones/{coleccion}/{id}` cuando se usan flags de escritura;
4. deja reporte con conteos por colección;
5. marca cada registro con metadata de migración;
6. no toca producción;
7. no debe usarse con datos en repo.

## 10. Estado

Carril técnico de migración real queda listo para preparar archivos, validar estructura, generar dry-run y cargar a Firestore LAB solo con confirmación explícita. Pendiente: ejecutar localmente con archivos reales y revisar reportes antes de cualquier escritura LAB.
