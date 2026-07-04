# Tests de regresión — dry-run fuentes separadas A&S

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Tipo:** pruebas sintéticas backend  
**Estado:** scripts agregados; ejecución local pendiente.

## 1. Objetivo

Agregar pruebas sintéticas para verificar que el validador de fuentes separadas mantenga las reglas críticas antes de procesar archivos reales.

## 2. Archivos agregados

```txt
tools/orbit360-test-dryrun-fuentes-separadas-ays.mjs
tools/orbit360-run-tests-dryrun-fuentes-separadas-ays.ps1
```

## 3. Qué prueban

Los tests crean manifests sintéticos en `_orbit360_tmp` y ejecutan:

```txt
tools/orbit360-dryrun-fuente-separada-ays.mjs
```

No usan datos reales.

Casos cubiertos:

| Caso | Esperado |
|---|---|
| `clientes-listo` | `listo_dryrun` |
| `financiero-bloquea-crm` | `bloqueado` |
| `estado-cuenta-moneda-incoherente` | `bloqueado` |
| `manifest-con-rows-bloqueado` | `bloqueado` |
| `polizas-requiere-validacion-columnas` | `requiere_validacion` |

## 4. Reglas protegidas por los tests

1. Clientes con estructura mínima pueden pasar a `listo_dryrun`.
2. Financiero histórico no puede pedir destino `clientes`.
3. Estado de cuenta GT no puede declararse en COP.
4. Un manifest con `rows[]` queda bloqueado.
5. Pólizas incompletas no bloquean por completo si no hay destino prohibido, pero quedan en `requiere_validacion`.

## 5. Comandos futuros

Node:

```txt
node tools/orbit360-test-dryrun-fuentes-separadas-ays.mjs
```

PowerShell:

```txt
.\tools\orbit360-run-tests-dryrun-fuentes-separadas-ays.ps1
```

El runner PowerShell:

- genera reporte en `_orbit360_reports`;
- copia salida al portapapeles;
- abre Notepad;
- no escribe Firestore;
- no hace deploy;
- no hace merge.

## 6. Salidas locales

Reportes esperados:

```txt
_orbit360_reports/TEST-DRYRUN-FUENTES-SEPARADAS-AYS.txt
_orbit360_reports/RUN-TEST-DRYRUN-FUENTES-SEPARADAS-AYS-<fecha>.txt
```

## 7. Pendientes

1. Ejecutar localmente cuando se decida validar el bloque.
2. Ajustar test si se amplían tipos de fuente.
3. Agregar tests para parser real cuando exista.
4. Mantener tests sin payload real.

## 8. Restricciones cumplidas

- No deploy.
- No merge.
- No main.
- No Firestore.
- No carga LAB.
- No datos reales en repo.
- No secretos.
- No modificación de `data/store.js`.
- No backend LAB protegido modificado.
- No descargables.

## Estado

**Tests sintéticos agregados. Ejecución local pendiente.**
