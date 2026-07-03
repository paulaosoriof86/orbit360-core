# Bitácora cambios A&S backend — 2026-07-03

## 2026-07-03 — Rama A&S basada en backend v99 validado

- **Módulo/área:** GitHub / Backend LAB / Tenant A&S.
- **Síntoma/necesidad:** La documentación A&S inicial quedó en una rama creada desde `main`, pero el backend técnico validado estaba en PR #3 (`backend/v99-clean-claude-lab-20260701`).
- **Esperado:** Continuar A&S sobre la base backend LAB protegida y validada, no sobre una rama de prototipo ni sobre una rama sin backend.
- **Causa raíz:** Primero se creó rama documental A&S desde `main`; luego se revisó el PR #3 y se confirmó que allí estaba la base técnica con Fase 8 validada y Fase 9 pausada.
- **Archivo/función:** rama `ays/backend-tenant-lab-v99-20260703`.
- **Fix o mejora aplicada:** Se creó rama A&S desde el `head_sha` del PR #3: `eb8a3fc542b0addb59f8cf6da76b8cc3348055d7`.
- **Impacto en prototipo comercializable:** Evita reiniciar backend y evita mezclar A&S con ramas de prototipo Claude.
- **Estado:** RESUELTO.

## 2026-07-03 — Fix reglas Firestore para ruta real del adapter LAB

- **Módulo/área:** Firestore Rules / Store LAB.
- **Síntoma/necesidad:** `store-firestore-lab.local.js` usa la ruta `tenantId/{tenantId}/{coleccion}/{docId}`, mientras `firestore.rules` permitía `tenants/{tenantId}/data/{document=**}`.
- **Esperado:** Las reglas deben permitir la ruta usada por el adapter LAB actual o el backend queda bloqueado aunque el usuario pertenezca al tenant.
- **Causa raíz:** Desfase entre documentación/rules y ruta real del adapter LAB v1.73.
- **Archivo/función:** `firestore.rules`, `orbit360-platform/data/store-firestore-lab.local.js`.
- **Fix o mejora aplicada:** Se agregó permiso transitorio para `tenantId/{tenantId}/{document=**}` conservando también `tenants/{tenantId}/data/{document=**}`.
- **Impacto en prototipo comercializable:** Permite seguir con smoke LAB A&S sin tocar módulos ni frontend.
- **Estado:** RESUELTO EN RAMA / pendiente smoke y deploy de reglas solo con autorización.

## 2026-07-03 — Plantilla de importación CRM real A&S

- **Módulo/área:** Migración de datos / Importadores.
- **Síntoma/necesidad:** Paula aclaró que la base real del CRM se irá entregando por bloques y que la plantilla no debe reemplazar el export real si este existe.
- **Esperado:** Preferir export real del CRM; usar plantilla solo para normalizar campos incompletos/desordenados.
- **Archivo/función:** `Plantilla_Importacion_CRM_Real_AYS_Orbit360.xlsx`, `docs/PLANTILLA-IMPORTACION-CRM-REAL-AYS-20260703.md`.
- **Fix o mejora aplicada:** Se generó plantilla Excel con hojas por entidad: asesores, aseguradoras, clientes, pólizas, cobros, históricos, vehículos, siniestros, comisiones/facturas y finmovs.
- **Impacto en prototipo comercializable:** Define estructura que el módulo Importar debe soportar, pero sin meter datos reales en demo.
- **Estado:** RESUELTO DOCUMENTALMENTE / archivo generado en sandbox.
