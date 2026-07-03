# Mejoras ChatGPT/Codex que deben notificarse a Claude · post v1.97

**Fecha:** 2026-07-03  
**Base:** Claude v1.97  
**Rama backend:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** documento puente para el proximo paquete Claude cuando Paula lo solicite.

---

## 1. Regla

Toda mejora realizada por ChatGPT/Codex que afecte el prototipo comercializable debe notificarse a Claude para que la incorpore en la base del prototipo.

No basta con corregir en backend branch. Si el cambio mejora UX, contrato de modulo, eventos de integracion, reglas de negocio o documentacion de producto, debe quedar aqui.

---

## 2. Mejoras/fixes que Claude debe incorporar

### CL-PEND-001 · Metodologia incremental Orbit

Nuevo documento:

- `docs/METODOLOGIA-TRABAJO-INCREMENTAL-ORBIT-20260703.md`

Claude debe respetar:

- no reiniciar base,
- tratar cada ZIP como release candidate incremental,
- actualizar `CHANGELOG.md`,
- no crear duplicados/anidados,
- documentar cerrados/abiertos/regresiones,
- no tocar archivos protegidos sin merge manual.

### CL-PEND-002 · Marketing operativo

Documentos:

- `docs/ESPEC-MARKETING-OPERATIVO-POST-V197-20260703.md`
- `docs/ESPEC-INTEGRACIONES-MARKETING-MAKE-POST-V197-20260703.md`

Claude debe mejorar `modules/marketing.js` para:

- ficha diaria operativa,
- multiples piezas por contenido,
- campanas/objetivos/publico/pais/ramo,
- metricas por canal/pieza,
- estados ampliados,
- botones que llamen `Orbit.integraciones.emit(...)` si existe,
- fallback demo si no existe helper.

### CL-PEND-003 · Helper `Orbit.integraciones`

Nuevo archivo backend/base:

- `core/integraciones.js`

Claude debe considerar este contrato al actualizar modulos:

```js
Orbit.integraciones.emit(evento, payload, opts)
```

Uso esperado desde Marketing:

- `marketing_programar_publicacion`,
- `marketing_generar_pieza`,
- `marketing_sync_sheets`,
- `marketing_campana_email`,
- `marketing_whatsapp_broadcast`,
- `marketing_metricas_actualizadas`.

Regla: los modulos no llaman APIs externas directo. Emiten eventos. Backend/Make resuelve integracion real por tenant.

### CL-PEND-004 · Auth LAB / demo no mezclar

Fix aplicado en backend:

- `core/auth.js` dual demo + Firebase LAB.

Claude debe evitar volver a incrustar credenciales demo de manera que rompan el modo LAB. Si mantiene demo visual, debe permitir que `auth.js` pinte valores segun modo.

### CL-PEND-005 · Errores reincidentes que Claude debe evitar

Documentos:

- `docs/BITACORA-ERRORES-REINCIDENTES-20260703.md`
- `docs/E-REC-007-ZIP-ONECLICK-BLOQUEADO-20260703.md`

Claude debe evitar:

- ZIPs anidados,
- archivos duplicados,
- notas tecnicas visibles,
- cambios que reintroduzcan `localStorage` directo en modulos,
- reemplazar `auth.js`/`store.js`/hooks backend sin preservar contrato,
- dejar `CHANGELOG.md` desactualizado.

---

## 3. Cambios que NO son para Claude salvo referencia

- `data/store-firestore-lab.local.js`: backend LAB, no debe tocarse desde prototipo.
- `core/backend-lab-loader.js`: backend LAB.
- `core/backend-lab-init.js`: backend LAB.
- `core/auth-firebase.config.local.js`: archivo local protegido, nunca subir ni pedir a Claude.

---

## 4. Estado

**ACTIVO.**

Cuando Paula pida el paquete para Claude, este documento debe incluirse o resumirse junto con los pendientes acumulados post-v1.97.
