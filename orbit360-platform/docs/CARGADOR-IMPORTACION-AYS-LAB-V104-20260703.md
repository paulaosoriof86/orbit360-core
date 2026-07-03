# Cargador importación A&S LAB v1.104

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** creado; por defecto opera en `dry-run`.

## 1. Archivo

```txt
tools/orbit360-cargar-importacion-ays-lab-v104.mjs
```

## 2. Objetivo

Preparar el puente entre archivos reales locales y Firestore LAB, sin meter datos reales al repositorio y sin escribir en producción.

## 3. Modo seguro por defecto

Si se ejecuta sin flags de escritura, solo prepara payload local y reporte:

```txt
node tools/orbit360-cargar-importacion-ays-lab-v104.mjs --input _orbit360_imports/ays_real
```

Resultado esperado:

- lee CSV/JSON locales;
- aplica schema de importación;
- genera payload local en `_orbit360_exports`;
- genera reporte en `_orbit360_reports`;
- no escribe Firestore.

## 4. Modo escritura LAB

Solo cuando se autorice explícitamente y exista configuración local:

```txt
node tools/orbit360-cargar-importacion-ays-lab-v104.mjs --input _orbit360_imports/ays_real --tenant alianzas-soluciones --project <PROJECT_ID_LAB> --write --confirm ESCRIBIR_LAB_AYS
```

Requisitos locales:

- `GOOGLE_APPLICATION_CREDENTIALS` configurado en el equipo local;
- `FIREBASE_PROJECT_ID` o `--project`;
- paquete `firebase-admin` disponible localmente;
- validador de importación aprobado previamente.

## 5. Ruta de escritura

El cargador escribe únicamente en:

```txt
tenantId/alianzas-soluciones/{coleccion}/{id}
```

## 6. Metadata agregada

Cada fila incluye:

```txt
_migration.batchId
_migration.source
_migration.row
_migration.version
_migration.importedAt
```

## 7. Restricciones

- No producción.
- No `main`.
- No datos reales en repo.
- No datos en `seed.js`.
- No escritura sin `--write` y `--confirm ESCRIBIR_LAB_AYS`.
- No tenant distinto a `alianzas-soluciones`.

## 8. Siguiente paso

Después de validar archivos reales y ejecutar dry-run, revisar reporte. La escritura LAB debe autorizarse de forma explícita antes de usar `--write`.
