# Bitácora cambios backend A&S — Dry-run fuentes separadas

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Tipo:** avance backend seguro / script de validación estructural  
**Estado:** RESUELTO como compuerta estructural; ABIERTO para parser real posterior.

## Entrada

- **Módulo / área:** Backend A&S — migración real / importador por fuentes separadas.
- **Síntoma/necesidad:** mientras Claude trabaja en frontend/prototipo, avanzar backend sin pedir archivos nuevos ni tocar datos reales, creando una compuerta segura previa a importaciones.
- **Esperado:** validador sin dependencias externas, sin Firebase, sin Firestore, sin `data/store.js`, que valide alcance de fuente y bloquee inferencias cruzadas.
- **Causa raíz:** la migración real requiere archivos separados y el error previo de alcance mostró que se necesita una barrera técnica antes de procesar columnas/filas reales.
- **Archivo/función:** `tools/orbit360-dryrun-fuente-separada-ays.mjs` y `tools/orbit360-run-dryrun-fuente-separada-ays.ps1`.
- **Fix/mejora aplicada:** script Node puro por manifest estructural, runner PowerShell, plantilla JSON y contrato documental.
- **Impacto en prototipo comercializable:** aplica a prototipo base. El importador debe pedir tipo de fuente, validar alcance, bloquear inferencias cruzadas y emitir dry-run antes de importar.
- **Estado:** RESUELTO como preparación técnica.

## Archivos agregados

```txt
tools/orbit360-dryrun-fuente-separada-ays.mjs
tools/orbit360-run-dryrun-fuente-separada-ays.ps1
tools/templates/orbit360-manifest-fuente-separada-ejemplo.json
orbit360-platform/docs/CONTRATO-MANIFEST-FUENTE-SEPARADA-AYS-20260703.md
orbit360-platform/docs/BLOQUE-BACKEND-DRYRUN-FUENTES-SEPARADAS-AYS-20260703.md
```

## Reglas implementadas

1. Validar `source_type` antes de procesar.
2. Validar país/moneda declarados.
3. Validar columnas mínimas esperadas.
4. Bloquear manifests con `rows[]`.
5. Bloquear destinos cruzados no permitidos.
6. Bloquear inferencias CRM desde financiero histórico.
7. Advertir si mayo/junio/julio aparecen como histórico.
8. Generar reporte local agregado en `_orbit360_reports`.
9. No escribir Firestore.
10. No tocar `data/store.js`.

## Pendientes

1. Ejecutar validación local cuando exista manifest real estructural.
2. Crear parser real por tipo de fuente solo con autorización.
3. Definir si se agregará dependencia de Excel para Node o si el parseo seguirá por importador existente.
4. Crear manifests privados fuera del repo para datos reales.
5. Preparar dry-run de datos sin escritura después del dry-run estructural.

## Pendientes Claude / prototipo base

1. UI de selector de fuente.
2. UI de prevalidación de columnas.
3. Bloqueo de inferencias cruzadas.
4. Estado por fuente: listo, requiere validación, bloqueado, superado.
5. Reporte de exclusiones y conflictos.

## Restricciones cumplidas

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
