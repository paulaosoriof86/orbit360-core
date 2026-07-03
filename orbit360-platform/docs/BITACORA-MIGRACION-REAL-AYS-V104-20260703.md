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

## 2026-07-03 — Listado de lotes y rollback LAB por batchId

- **Módulo/área:** Migración / Rollback / Firestore LAB.
- **Síntoma/necesidad:** Antes de cargar datos reales en LAB debe existir una salida segura si el lote queda mal mapeado o incompleto.
- **Esperado:** Poder listar payloads locales y revertir por `batchId`, con dry-run por defecto y escritura solo con confirmación explícita.
- **Archivo/función:** `tools/orbit360-listar-lotes-importacion-ays-v104.mjs`, `tools/orbit360-rollback-importacion-ays-lab-v104.mjs`, `docs/ROLLBACK-IMPORTACION-AYS-LAB-V104-20260703.md`.
- **Fix o mejora aplicada:** Se creó listado de lotes locales y rollback LAB que borra documentos por `_migration.batchId` solo si se usa `--write --confirm ROLLBACK_LAB_AYS`. Sin flags, solo calcula candidatos.
- **Impacto en prototipo comercializable:** Permite migraciones por lote con trazabilidad y reversión, requisito crítico antes de usar datos reales de cualquier tenant.
- **Estado:** RESUELTO EN RAMA / pendiente probar con primer payload real local.

## 2026-07-03 — Primer ensayo real sin escritura

- **Módulo/área:** Migración / Ensayo operativo / QA.
- **Síntoma/necesidad:** Paula necesita avanzar rápido hacia uso real, pero aún no debe escribirse en Firestore sin revisar reportes.
- **Esperado:** Un solo script que ejecute preparación, validación, dry-run de carga, listado de lote y rollback dry-run, sin escribir en Firestore.
- **Archivo/función:** `tools/orbit360-run-primer-ensayo-importacion-ays-v104.ps1`, `docs/PRIMER-ENSAYO-IMPORTACION-AYS-V104-20260703.md`.
- **Fix o mejora aplicada:** Se creó script maestro de ensayo sin escritura, con reporte, portapapeles y Notepad. Verifica rama, sincroniza, prepara carpetas, valida CSV/JSON, genera payload, lista lotes y ejecuta rollback dry-run.
- **Impacto en prototipo comercializable:** Permite probar el flujo completo con datos reales locales antes de cualquier escritura en LAB; reduce riesgo operativo para A&S y futuros tenants.
- **Estado:** RESUELTO EN RAMA / pendiente ejecución local con archivos reales.

## 2026-07-03 — Conversión Excel a CSV para importación real

- **Módulo/área:** Migración / Excel / Reducción de trabajo manual.
- **Síntoma/necesidad:** Los datos reales de A&S pueden venir en Excel y no debe pedirse conversión manual hoja por hoja.
- **Esperado:** Convertir `.xlsx/.xlsm` locales a CSV UTF-8 en carpetas ignoradas por Git antes de validar.
- **Archivo/función:** `tools/orbit360-convertir-excel-importacion-ays-v104.py`, `tools/orbit360-convertir-excel-importacion-ays-v104.ps1`, `docs/CONVERSION-EXCEL-IMPORTACION-AYS-V104-20260703.md`, `tools/orbit360-run-primer-ensayo-importacion-ays-v104.ps1`.
- **Fix o mejora aplicada:** Se creó conversor Python con `openpyxl`, wrapper PowerShell que prepara venv local ignorado e integración al primer ensayo sin escritura.
- **Impacto en prototipo comercializable:** Reduce fricción para migrar clientes desde Excel y conserva regla de no subir datos reales ni hardcodearlos.
- **Estado:** RESUELTO EN RAMA / pendiente probar con Excel reales locales.
