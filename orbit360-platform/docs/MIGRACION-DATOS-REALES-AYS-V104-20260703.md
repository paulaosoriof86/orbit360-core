# Migración de datos reales A&S — carril seguro v1.104

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** preparación y validación local; sin carga real automática.

## 1. Objetivo

Acercar Orbit 360 al uso real de A&S sin comprometer estabilidad ni escalabilidad. Este carril permite preparar y validar archivos reales localmente antes de cargarlos a Firestore LAB.

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
5. Ejecutar flujo maestro A&S LAB v104.
6. Solo después crear cargador LAB controlado hacia Firestore.

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

## 9. Qué falta para cargar a Firestore LAB

Todavía falta crear el cargador controlado. Debe cumplir:

1. leer únicamente `_orbit360_imports/ays_real`;
2. exigir validación OK previa;
3. pedir confirmación explícita para escribir;
4. escribir solo en tenant `alianzas-soluciones`;
5. dejar reporte con conteos por colección;
6. marcar cada registro con metadata de migración;
7. no escribir secretos;
8. no tocar producción.

## 10. Estado

Preparación y validación de importación real quedan listas en rama. El siguiente bloque debe crear el cargador LAB controlado, pero solo para LAB y con confirmación explícita antes de escribir.
