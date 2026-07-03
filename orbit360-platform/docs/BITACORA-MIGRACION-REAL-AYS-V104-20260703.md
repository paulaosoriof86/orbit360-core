# Bitácora migración real A&S — v1.104

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** preparación técnica para datos reales, sin subir datos reales.

## 2026-07-03 — Carril local ignorado para archivos reales

- **Módulo/área:** Migración de datos / Seguridad repo.
- **Síntoma/necesidad:** Paula necesita iniciar uso con datos reales, pero no se pueden subir ni hardcodear datos en el repositorio.
- **Esperado:** Tener una carpeta local para insumos reales que Git ignore siempre.
- **Causa raíz:** El prototipo trabaja con seed ficticio; la migración real necesita un carril separado para evitar contaminación demo/LAB/producción.
- **Archivo/función:** `.gitignore`, `_orbit360_imports/ays_real`, `_orbit360_exports`, `_orbit360_reports`.
- **Fix o mejora aplicada:** Se agregaron reglas `.gitignore` para carpetas locales de importación, exportación, reportes y archivos `.local/.real`.
- **Impacto en prototipo comercializable:** Evita que futuros clientes o tenants mezclen datos reales con código o seed demo.
- **Estado:** RESUELTO EN RAMA.

## 2026-07-03 — Schema de importación real A&S v1.104

- **Módulo/área:** Migración / Modelo de datos.
- **Síntoma/necesidad:** Antes de cargar archivos reales, se requiere validar columnas por colección contra el modelo Orbit.
- **Esperado:** Schema único para asesores, aseguradoras, clientes, vehículos, pólizas, cobros, comisiones, facturas, finmovs, reclamos, documentos, gestiones y negocios.
- **Archivo/función:** `tools/orbit360-schema-importacion-ays-v104.json`.
- **Fix o mejora aplicada:** Se agregó schema con campos requeridos/opcionales y reglas de negocio de cartera, caja, facturas, comisiones y moneda.
- **Impacto en prototipo comercializable:** Sirve como base reutilizable por tenant y reduce mapeos manuales repetidos.
- **Estado:** RESUELTO EN RAMA.

## 2026-07-03 — Validador de importación real A&S

- **Módulo/área:** Migración / QA de datos.
- **Síntoma/necesidad:** No se deben cargar archivos con columnas faltantes, ids vacíos, duplicados o moneda/país dudosos.
- **Esperado:** Validar CSV/JSON locales antes de escribir cualquier dato en LAB.
- **Archivo/función:** `tools/orbit360-validar-importacion-ays-v104.mjs`.
- **Fix o mejora aplicada:** Se creó validador sin red, sin Firebase y sin escritura remota que genera reporte en `_orbit360_reports`.
- **Impacto en prototipo comercializable:** Define puerta de calidad antes de migrar datos de cualquier cliente.
- **Estado:** RESUELTO EN RAMA.

## 2026-07-03 — Preparador local de plantillas de importación

- **Módulo/área:** Migración / Operación local.
- **Síntoma/necesidad:** Reducir trabajo manual y evitar que Paula tenga que crear carpetas/headers a mano.
- **Esperado:** Script que cree carpeta local ignorada y plantillas CSV vacías sin reemplazar archivos existentes.
- **Archivo/función:** `tools/orbit360-preparar-importacion-ays-v104.ps1`.
- **Fix o mejora aplicada:** Se creó script con verificación de rama, reporte, portapapeles y Notepad.
- **Impacto en prototipo comercializable:** Permite iniciar la preparación de datos reales de forma ordenada y repetible.
- **Estado:** RESUELTO EN RAMA.

## 2026-07-03 — Cargador LAB controlado en dry-run por defecto

- **Módulo/área:** Migración / Firestore LAB.
- **Síntoma/necesidad:** A&S necesita pasar de validación a carga real, pero sin escritura accidental ni producción.
- **Esperado:** Cargador que prepare payload local y solo escriba en LAB si hay flags y confirmación explícita.
- **Archivo/función:** `tools/orbit360-cargar-importacion-ays-lab-v104.mjs`.
- **Fix o mejora aplicada:** Se creó cargador con modo `dry-run` por defecto, escritura opcional solo con `--write --tenant alianzas-soluciones --confirm ESCRIBIR_LAB_AYS`, metadata de migración y ruta Firestore LAB por tenant.
- **Impacto en prototipo comercializable:** Sienta base para migraciones reales controladas por lote, con trazabilidad y rollback posterior.
- **Estado:** RESUELTO EN RAMA / pendiente ejecución con datos reales locales y autorización de escritura LAB.

## 2026-07-03 — Flujo maestro v104 con validación y dry-run de importación

- **Módulo/área:** QA / Automatización local.
- **Síntoma/necesidad:** El flujo maestro no debía validar solo backend/frontend, sino también estructura de importación real.
- **Esperado:** Un solo flujo largo que sincronice rama, valide backend, valide frontend, valide importación, prepare payload dry-run, y luego continúe smoke.
- **Archivo/función:** `tools/orbit360-run-flujo-ays-lab-v99.ps1`.
- **Fix o mejora aplicada:** Se agregó validación de carpeta `_orbit360_imports/ays_real` y dry-run del cargador LAB antes de config/smoke.
- **Impacto en prototipo comercializable:** Acelera uso real sin saltar controles críticos.
- **Estado:** RESUELTO EN RAMA.
