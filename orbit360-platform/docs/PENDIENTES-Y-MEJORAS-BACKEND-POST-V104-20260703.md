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

## B. Pendientes abiertos

### ABIERTO-BE-104-01 — Empalme completo del candidato Claude final en GitHub

- **Área:** Empalme frontend/backend.
- **Necesidad:** el candidato fue auditado y preparado localmente, pero aún no está aplicado completo en GitHub.
- **Esperado:** empalme aditivo, no reemplazo total.
- **Archivos protegidos:** backend LAB, `data/store.js`, rules, tools, docs backend.
- **Estado:** ABIERTO.

### ABIERTO-BE-104-02 — Smoke visual/operativo real

- **Área:** QA / Navegador.
- **Necesidad:** validar render real con el backend LAB y guard activo.
- **Bloqueo:** el entorno actual no permite Chromium/smoke visual.
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
- **Esperado:** Equipo crea usuario Auth y envía credenciales por Make; roles y módulos visibles se respetan.
- **Estado:** ABIERTO.

## C. Pendientes para reportar a Claude cuando Paula pida paquete

1. Mantener copy de Integraciones/Automatizaciones sin pedir ni mostrar API keys o webhooks como valores reales.
2. Usar “conexión segura”, “proveedor seguro”, “referencia segura” y no “pega tu secreto aquí” en UI final.
3. No reintroducir persistencia de credenciales en `Orbit.store`, localStorage ni Firestore directo.
4. Conservar el aprendizaje del guard v1.104 dentro del prototipo base.
5. No reemplazar backend LAB ni scripts de validación al entregar nuevos ZIPs.

## D. Estado general

Backend LAB reforzado. Aún falta empalme completo GitHub del candidato Claude final, smoke real y continuidad Firestore/Auth por fases.
