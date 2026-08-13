# Bitácora backend — Adapter Firestore LAB `conciliaciones/auditLog`

**Fecha:** 2026-07-04  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft  
**Estado:** tooling de integración local protegida y validador estático agregados. No deploy, no merge, no secretos, no writes reales.

---

## 2026-07-04 — Preparación segura del adapter Firestore LAB para `conciliaciones/auditLog`

- **Módulo/área:** Backend LAB / Firestore / conciliaciones / auditLog.
- **Necesidad:** después del ejecutor LAB local, faltaba preparar el Store Firestore LAB para observar/persistir `conciliaciones` y `auditLog` como colecciones tenant-safe.
- **Esperado:** agregar integración protegida para que el adapter Firestore LAB pueda incluir `conciliaciones/auditLog` sin reemplazo bruto del archivo protegido.
- **Causa raíz:** `store-firestore-lab.local.js` es backend protegido; no debe ser sobrescrito por ZIPs Claude ni editado masivamente sin backup.
- **Archivos agregados:**
  - `tools/orbit360-integrar-adapter-conciliaciones-firestore-lab-ays.ps1`
  - `tools/orbit360-validar-adapter-conciliaciones-firestore-lab-ays.mjs`
  - `tools/orbit360-test-validar-adapter-conciliaciones-firestore-lab-ays.mjs`
  - `orbit360-platform/docs/CONTRATO-ADAPTER-FIRESTORE-LAB-CONCILIACIONES-AUDITLOG-AYS-20260704.md`
- **Fix/mejora aplicada:** integración local con backup y validación estática; detecta si faltan `conciliaciones/auditLog`, verifica tenant, gate `firestore-lab`, rutas `tenantId/{tenantId}/{collection}`, API compatible y ausencia de textos de aplicación directa.
- **Impacto comercializable:** prepara una bandeja auditable real para conciliaciones, separada de `cobros`, sin aplicar pagos de forma automática.
- **Estado:** LISTO EN RAMA COMO TOOLING / pendiente ejecutar `-Apply` en entorno local y smoke.

---

## Seguridad aplicada

El validador estático revisa que el adapter conserve:

```txt
mode === firestore-lab
tenantId === alianzas-soluciones
canonical path tenantId/{tenantId}/{collection}
insert/update/all/where
onSnapshot
_emit
cleanForWrite
```

Y bloquea textos que podrían indicar aplicación directa:

```txt
apply_payment
aplicar_pago
estado:'Pagado'
estado:"Pagado"
postRecaudo(
```

---

## Pruebas sintéticas agregadas

Suite:

```txt
tools/orbit360-test-validar-adapter-conciliaciones-firestore-lab-ays.mjs
```

Casos cubiertos:

1. adapter válido.
2. falta `conciliaciones`.
3. falta `auditLog`.
4. falta gate `firestore-lab`.
5. texto prohibido `postRecaudo`.

Resultado esperado de la suite sintética:

```txt
Casos: 5
FAIL: 0
RESULTADO: OK
```

---

## Pendiente siguiente

Ejecutar localmente:

```powershell
powershell -ExecutionPolicy Bypass -File tools/orbit360-integrar-adapter-conciliaciones-firestore-lab-ays.ps1 -DryRun
powershell -ExecutionPolicy Bypass -File tools/orbit360-integrar-adapter-conciliaciones-firestore-lab-ays.ps1 -Apply
node tools/orbit360-validar-adapter-conciliaciones-firestore-lab-ays.mjs
```

Luego smoke local extremo a extremo:

```txt
propuestas sintéticas -> plan persistencia -> ejecutor local mirror -> adapter validado -> readiness UI/bandeja
```
