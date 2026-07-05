# Pendientes y mejoras backend post v1.104 — Orbit 360 A&S

**Fecha base:** 2026-07-03  
**Actualización:** 2026-07-05  
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
- **Aplicado:**
  - `orbit360-platform/modules/conciliaciones.js` agregado.
  - `orbit360-platform/index.html` actualizado como híbrido LAB.
- **Regla aplicada:** no se copió `index.html` bruto del ZIP; se preservaron `backend-lab-loader`, `backend-lab-init`, `data/store-firestore-lab.local.js` y `auth labfix`.
- **Regla operativa del módulo:** `Conciliaciones` lee y actualiza solo `Orbit.store('conciliaciones')`; no toca `cobros`, `comisiones`, `finmovs`, cartera ni producción.
- **Estado:** CERRADO EN RAMA / pendiente smoke visual y validación local.

### CERRADO-FRONT-062855-SMOKE-STATIC — Smoke estático de empalme Conciliaciones
- **Área:** QA frontend/backend bridge / Conciliaciones.
- **Aplicado:**
  - `tools/orbit360-validar-empalme-conciliaciones-062855-ays.mjs`.
  - `orbit360-platform/docs/CONTRATO-SMOKE-EMPALME-CONCILIACIONES-062855-AYS-20260705.md`.
  - `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260705-SMOKE-EMPALME-CONCILIACIONES.md`.
- **Regla:** valida index híbrido, carga única del módulo, visibilidad Dirección/Admin/Finanzas, actualización solo de propuestas y estado honesto validado no equivale a pagado.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecución local y smoke visual.

### CERRADO-BE-104-19 — Perfilador de columnas por fuente
- **Área:** Backend / importador / parser / fuentes separadas.
- **Aplicado:**
  - `tools/orbit360-perfilar-columnas-fuente-ays.mjs`.
  - `tools/orbit360-test-perfilar-columnas-fuente-ays.mjs`.
  - `orbit360-platform/docs/CONTRATO-PERFILADOR-COLUMNAS-FUENTE-AYS-20260705.md`.
  - `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260705-PERFILADOR-COLUMNAS-FUENTE.md`.
- **Regla:** perfila metadata de columnas por fuente; no lee filas reales, no escribe, no aplica pagos y no genera cartera/producción.
- **Estado:** CERRADO COMO TOOLING EN RAMA.

### CERRADO-BE-104-20 — Constructor de dryRunReport sin payload real
- **Área:** Backend / importador / parser / dryRunReport.
- **Aplicado:**
  - `tools/orbit360-construir-dryrun-report-fuente-ays.mjs`.
  - `tools/orbit360-test-construir-dryrun-report-fuente-ays.mjs`.
  - `orbit360-platform/docs/CONTRATO-CONSTRUCTOR-DRYRUN-REPORT-FUENTE-AYS-20260705.md`.
  - `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260705-CONSTRUCTOR-DRYRUN-REPORT.md`.
- **Regla:** construye sobre seguro de `dryRunReport` desde manifest + perfil + fuente separada; no lee filas reales, no escribe, no aplica pagos y no inventa candidatos de conciliación por fila.
- **Estado:** CERRADO COMO TOOLING EN RAMA.

### CERRADO-BE-104-21 — Adaptador de candidatos metadata-only para dryRunReport
- **Área:** Backend / importador / parser / dryRunReport / conciliaciones.
- **Aplicado:**
  - `tools/orbit360-adaptar-candidatos-dryrun-metadata-ays.mjs`.
  - `tools/orbit360-test-adaptar-candidatos-dryrun-metadata-ays.mjs`.
  - `orbit360-platform/docs/CONTRATO-ADAPTADOR-CANDIDATOS-DRYRUN-METADATA-AYS-20260705.md`.
  - `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260705-ADAPTADOR-CANDIDATOS-DRYRUN.md`.
- **Regla:** combina dryRun envelope con candidatos metadata-only compatibles con el validador `tools/orbit360-validar-dryrun-report-ays.mjs`; no lee filas reales, no escribe, no aplica pagos, no genera conciliaciones reales.
- **Estado:** CERRADO COMO TOOLING EN RAMA.

### CERRADO-BE-104-22 — Orquestador de pipeline metadata-only
- **Área:** Backend / importador / parser / dryRunReport / QA.
- **Aplicado:**
  - `tools/orbit360-orquestar-pipeline-metadata-ays.mjs`.
  - `tools/orbit360-test-orquestar-pipeline-metadata-ays.mjs`.
  - `orbit360-platform/docs/CONTRATO-ORQUESTADOR-PIPELINE-METADATA-AYS-20260705.md`.
  - `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260705-ORQUESTADOR-PIPELINE-METADATA.md`.
- **Regla:** encadena perfil, dryRun envelope, candidatos metadata-only y validación final dryRun; no usa datos reales, no escribe, no ejecuta score/propuestas reales.
- **Estado:** CERRADO COMO TOOLING EN RAMA.

### CERRADO-BE-104-23 — Orquestador score/propuestas plan-only
- **Área:** Backend / importador / parser / score / propuestas / plan de persistencia.
- **Aplicado:**
  - `tools/orbit360-orquestar-score-propuestas-plan-ays.mjs`.
  - `tools/orbit360-test-orquestar-score-propuestas-plan-ays.mjs`.
  - `orbit360-platform/docs/CONTRATO-ORQUESTADOR-SCORE-PROPUESTAS-PLAN-AYS-20260705.md`.
  - `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260705-ORQUESTADOR-SCORE-PROPUESTAS-PLAN.md`.
- **Regla:** encadena pipeline metadata-only, score gate, propuestas `conciliaciones` y plan de persistencia; no usa datos reales, no escribe, no aplica pagos, no genera cartera ni producción.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecución local.

### CERRADO-BE-104-24 — Readiness plan de persistencia LAB
- **Área:** Backend / conciliaciones / plan persistencia / adapter LAB futuro.
- **Aplicado:**
  - `tools/orbit360-validar-readiness-plan-persistencia-lab-ays.mjs`.
  - `tools/orbit360-test-validar-readiness-plan-persistencia-lab-ays.mjs`.
  - `orbit360-platform/docs/CONTRATO-READINESS-PLAN-PERSISTENCIA-LAB-AYS-20260705.md`.
  - `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260705-READINESS-PLAN-PERSISTENCIA-LAB.md`.
- **Regla:** valida plan de persistencia antes de adapter LAB; bloquea payload/filas reales, secretos, banderas de escritura/aplicación, tenants mezclados, estados `APLICADA`, moneda incoherente o rutas sin aislamiento tenant.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecución local.

### CERRADO-BE-104-25 — Runner agrupado de validaciones locales Conciliaciones
- **Área:** QA backend/frontend bridge / conciliaciones / validaciones locales.
- **Aplicado:**
  - `tools/orbit360-run-validaciones-locales-conciliaciones-ays.mjs`.
  - `orbit360-platform/docs/CONTRATO-RUNNER-VALIDACIONES-LOCALES-CONCILIACIONES-AYS-20260705.md`.
  - `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260705-RUNNER-VALIDACIONES-LOCALES-CONCILIACIONES.md`.
- **Regla:** agrupa smoke estático, test orquestador, test readiness y `node --check`; calcula hash antes/después de archivos protegidos y bloquea si cambian.
- **Estado:** CERRADO COMO TOOLING EN RAMA / pendiente ejecución local.

---

## B. Pendientes abiertos

### ABIERTO-BE-104-02 — Smoke visual/operativo real sobre rama empalmada
- **Área:** QA / Navegador.
- **Necesidad:** abrir la plataforma y validar que Conciliaciones aparezca para Dirección/Admin/Finanzas, que renderice vacío honestamente y que acciones no toquen cobros.
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

### ABIERTO-BE-104-06 — Contrato pólizas/recibos/cartera/conciliación
- **Área:** Backend importador / pólizas / cobros / comisiones / finanzas.
- **Estado:** ABIERTO.

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
- **Estado:** ABIERTO / requiere entorno local.

### ABIERTO-BE-104-11 — Ejecutar smoke E2E conciliaciones LAB en entorno local
- **Área:** QA backend / conciliaciones.
- **Estado:** ABIERTO / requiere entorno local.

### ABIERTO-BE-104-12 — Ejecutar readiness UI/Bandeja en entorno local
- **Área:** Backend/frontend bridge.
- **Estado:** ABIERTO / requiere entorno local o mirror generado.

### ABIERTO-BE-104-13 — Smoke UI/Bandeja `conciliaciones`
- **Área:** Frontend/Backend bridge.
- **Estado:** EMPALMADO / smoke estático preparado / pendiente smoke visual.

### ABIERTO-BE-104-14 — Futuro ejecutor autorizado de aplicación controlada
- **Área:** Backend / cobros / comisiones / auditLog / notificaciones.
- **Restricción:** no construir ejecutor real sin autorización explícita de Paula.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-16 — Ejecución local del orquestador score/propuestas plan-only
- **Área:** Backend / importador / score / propuestas / persistencia planificada.
- **Necesidad:** ejecutar `tools/orbit360-test-orquestar-score-propuestas-plan-ays.mjs` en entorno local/repo completo y revisar reportes antes de cualquier persistencia LAB.
- **Estado:** ABIERTO / agrupado en runner.

### ABIERTO-BE-104-17 — Ejecución local del readiness plan persistencia LAB
- **Área:** Backend / conciliaciones / adapter LAB futuro.
- **Necesidad:** ejecutar `tools/orbit360-test-validar-readiness-plan-persistencia-lab-ays.mjs` y revisar reportes antes de cualquier adapter Firestore LAB.
- **Estado:** ABIERTO / agrupado en runner.

### ABIERTO-BE-104-18 — Ejecución local del runner agrupado Conciliaciones
- **Área:** QA local / conciliaciones / reportes.
- **Necesidad:** ejecutar `node tools/orbit360-run-validaciones-locales-conciliaciones-ays.mjs` en entorno local, revisar `_orbit360_reports` y confirmar que no hubo cambios en archivos protegidos.
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

---

## D. Estado general actualizado

Backend LAB reforzado. Candidata Claude `062855.313` auditada y empalmada de forma segura en GitHub para la UI/Bandeja de `conciliaciones`, preservando backend LAB. Se agregó smoke estático de empalme. Se agregó perfilador de columnas por fuente, constructor de dryRunReport, adaptador de candidatos metadata-only, orquestador metadata-only, orquestador score/propuestas plan-only, readiness plan de persistencia LAB y runner agrupado de validaciones locales como intermedios entre manifest y futura persistencia LAB. Quedan abiertos smoke visual/local, adapter Firestore LAB real, parser real, persistencia `conciliaciones/auditLog`, score real contra datos validados, futuro ejecutor autorizado y ejecución local del runner agrupado.