# Pendientes y mejoras backend post v1.104 — Orbit 360 A&S

**Fecha base:** 2026-07-03  
**Actualización:** 2026-07-07  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Uso:** registro acumulado para no perder hallazgos antes de pedir paquete formal para Claude.

---

## A. Pendientes cerrados / avances documentados

### CERRADO-BE-104-01 a CERRADO-BE-104-18 — Backend LAB, conciliaciones y fuentes separadas
- **Área:** Backend LAB / Firestore LAB / conciliaciones / importadores.
- **Estado:** CERRADO COMO TOOLING EN RAMA.
- **Resumen:** loader/init/guard LAB, validadores, score conciliación, dryRunReport, propuestas `conciliaciones`, plan de persistencia, transiciones, ejecutor local mirror, adapter Firestore LAB preparado, smoke E2E sintético, readiness UI, planificador de aplicación controlada y manifest por fuentes separadas alineado a `conciliaciones`.
- **Restricción vigente:** no hay backend productivo ni writes reales de pagos; todo sigue protegido hasta ejecución/smoke autorizado.

### CERRADO-FRONT-062855 — Candidata Claude `062855.313` auditada
- **Área:** Auditoría Claude / frontend / bandeja conciliaciones.
- **Archivo auditado:** `Prototype Development Request - 2026-07-05T062855.313.zip`.
- **Documento:** `orbit360-platform/docs/AUDITORIA-FORENSE-CANDIDATO-CLAUDE-20260705-062855.md`.
- **Resultado:** no hay crítico. Corrigió ruta `conciliaciones` en tenant, rol Admin y copy residual de importador.
- **Estado:** CERRADO COMO AUDITORÍA.

### CERRADO-FRONT-062855-EMPALME — Empalme frontend aplicado en GitHub
- **Área:** Empalme frontend/backend.
- **Aplicado:** `modules/conciliaciones.js` e `index.html` híbrido LAB.
- **Regla aplicada:** no se copió `index.html` bruto del ZIP; se preservó Backend LAB.
- **Regla operativa:** `Conciliaciones` lee y actualiza solo `Orbit.store('conciliaciones')`; no toca `cobros`, `comisiones`, `finmovs`, cartera ni producción.
- **Estado:** CERRADO EN RAMA / pendiente smoke visual y validación local.

### CERRADO-FRONT-062855-SMOKE-STATIC — Smoke estático de empalme Conciliaciones
- **Área:** QA frontend/backend bridge / Conciliaciones.
- **Aplicado:** `tools/orbit360-validar-empalme-conciliaciones-062855-ays.mjs` y documentación asociada.
- **Regla:** valida index híbrido, carga única del módulo, roles y acciones seguras.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecución local y smoke visual.

### CERRADO-BE-104-19 — Perfilador de columnas por fuente
- **Área:** Backend / importador / parser / fuentes separadas.
- **Aplicado:** `tools/orbit360-perfilar-columnas-fuente-ays.mjs`, test y documentación asociada.
- **Regla:** perfila metadata de columnas por fuente; no lee filas reales, no escribe, no aplica pagos y no genera cartera/producción.
- **Estado:** CERRADO COMO TOOLING EN RAMA.

### CERRADO-BE-104-20 — Constructor de dryRunReport sin payload real
- **Área:** Backend / importador / parser / dryRunReport.
- **Aplicado:** `tools/orbit360-construir-dryrun-report-fuente-ays.mjs`, test y documentación asociada.
- **Regla:** construye sobre seguro de `dryRunReport`; no lee filas reales ni escribe.
- **Estado:** CERRADO COMO TOOLING EN RAMA.

### CERRADO-BE-104-21 — Adaptador de candidatos metadata-only para dryRunReport
- **Área:** Backend / importador / parser / dryRunReport / conciliaciones.
- **Aplicado:** `tools/orbit360-adaptar-candidatos-dryrun-metadata-ays.mjs`, test y documentación asociada.
- **Regla:** candidatos metadata-only; no genera conciliaciones reales.
- **Estado:** CERRADO COMO TOOLING EN RAMA.

### CERRADO-BE-104-22 — Orquestador de pipeline metadata-only
- **Área:** Backend / importador / parser / dryRunReport / QA.
- **Aplicado:** `tools/orbit360-orquestar-pipeline-metadata-ays.mjs`, test y documentación asociada.
- **Regla:** pipeline metadata-only sin score/propuestas reales.
- **Estado:** CERRADO COMO TOOLING EN RAMA.

### CERRADO-BE-104-23 — Orquestador score/propuestas plan-only
- **Área:** Backend / importador / parser / score / propuestas / plan de persistencia.
- **Aplicado:** `tools/orbit360-orquestar-score-propuestas-plan-ays.mjs`, test y documentación asociada.
- **Regla:** score/propuestas/plan de persistencia sin writes.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecución local.

### CERRADO-BE-104-24 — Readiness plan de persistencia LAB
- **Área:** Backend / conciliaciones / plan persistencia / adapter LAB futuro.
- **Aplicado:** `tools/orbit360-validar-readiness-plan-persistencia-lab-ays.mjs`, test y documentación asociada.
- **Regla:** valida plan antes de adapter LAB; bloquea payload, filas reales y banderas de escritura/aplicación.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecución local.

### CERRADO-BE-104-25 — Runner agrupado de validaciones locales Conciliaciones
- **Área:** QA backend/frontend bridge / conciliaciones / validaciones locales.
- **Aplicado:** `tools/orbit360-run-validaciones-locales-conciliaciones-ays.mjs` y documentación asociada.
- **Regla:** agrupa smoke estático, test orquestador, test readiness y hash de archivos protegidos.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecución local.

### CERRADO-BE-104-26 — Guía runner local y criterios de bloqueo
- **Área:** QA local / continuidad operativa / reducción de pasos manuales.
- **Aplicado:** `tools/orbit360-run-validaciones-locales-conciliaciones-ays.ps1` y guía asociada.
- **Regla:** comando único, criterios de avance/bloqueo y resumen copiable.
- **Estado:** CERRADO COMO TOOLING/DOCUMENTACIÓN EN RAMA / pendiente ejecución local.

### CERRADO-BE-104-27 — Checklist smoke visual/operativo Conciliaciones
- **Área:** QA visual / navegador / roles / acciones seguras.
- **Aplicado:** `tools/orbit360-preparar-smoke-visual-conciliaciones-ays.ps1` y checklist asociado.
- **Regla:** roles Dirección/Admin/Finanzas, estado vacío honesto, copy seguro y acciones sin mutar cobros/pólizas/comisiones/finmovs/cartera/producción.
- **Estado:** CERRADO COMO TOOLING/DOCUMENTACIÓN EN RAMA / pendiente ejecución local y visual.

### CERRADO-BE-104-28 — Modelo clientes + asesor + portal + calidad de datos
- **Área:** Backend / clientes / asesor / portal / calidad de datos.
- **Aplicado:**
  - `tools/orbit360-validar-modelo-clientes-ays.mjs`.
  - `tools/orbit360-test-validar-modelo-clientes-ays.mjs`.
  - `orbit360-platform/docs/CONTRATO-MODELO-CLIENTES-ASESOR-PORTAL-CALIDAD-AYS-20260705.md`.
- **Regla:** colecciones `clientes`, `clienteAsesorRelaciones`, `portalUsuarios`, `calidadDatosSolicitudes` y `auditLog`; mantiene plan-only, tenant, fuentes separadas, portal cliente sin opción de correo y calidad con `REQUIERE_VALIDACION`.
- **Estado:** CERRADO COMO CONTRATO/TOOLING EN RAMA / pendiente ejecución local.

### CERRADO-BE-104-29 — Modelo pólizas + recibos + cartera
- **Área:** Backend / pólizas / recibos / cartera.
- **Aplicado:**
  - `tools/orbit360-validar-modelo-polizas-recibos-cartera-ays.mjs`.
  - `tools/orbit360-test-validar-modelo-polizas-recibos-cartera-ays.mjs`.
  - `orbit360-platform/docs/CONTRATO-MODELO-POLIZAS-RECIBOS-CARTERA-AYS-20260705.md`.
  - `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260705-MODELO-POLIZAS-RECIBOS-CARTERA.md`.
- **Regla:** define `polizas`, `recibos`, `carteraItems`, `polizaClienteRelaciones` y `auditLog`; estados vigentes/por renovar, históricos, cartera del año actual, prima separada y producción sobre prima neta recaudada.
- **Estado:** CERRADO COMO CONTRATO/TOOLING EN RAMA / pendiente ejecución local.

### CERRADO-BE-104-30 — Modelo cobros + pagos reportados + conciliación
- **Área:** Backend / cobros / portal pagos / conciliación / producción.
- **Aplicado:**
  - `tools/orbit360-validar-modelo-cobros-pagos-conciliacion-ays.mjs`.
  - `tools/orbit360-test-validar-modelo-cobros-pagos-conciliacion-ays.mjs`.
  - `orbit360-platform/docs/CONTRATO-MODELO-COBROS-PAGOS-CONCILIACION-AYS-20260705.md`.
  - `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260705-MODELO-COBROS-PAGOS-CONCILIACION.md`.
- **Regla:** define `cobros`, `pagosReportados`, `conciliacionesCobros`, `cobroReciboRelaciones` y `auditLog`; separa cobros de `finmovs`, pagos reportados de pagos aplicados, conciliación de aplicación, cartera de banco y producción sobre prima neta recaudada.
- **Estado:** CERRADO COMO CONTRATO/TOOLING EN RAMA / pendiente ejecución local.

### CERRADO-BE-104-31 — Contrato Phase A persistencia conciliaciones + auditLog + Storage/adjuntos
- **Área:** Backend / conciliaciones / auditLog / documentos / portal / Storage.
- **Aplicado:**
  - `orbit360-platform/docs/CONTRATO-PHASE-A-PERSISTENCIA-CONCILIACIONES-AUDITLOG-STORAGE-AYS-20260707.md`.
  - `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260707-PHASEA-CONCILIACIONES-AUDITLOG-STORAGE.md`.
- **Regla:** define `conciliaciones`, `auditLog`, `documentosAdjuntos` y `storageRefs`; fija estados `propuesta/en_revision/validada/autorizada_para_confirmar/confirmada/revertida`; documenta que adjunto no confirma cobro y conciliación validada no aplica pago por sí sola.
- **Estado:** CERRADO COMO CONTRATO/DOCUMENTACIÓN EN RAMA / pendiente adapter LAB, validadores y ejecución local.

---

## B. Pendientes abiertos

### ABIERTO-BE-104-02 — Ejecutar runner + smoke visual/operativo real sobre rama empalmada
- **Área:** QA / Navegador.
- **Necesidad:** ejecutar runner local, abrir la plataforma y validar Conciliaciones.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-03 — Decisión sobre `index.html` permanente
- **Área:** Index central / Backend activation.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-04 — Backend real de secretos
- **Área:** Integraciones / Seguridad.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-05 — Auth LAB a Auth real
- **Área:** Auth / Equipo / Roles.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-06 — Adapter documentos/Storage/adjuntos real
- **Área:** Backend documentos / adjuntos / portal / cobros.
- **Estado:** ABIERTO.
- **Nota 2026-07-07:** contrato cerrado en CERRADO-BE-104-31; queda pendiente implementación LAB/real, reglas de acceso, URL temporal y validadores.

### ABIERTO-BE-104-07 — Junio/julio 2026 como caso especial de conciliación
- **Área:** Migración A&S / planillas / conciliación.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-08 — Pendientes Claude acumulados hasta próximo paquete
- **Área:** Coordinación Claude / Frontend / Academia.
- **Estado:** ABIERTO hasta que Paula pida nuevo paquete Claude.

### ABIERTO-BE-104-09 — Integrar parser real + generador + plan de persistencia
- **Área:** Backend importador / conciliaciones.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-10 — Ejecutar integración local del adapter Firestore LAB
- **Área:** Backend / Firestore LAB / conciliaciones.
- **Estado:** ABIERTO / requiere entorno local y autorización explícita.

### ABIERTO-BE-104-11 — Ejecutar smoke E2E conciliaciones LAB en entorno local
- **Área:** QA backend / conciliaciones.
- **Estado:** ABIERTO / requiere entorno local.

### ABIERTO-BE-104-12 — Ejecutar readiness UI/Bandeja en entorno local
- **Área:** Backend/frontend bridge.
- **Estado:** ABIERTO / requiere entorno local o mirror generado.

### ABIERTO-BE-104-14 — Futuro ejecutor autorizado de aplicación controlada
- **Área:** Backend / cobros / comisiones / auditLog / notificaciones.
- **Restricción:** no construir ejecutor real sin autorización explícita de Paula.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-16 — Ejecución local del orquestador score/propuestas plan-only
- **Área:** Backend / importador / score / propuestas / persistencia planificada.
- **Estado:** ABIERTO / agrupado en runner.

### ABIERTO-BE-104-17 — Ejecución local del readiness plan persistencia LAB
- **Área:** Backend / conciliaciones / adapter LAB futuro.
- **Estado:** ABIERTO / agrupado en runner.

### ABIERTO-BE-104-18 — Ejecución local del runner agrupado Conciliaciones
- **Área:** QA local / conciliaciones / reportes.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-19 — Ejecutar tests sintéticos modelo clientes
- **Área:** Backend / clientes / calidad / portal.
- **Necesidad:** ejecutar `node tools/orbit360-test-validar-modelo-clientes-ays.mjs`.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-20 — Ejecutar tests sintéticos modelo pólizas/recibos/cartera
- **Área:** Backend / pólizas / recibos / cartera.
- **Necesidad:** ejecutar `node tools/orbit360-test-validar-modelo-polizas-recibos-cartera-ays.mjs`.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-21 — Ejecutar tests sintéticos modelo cobros/pagos/conciliación
- **Área:** Backend / cobros / pagos reportados / conciliación.
- **Necesidad:** ejecutar `node tools/orbit360-test-validar-modelo-cobros-pagos-conciliacion-ays.mjs`.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-22 — Diseñar adapter LAB para persistencia `conciliaciones` + `auditLog`
- **Área:** Backend / Firestore LAB / conciliaciones / auditoría.
- **Necesidad:** convertir el contrato Phase A en adapter seguro sin tocar backend protegido hasta autorización y sin aplicar cobros.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-23 — Diseñar reglas de acceso para `documentosAdjuntos` y `storageRefs`
- **Área:** Backend / Storage / Seguridad / Portal.
- **Necesidad:** definir reglas tenant-isolated, rutas opacas, checks MIME/tamaño/checksum y acceso temporal.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-24 — Validador estático Phase A sin modificar tools existentes
- **Área:** QA / contrato backend.
- **Necesidad:** crear, cuando se autorice tocar tooling, un validador que revise contrato de estados, colecciones, fuente, moneda, idempotencyKey, correlationId y auditLog.
- **Estado:** ABIERTO.

---

## C. Pendientes para reportar a Claude cuando Paula pida paquete

1. No reintroducir persistencia sensible en `Orbit.store`, localStorage ni Firestore directo.
2. No reemplazar backend LAB ni scripts de validación al entregar nuevos ZIPs.
3. Mantener `CONTENT_V=5` y lección de conciliación.
4. No declarar cerrado backend real de `conciliaciones/auditLog`, score real, aplicación controlada ni smoke visual hasta ejecución ChatGPT/Codex.
5. Si Claude vuelve a modificar Conciliaciones, debe revisar manuales, Academia, rutas por rol y evaluaciones relacionadas.
6. Debe mostrar como estado honesto: propuesta/lista para revisión/pendiente de validación, no pago aplicado.
7. Debe conservar el lenguaje de readiness: plan listo no equivale a persistencia ni a pago aplicado.
8. Debe conservar el runner local como paso de QA previo a cualquier cambio que afecte Conciliaciones.
9. Debe conservar los criterios de bloqueo/no bloqueo y no reinterpretar OK de runner como autorización de backend real.
10. Debe conservar el checklist visual por roles y estado vacío honesto.
11. Debe respetar modelo clientes: portal cliente sin opción de correo, calidad de datos y no creación desde fuentes financieras.
12. Debe respetar modelo pólizas: estados, prima separada, cartera del año actual y producción sobre prima neta recaudada.
13. Debe respetar modelo cobros: pago reportado no es cobro aplicado, conciliación validada no aplica pago por sí sola, y `finmovs` no son cobros.
14. Debe conservar pendiente de Portal/Cobros/Documentos: adjunto de pago reportado visible y conciliable desde Cobros.
15. Debe enseñar en Academia/UX que `validada` no significa `confirmada`; `autorizada_para_confirmar` es un estado previo y auditable.
16. Debe conservar la separación de `documentosAdjuntos`/`storageRefs`: adjunto solo propone datos, no escribe entidades operativas sin diff/autorización/auditLog.
17. Debe reflejar que auditLog requiere actor, motivo, before/after hash, correlationId e idempotencyKey.

---

## D. Estado general actualizado

Backend LAB reforzado. Candidata Claude `062855.313` auditada y empalmada de forma segura en GitHub para la UI/Bandeja de `conciliaciones`, preservando backend LAB. Se agregó smoke estático de empalme. Se agregó perfilador de columnas por fuente, constructor de dryRunReport, adaptador de candidatos metadata-only, orquestador metadata-only, orquestador score/propuestas plan-only, readiness plan de persistencia LAB, runner agrupado de validaciones locales, guía/wrapper PowerShell, checklist/helper de smoke visual, contrato/modelo clientes, contrato/modelo pólizas/recibos/cartera, contrato/modelo cobros/pagos/conciliación y contrato Phase A para `conciliaciones`, `auditLog`, `documentosAdjuntos` y `storageRefs`. Quedan abiertos ejecución local del runner/smoke visual, adapter Firestore LAB real, parser real, persistencia `conciliaciones/auditLog`, score real contra datos validados, futuro ejecutor autorizado, adapter Storage/adjuntos, reglas de acceso y validadores Phase A.
