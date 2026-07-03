# Bitácora operación Paula importación A&S v1.104

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`

## 2026-07-03 — Entrypoint único para operación local

- **Módulo/área:** Migración / Operación local / Reducción de trabajo manual.
- **Síntoma/necesidad:** Paula necesita ejecutar el proceso con el menor número posible de comandos y sin armar rutas manuales.
- **Esperado:** Un solo script con modo seguro por defecto y opciones explícitas para ensayo, preflight, escritura LAB o smoke post carga.
- **Archivo/función:** `tools/orbit360-operacion-paula-importacion-ays-v104.ps1`, `docs/OPERACION-PAULA-IMPORTACION-AYS-V104-20260703.md`.
- **Fix o mejora aplicada:** Se creó entrypoint local con `-Modo ensayo` por defecto. La escritura LAB solo se permite con `-Modo escribir-lab`, `-ProjectId` y `-Confirmacion ESCRIBIR_LAB_AYS`.
- **Impacto en prototipo comercializable:** Reduce la carga manual y crea un patrón reutilizable de operación por tenant sin exponer producción ni datos reales.
- **Estado:** RESUELTO EN RAMA / pendiente ejecución local con datos reales.

## Restricciones respetadas

- No deploy.
- No producción.
- No `main`.
- No datos reales en repo.
- No secretos en repo.
- No commit automático.
- No push automático.
