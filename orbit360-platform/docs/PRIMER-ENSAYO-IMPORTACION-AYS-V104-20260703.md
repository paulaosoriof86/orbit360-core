# Primer ensayo importación A&S v1.104 — sin escritura

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** script creado; no escribe en Firestore.

## 1. Objetivo

Ejecutar un flujo completo de preparación y ensayo de migración real sin escribir datos en Firestore LAB.

Este flujo permite avanzar rápido hacia uso real, pero sin saltar controles críticos de estabilidad, trazabilidad y rollback.

## 2. Archivo creado

```txt
tools/orbit360-run-primer-ensayo-importacion-ays-v104.ps1
```

## 3. Qué hace

1. Verifica repo y rama obligatoria.
2. Sincroniza `ays/backend-tenant-lab-v99-20260703`.
3. Prepara carpetas y plantillas locales.
4. Valida estructura de CSV/JSON reales locales.
5. Genera payload dry-run sin escritura.
6. Lista lotes locales generados.
7. Ejecuta rollback dry-run desde el payload más reciente.
8. Genera reporte maestro, lo copia al portapapeles y abre Notepad.

## 4. Qué NO hace

- No escribe en Firestore.
- No hace deploy.
- No toca producción.
- No hace commit.
- No hace push.
- No sube datos reales al repo.
- No usa secretos.
- No toca `main`.

## 5. Ejecución local

Desde PowerShell:

```txt
tools/orbit360-run-primer-ensayo-importacion-ays-v104.ps1
```

El script usa por defecto:

```txt
C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core
```

## 6. Archivos locales esperados

Los CSV/JSON reales deben estar en:

```txt
_orbit360_imports/ays_real
```

Esa carpeta está ignorada por Git.

## 7. Reportes generados

```txt
_orbit360_reports/PRIMER-ENSAYO-IMPORTACION-AYS-V104-<fecha>.txt
_orbit360_reports/VALIDACION-IMPORTACION-AYS-V104.txt
_orbit360_reports/LOTES-IMPORTACION-AYS-V104.txt
_orbit360_exports/payload-importacion-ays-lab-v104-<batchId>.json
```

Estas carpetas están ignoradas por Git.

## 8. Criterio para pasar a escritura LAB

Solo considerar escritura LAB si:

1. validación de importación = OK;
2. payload dry-run = OK;
3. listado de lote = OK;
4. rollback dry-run = OK;
5. Paula autoriza explícitamente escritura LAB;
6. existe configuración local autorizada de Firebase LAB.

## 9. Estado

Primer ensayo real sin escritura queda listo para ejecución local. La escritura LAB sigue bloqueada hasta autorización explícita.
