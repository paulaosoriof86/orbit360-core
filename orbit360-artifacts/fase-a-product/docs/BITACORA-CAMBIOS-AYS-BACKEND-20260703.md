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

## 2026-07-03 — Run maestro A&S LAB v99

- **Módulo/área:** Backend LAB / QA / automatización local.
- **Síntoma/necesidad:** Reducir trabajo manual de Paula y evitar ejecutar scripts en orden incorrecto.
- **Esperado:** Un único flujo que sincronice rama obligatoria, ejecute integración local del index y ejecute smoke LAB, generando reporte maestro.
- **Archivo/función:** `tools/orbit360-run-flujo-ays-lab-v99.ps1`, `orbit360-platform/docs/RUN-FLUJO-AYS-LAB-V99-20260703.md`.
- **Fix o mejora aplicada:** Se creó script maestro sin deploy/commit/push que ejecuta `orbit360-integrar-backend-lab-index.ps1` y `orbit360-smoke-ays-lab-v99.ps1`, copia reporte al portapapeles y abre Notepad.
- **Impacto en prototipo comercializable:** Facilita validar backend LAB completo antes de cargar datos reales.
- **Estado:** LISTO PARA EJECUCIÓN LOCAL.

## 2026-07-03 — Backend LAB v1.104: guard de secretos, tenant y auth

- **Módulo/área:** Backend LAB / Seguridad / Firestore / Integraciones.
- **Síntoma/necesidad:** El candidato Claude y el backend LAB ya habían reducido exposición de credenciales, pero seguía existiendo riesgo de que una pantalla o preferencia futura intentara guardar API keys, webhooks, tokens o secretos desde frontend/Firestore.
- **Esperado:** La rama backend debe bloquear persistencia de secretos desde frontend y dejar claro que producción usará backend seguro/secret manager por tenant.
- **Causa raíz:** El prototipo nació en navegador y algunas integraciones capturan credenciales en UI; sin guard transversal, cualquier módulo nuevo podría reintroducir persistencia insegura.
- **Archivo/función:** `core/backend-lab-loader.js`, `core/backend-lab-init.js`, `core/backend-lab-security-guard.js`, `tools/orbit360-integrar-backend-lab-index.ps1`, `tools/orbit360-validar-backend-lab-contrato.mjs`.
- **Fix o mejora aplicada:** Se endureció loader/init a v1.104, se agregó guard runtime que bloquea `setPref` sensible, limpia campos sensibles antes de `insert/update`, bloquea writes si no está el usuario LAB esperado y emite eventos de seguridad. El script de integración ahora inserta el guard después del store LAB y antes de `seed.js`.
- **Impacto en prototipo comercializable:** Aprendizaje obligatorio para prototipo base: ninguna integración comercial debe persistir secretos en frontend; Claude debe conservar copy comercial sin pedir credenciales expuestas y backend debe proveer conectores seguros.
- **Estado:** RESUELTO EN RAMA / pendiente ejecutar smoke local y empalme visual definitivo.

## 2026-07-08 — Avance celular v1330: auditoría documental, módulos visibles y plan actualizado

- **Módulo/área:** Documentación viva / metodología / gates administrativos / coordinación Claude-Academia.
- **Síntoma/necesidad:** Paula estaba sin PowerShell desde celular y pidió continuar sin rellenar, documentando avances, pendientes, patrones replicables y Academia para no perder tiempo ni repetir auditorías al volver al computador.
- **Esperado:** Persistir en la rama activa el avance celular, separar bloqueadores reales de pendientes no bloqueantes, actualizar documentos vivos y evitar tocar código funcional sin `node --check` local.
- **Causa raíz:** El patch local Equipo/Configuración v1 falló sin aplicar cambios por depender de reemplazos textuales largos que no coincidían con el worktree local; además el HEAD local reportado quedó detrás del head remoto documental posterior.
- **Archivo/función:**
  - `orbit360-platform/docs/AVANCE-CELULAR-EQUIPO-CONFIG-V1330-20260708.md`.
  - `orbit360-platform/docs/AUDITORIA-CELULAR-MODULOS-VISIBLES-V1330-20260708.md`.
  - `orbit360-platform/docs/REGISTRO-ACCIONES-CELULAR-V1330-20260708.md`.
  - `orbit360-platform/docs/PLAN-TRABAJO-ACTUALIZADO-V1330-20260708.md`.
- **Fix o mejora aplicada:** Se documentó que Equipo/Configuración son el bloqueo real por gates administrativos; se auditó Portal, Correo, Notificaciones, Automatizaciones, Plantillas, Marketing y Conciliaciones; se separaron pendientes críticos, no bloqueantes y bloqueantes solo para M5.
- **Impacto en prototipo comercializable:** Evita repetir trabajo, conserva lenguaje honesto sobre acciones preparadas/no enviadas/no conectadas, y deja claro que M2/M3/M4 pueden seguir tras cerrar Equipo/Config sin sobredimensionar pendientes de copy.
- **Impacto Academia:** Se agregan rutas/microlecciones pendientes para Dirección/Admin, Marketing, Finanzas y Portal: motivos administrativos, último admin activo, preparado vs enviado/conectado, reportar pago no equivale a conciliar, conciliación validada no aplica pago.
- **¿Aplica a Claude/prototipo?:** Sí. Claude debe conservar copy honesto, no mostrar textos técnicos visibles, no simular integraciones activas, no reintroducir secretos en frontend y mantener gates/UX de confirmación en acciones administrativas.
- **Estado:** DOCUMENTADO EN RAMA / pendiente patch local Equipo-Config v2, validación Node y smokes M2/M3/M4.
