# Pendientes y mejoras backend post v1.104 — Orbit 360 A&S

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Uso:** registro acumulado para no perder hallazgos antes de pedir paquete formal para Claude.

## A. Pendientes cerrados en este bloque

### CERRADO-BE-104-01 — Loader LAB con tenant allowlist

- **Área:** Backend LAB / Seguridad tenant.
- **Necesidad:** evitar que `?tenant=` active LAB en tenants no autorizados.
- **Aplicado:** `core/backend-lab-loader.js` ahora permite solo `alianzas-soluciones` en LAB.
- **Impacto:** reduce riesgo multi-tenant antes de backend real.
- **Estado:** CERRADO EN RAMA.

### CERRADO-BE-104-02 — Init Firebase LAB con validación de config

- **Área:** Backend LAB / Firebase init.
- **Necesidad:** detectar config local incompleta sin exponer secretos.
- **Aplicado:** `core/backend-lab-init.js` valida `projectId` y `authDomain`, y solo muestra metadata pública.
- **Impacto:** mejora diagnóstico local y evita registrar valores sensibles.
- **Estado:** CERRADO EN RAMA.

### CERRADO-BE-104-03 — Guard runtime contra secretos y auth incorrecta

- **Área:** Backend LAB / Integraciones / Auth.
- **Necesidad:** impedir que pantallas nuevas o futuras vuelvan a persistir claves, tokens o webhooks desde frontend.
- **Aplicado:** nuevo `core/backend-lab-security-guard.js`.
- **Impacto:** aprendizaje obligatorio para prototipo comercializable: los secretos se manejan en backend/secret manager, no en UI ni Firestore directo.
- **Estado:** CERRADO EN RAMA / pendiente smoke real.

### CERRADO-BE-104-04 — Script de integración local v104

- **Área:** Tools / Index central.
- **Necesidad:** integrar loader/init/guard con backup y verificación, sin editar HTML grande directamente desde GitHub.
- **Aplicado:** `tools/orbit360-integrar-backend-lab-index.ps1` ahora inserta `backend-lab-security-guard.js` después del store LAB.
- **Impacto:** protege contra mojibake y mantiene método local controlado.
- **Estado:** CERRADO EN RAMA.

### CERRADO-BE-104-05 — Validador estático backend LAB

- **Área:** QA backend.
- **Necesidad:** validar contrato sin red/Firebase/secretos.
- **Aplicado:** `tools/orbit360-validar-backend-lab-contrato.mjs`.
- **Impacto:** reduce trabajo manual y permite verificar contratos antes del smoke.
- **Estado:** CERRADO EN RAMA.

### CERRADO-BE-104-06 — Score de confianza para conciliación

- **Área:** Backend importador / conciliación / planillas / cobros.
- **Necesidad:** evitar aplicación de pagos por coincidencias débiles, especialmente al cruzar planillas de comisiones, estados de cuenta de aseguradora o estado bancario.
- **Aplicado:**
  - `tools/orbit360-calcular-score-conciliacion-ays.mjs`.
  - `tools/orbit360-test-score-conciliacion-ays.mjs`.
  - `orbit360-platform/docs/CONTRATO-SCORE-CONFIANZA-CONCILIACION-AYS-20260704.md`.
  - `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260704-SCORE-CONCILIACION.md`.
- **Regla:** match exacto/probable/validación/bloqueado con evidencia de póliza, recibo/cuota, cliente, aseguradora, país/moneda, monto y periodo/fecha.
- **Impacto:** permite que planillas y estados generen propuestas trazables antes de impactar Cobros, Cliente360, Portal, Comisiones, Finanzas o Liquidaciones.
- **Estado:** CERRADO EN RAMA / pendiente ejecución local en repo completo.

## B. Pendientes abiertos

### ABIERTO-BE-104-01 — Empalme completo del candidato Claude final en GitHub

- **Área:** Empalme frontend/backend.
- **Necesidad:** el candidato activo fue auditado localmente, pero aún no está aplicado completo en GitHub.
- **Candidato auditado:** `Prototype Development Request - 2026-07-04T152321.882.zip`.
- **Esperado:** empalme aditivo, no reemplazo total.
- **Archivos protegidos:** backend LAB, `data/store.js`, rules, tools, docs backend.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-02 — Smoke visual/operativo real sobre rama empalmada

- **Área:** QA / Navegador.
- **Necesidad:** validar render real con backend LAB y guard activo después del empalme.
- **Bloqueo:** el entorno actual no permite Chromium/smoke visual completo de la rama empalmada.
- **Esperado:** ejecutar en equipo local o ambiente con navegador.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-03 — Decisión sobre `index.html` permanente

- **Área:** Index central / Backend activation.
- **Necesidad:** decidir si integrar permanentemente loader/init/guard en `index.html` o mantener inyección temporal hasta cerrar riesgo de codificación.
- **Esperado:** no editar a ciegas el HTML grande.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-04 — Backend real de secretos

- **Área:** Integraciones / Seguridad.
- **Necesidad:** construir backend/secret manager por tenant para Make, IA, WhatsApp, correo y conectores.
- **Esperado:** Firestore guarda solo referencias/estado; secretos reales quedan fuera del frontend.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-05 — Auth LAB a Auth real

- **Área:** Auth / Equipo / Roles.
- **Necesidad:** pasar de usuario LAB a creación y control real de usuarios por asesor/correo/rol.
- **Esperado:** Equipo crea usuario Auth y envía acceso por canal autorizado; roles y módulos visibles se respetan.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-06 — Contrato pólizas/recibos/cartera/conciliación

- **Área:** Backend importador / pólizas / cobros / comisiones / finanzas.
- **Necesidad:** alinear generación de recibos, cartera activa, estados de póliza, país/moneda, planillas de comisiones y conciliación con aseguradoras.
- **Documento agregado:** `orbit360-platform/docs/CONTRATO-POLIZAS-RECIBOS-CARTERA-CONCILIACION-AYS-20260704.md`.
- **Estado del ZIP auditado:** la candidata activa ya corrige parte de este bloque en `core/importa.js`.
- **Pendiente real:** empalmar sin pisar backend protegido y completar backend/parser real con manifest, score, dry-run y validación.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-07 — Junio/julio 2026 como caso especial de conciliación

- **Área:** Migración A&S / planillas / conciliación.
- **Necesidad:** junio y julio deben conciliarse especialmente con planillas de comisiones porque no están cubiertos por el archivo financiero revisado.
- **Esperado:** documentar regla como configuración de migración, no hardcode productivo; planillas pueden confirmar pagos aplicados si la fila real lo respalda y hay coincidencia confiable.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-08 — Auditoría y paquete Claude de candidata activa

- **Área:** Coordinación Claude / Backend.
- **Necesidad:** Paula no puede pedir nuevo candidato sin primero auditar el actual y entregar paquete Claude actualizado.
- **Documentos agregados:**
  - `orbit360-platform/docs/AUDITORIA-FORENSE-CANDIDATO-ACTIVO-CLAUDE-20260704-152321.md`.
  - `orbit360-platform/docs/PAQUETE-COMPLETO-CLAUDE-ACTUALIZADO-POST-AUDITORIA-20260704.md`.
- **Resultado:** auditoría de archivos reales realizada. No se aceptó resumen sin verificar.
- **Estado:** CERRADO COMO DOCUMENTACIÓN / ABIERTO PARA EJECUCIÓN DE CLAUDE.

### ABIERTO-BE-104-09 — Integrar score a dry-run/manifest y bandeja de conciliación

- **Área:** Backend importador / conciliaciones.
- **Necesidad:** conectar el score seguro con el flujo de manifest/dry-run para que cada fila de planilla o estado derive en conciliación trazable.
- **Esperado:** `dryRunReport` debe incluir score, decisión, acción propuesta, fuente, hoja/fila/bloque/periodo, país, moneda y motivo de bloqueo/validación.
- **Estado:** ABIERTO.

## C. Pendientes para reportar a Claude cuando Paula pida paquete

1. Mantener copy de Integraciones/Automatizaciones sin mostrar secretos ni referencias internas como conexión real.
2. Usar lenguaje de conexión segura/pendiente, no presentar integraciones como activas si no están conectadas.
3. No reintroducir persistencia sensible en `Orbit.store`, localStorage ni Firestore directo.
4. Conservar el aprendizaje del guard v1.104 dentro del prototipo base.
5. No reemplazar backend LAB ni scripts de validación al entregar nuevos ZIPs.
6. Conservar mejoras del candidato activo: importador con fuentes separadas, país/moneda sin default, planillas de comisión, documentos como parches y estado bancario como conciliación.
7. Corregir versionado documental v1.114/v1.117/v1.123.
8. Corregir `GTQ` fijo en KPIs/totales agregados.
9. En UI de Pólizas, Cobros, Cliente360, Portal, Comisiones y Finanzas, separar prima neta/gastos/IVA/total y mostrar trazabilidad.
10. Planilla de comisiones debe poder actuar como fuente de conciliación de pagos aplicados solo cuando la fila real lo confirme.
11. Portal Cliente debe mostrar pago reportado/en revisión/aplicado/conciliado sin confundir estados.
12. Academia debe conservar avances v1.118-v1.123 e incorporar evaluación aplicada sobre pólizas, cobros, planillas y Portal.
13. Mostrar en Importar/Comisiones/Cobros los estados de score: exacto, probable, requiere validación y bloqueado.

## D. Estado general

Backend LAB reforzado. Candidata activa Claude auditada. Score de conciliación agregado como herramienta segura. Aún falta empalme completo GitHub, smoke real y continuidad Firestore/Auth/importadores por fases.

## E. Documentos agregados después del bloque pólizas/cartera y auditoría actual

- `orbit360-platform/docs/CONTRATO-POLIZAS-RECIBOS-CARTERA-CONCILIACION-AYS-20260704.md`
- `orbit360-platform/docs/PAQUETE-CLAUDE-BLOQUE-POLIZAS-RECIBOS-CARTERA-20260704.md`
- `orbit360-platform/docs/AUDITORIA-FORENSE-CANDIDATO-ACTIVO-CLAUDE-20260704-152321.md`
- `orbit360-platform/docs/PAQUETE-COMPLETO-CLAUDE-ACTUALIZADO-POST-AUDITORIA-20260704.md`
- `orbit360-platform/docs/CONTRATO-SCORE-CONFIANZA-CONCILIACION-AYS-20260704.md`
- `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260704-SCORE-CONCILIACION.md`
