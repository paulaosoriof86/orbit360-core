# Bitácora cambios backend A&S — Tests dry-run fuentes separadas

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Tipo:** pruebas sintéticas / regresión backend  
**Estado:** RESUELTO como scripts agregados; ABIERTO para ejecución local.

## Entrada

- **Módulo / área:** Backend A&S — importador / dry-run fuentes separadas.
- **Síntoma/necesidad:** el validador estructural de fuentes separadas necesita pruebas de regresión para evitar que futuras mejoras rompan bloqueos críticos.
- **Esperado:** tests sintéticos, sin datos reales, que prueben casos OK, bloqueos y advertencias.
- **Causa raíz:** el flujo de migración real depende de impedir inferencias cruzadas; sin tests, un cambio posterior podría permitir que financiero histórico cree clientes/pólizas/cobros/cartera.
- **Archivo/función:** `tools/orbit360-test-dryrun-fuentes-separadas-ays.mjs` y `tools/orbit360-run-tests-dryrun-fuentes-separadas-ays.ps1`.
- **Fix/mejora aplicada:** se agregaron pruebas sintéticas para validar decisiones `listo_dryrun`, `requiere_validacion` y `bloqueado`.
- **Impacto en prototipo comercializable:** aplica al prototipo base. El importador necesita pruebas automatizables para garantizar selector de fuente, bloqueos de inferencia y manejo de payload real.
- **Estado:** RESUELTO como preparación técnica / PENDIENTE EJECUCIÓN LOCAL.

## Archivos agregados

```txt
tools/orbit360-test-dryrun-fuentes-separadas-ays.mjs
tools/orbit360-run-tests-dryrun-fuentes-separadas-ays.ps1
orbit360-platform/docs/TESTS-DRYRUN-FUENTES-SEPARADAS-AYS-20260703.md
```

## Casos cubiertos

1. `clientes-listo` → debe quedar `listo_dryrun`.
2. `financiero-bloquea-crm` → debe quedar `bloqueado`.
3. `estado-cuenta-moneda-incoherente` → debe quedar `bloqueado`.
4. `manifest-con-rows-bloqueado` → debe quedar `bloqueado`.
5. `polizas-requiere-validacion-columnas` → debe quedar `requiere_validacion`.

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
