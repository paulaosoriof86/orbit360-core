# Conversión Excel a CSV — Importación A&S v1.104

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** conversor creado e integrado al primer ensayo sin escritura.

## 1. Objetivo

Reducir trabajo manual para usar archivos reales de A&S en Excel. El conversor toma `.xlsx/.xlsm` locales, exporta cada hoja visible a CSV y deja todo en carpetas ignoradas por Git.

## 2. Archivos creados

```txt
tools/orbit360-convertir-excel-importacion-ays-v104.py
tools/orbit360-convertir-excel-importacion-ays-v104.ps1
```

También se actualizó:

```txt
tools/orbit360-run-primer-ensayo-importacion-ays-v104.ps1
```

## 3. Carpetas locales

Colocar Excel reales en:

```txt
_orbit360_imports/ays_real/_excel
```

CSV convertidos quedan en:

```txt
_orbit360_imports/ays_real/_convertidos
```

Ambas carpetas están bajo `_orbit360_imports`, ignorada por Git.

## 4. Ejecución individual

```txt
tools/orbit360-convertir-excel-importacion-ays-v104.ps1
```

El wrapper PowerShell:

- verifica rama obligatoria;
- crea carpetas locales;
- crea un entorno virtual local ignorado;
- instala/verifica `openpyxl` en ese entorno local;
- convierte hojas visibles a CSV UTF-8;
- genera reporte;
- copia reporte al portapapeles;
- abre Notepad.

## 5. Integración al primer ensayo

El script:

```txt
tools/orbit360-run-primer-ensayo-importacion-ays-v104.ps1
```

ahora ejecuta conversión Excel antes de validar archivos CSV/JSON.

## 6. Regla importante

Los CSV generados en `_convertidos` deben revisarse y, si corresponden a una colección Orbit, moverse o renombrarse a la raíz de:

```txt
_orbit360_imports/ays_real
```

Ejemplo:

```txt
_orbit360_imports/ays_real/clientes.csv
_orbit360_imports/ays_real/aseguradoras.csv
_orbit360_imports/ays_real/polizas.csv
```

El validador estricto toma el nombre base del archivo para identificar colección.

## 7. Restricciones

- No se suben Excel al repo.
- No se suben CSV reales al repo.
- No se escribe Firestore.
- No se hace deploy.
- No se toca producción.
- No se hace commit/push local automático.

## 8. Estado

Conversión Excel → CSV lista e integrada al primer ensayo real sin escritura. Pendiente: colocar archivos Excel reales en carpeta local y ejecutar el flujo.
