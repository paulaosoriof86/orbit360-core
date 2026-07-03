# Bitácora smoke post carga A&S LAB v1.104

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`

## 2026-07-03 — Smoke post carga LAB solo lectura

- **Módulo/área:** Migración / Firestore LAB / Smoke post carga.
- **Síntoma/necesidad:** Después de una escritura LAB real, se debe validar que los datos quedaron legibles por tenant y que no rompen reglas básicas de cartera/relaciones.
- **Esperado:** Ejecutar una revisión solo lectura sobre clientes, aseguradoras, pólizas, cobros, comisiones, facturas, finmovs, reclamos y vehículos.
- **Archivo/función:** `tools/orbit360-smoke-post-carga-ays-lab-v104.mjs`, `tools/orbit360-smoke-post-carga-ays-lab-v104.ps1`, `tools/orbit360-autorizar-carga-ays-lab-v104.ps1`, `docs/SMOKE-POST-CARGA-AYS-LAB-V104-20260703.md`.
- **Fix o mejora aplicada:** Se creó smoke solo lectura con `firebase-admin` local y se integró al flujo de autorización para que corra automáticamente después de una escritura LAB exitosa.
- **Impacto en prototipo comercializable:** Añade una puerta post-migración reutilizable por tenant antes de avanzar a uso operativo o siguientes fases.
- **Estado:** RESUELTO EN RAMA / pendiente ejecutar después de primera carga LAB autorizada.

## Restricciones respetadas

- No deploy.
- No producción.
- No `main`.
- No escritura desde el smoke.
- No datos reales en repo.
- No credenciales en repo.
