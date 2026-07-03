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

## 2026-07-03 — Rama activa obligatoria A&S/backend

- **Módulo/área:** GitHub / metodología / continuidad.
- **Síntoma/necesidad:** Paula pidió que quedara documentado cuál rama debe actualizarse siempre para evitar que otra conversación actualice una rama incorrecta.
- **Esperado:** Toda continuidad A&S/backend debe actualizar `ays/backend-tenant-lab-v99-20260703`.
- **Archivo/función:** `orbit360-platform/docs/RAMA-ACTIVA-OBLIGATORIA-AYS-BACKEND.md`, PR #5.
- **Fix o mejora aplicada:** Se creó documento de control y se actualizó el cuerpo del PR #5 con la rama obligatoria desde la primera línea.
- **Impacto en prototipo comercializable:** Evita pérdida de contexto y evita mezclar backend real A&S con ramas Claude/prototipo.
- **Estado:** RESUELTO.

## 2026-07-03 — Smoke ejecutable A&S LAB v99

- **Módulo/área:** Backend LAB / QA / Smoke.
- **Síntoma/necesidad:** Validar backend LAB A&S con reporte automático y mínima carga manual para Paula.
- **Esperado:** Script que confirme rama correcta, archivos LAB, reglas Firestore, sintaxis JS, Auth/Firebase, API `Orbit.store`, tenant y CRUD ficticio controlado.
- **Archivo/función:** `tools/orbit360-smoke-ays-lab-v99.ps1`, `orbit360-platform/docs/SMOKE-AYS-LAB-V99-EJECUTABLE-20260703.md`.
- **Fix o mejora aplicada:** Se creó script sin deploy/commit/push que genera reporte `.txt`, copia al portapapeles y abre Notepad.
- **Impacto en prototipo comercializable:** Permite verificar backend antes de migrar datos reales o empalmar nuevas entregas Claude.
- **Estado:** LISTO PARA EJECUCIÓN LOCAL.

## 2026-07-03 — Smoke tolerante a index sin loader/init permanente

- **Módulo/área:** Backend LAB / QA / Smoke / Index central.
- **Síntoma/necesidad:** Al revisar `index.html`, se detectó que todavía no carga permanentemente `core/backend-lab-loader.js` ni `core/backend-lab-init.js`.
- **Esperado:** El smoke debe poder validar backend LAB sin hacer modificación funcional permanente en `index.html` antes de autorización.
- **Causa raíz:** Fase 9 estaba pausada y el index central aún no integra loader/init LAB como cambio final.
- **Archivo/función:** `tools/orbit360-smoke-ays-lab-v99.ps1`, `orbit360-platform/docs/SMOKE-AYS-LAB-V99-EJECUTABLE-20260703.md`, `orbit360-platform/index.html`.
- **Fix o mejora aplicada:** El servidor temporal del smoke inyecta loader/init solo en memoria cuando sirve `index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones`; no modifica el archivo real.
- **Impacto en prototipo comercializable:** Permite validar backend ahora y deja pendiente el fix permanente del index central.
- **Estado:** RESUELTO PARA SMOKE / PENDIENTE FIX PERMANENTE INDEX.

## 2026-07-03 — Script seguro para integración permanente backend LAB en index

- **Módulo/área:** Backend LAB / Index central / Metodología segura.
- **Síntoma/necesidad:** Se requiere integrar permanentemente loader/init en `index.html`, pero editar el HTML grande directamente desde GitHub puede dañar codificación existente.
- **Esperado:** Aplicar fix mínimo local con backup, verificación de rama, verificación de orden y reporte, sin commit/push/deploy automático.
- **Archivo/función:** `tools/orbit360-integrar-backend-lab-index.ps1`, `orbit360-platform/docs/INTEGRAR-BACKEND-LAB-INDEX-20260703.md`.
- **Fix o mejora aplicada:** Se creó script que inserta `core/backend-lab-loader.js` y `core/backend-lab-init.js` antes de `data/store.js` solo si faltan, verifica orden y deja reporte en Notepad/portapapeles.
- **Impacto en prototipo comercializable:** Reduce riesgo de mojibake y deja camino controlado para activar index central LAB sin tocar producción.
- **Estado:** LISTO PARA EJECUCIÓN LOCAL.
