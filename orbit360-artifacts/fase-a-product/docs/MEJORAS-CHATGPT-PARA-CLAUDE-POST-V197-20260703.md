# Mejoras ChatGPT/Codex que deben notificarse a Claude · post v1.97

**Fecha:** 2026-07-03  
**Base:** Claude v1.97  
**Rama backend:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** documento puente para el próximo paquete Claude cuando Paula lo solicite.

---

## 1. Regla

Toda mejora realizada por ChatGPT/Codex que afecte el prototipo comercializable debe notificarse a Claude para que la incorpore en la base del prototipo.

No basta con corregir en backend branch. Si el cambio mejora UX, contrato de módulo, eventos de integración, reglas de negocio, documentación de producto o evita regresiones, debe quedar aquí.

---

## 2. Mejoras/fixes que Claude debe incorporar

### CL-PEND-001 · Metodología incremental Orbit

Documento:

- `docs/METODOLOGIA-TRABAJO-INCREMENTAL-ORBIT-20260703.md`

Claude debe respetar:

- no reiniciar base,
- tratar cada ZIP como release candidate incremental,
- actualizar `CHANGELOG.md`,
- no crear duplicados/anidados,
- documentar cerrados/abiertos/regresiones,
- no tocar archivos protegidos sin merge manual,
- conservar avances ChatGPT/Codex que apliquen a la base comercializable.

---

### CL-PEND-002 · Marketing operativo

Documentos:

- `docs/ESPEC-MARKETING-OPERATIVO-POST-V197-20260703.md`
- `docs/ESPEC-INTEGRACIONES-MARKETING-MAKE-POST-V197-20260703.md`
- `docs/AVANCE-MARKETING-INTEGRACIONES-UI-20260703.md`

Claude debe mejorar `modules/marketing.js` para:

- ficha diaria operativa,
- múltiples piezas por contenido,
- campañas/objetivos/público/país/ramo,
- métricas por canal/pieza,
- estados ampliados,
- historial de eventos por contenido,
- botones conectados a `Orbit.integraciones.emit(...)`,
- fallback demo si no existe helper,
- no dejar botones únicamente como `toast` sin trazabilidad.

Avance aplicado por ChatGPT/Codex que Claude debe conservar:

- `modules/marketing.js` ya emite eventos seguros para:
  - `marketing_sync_sheets`,
  - `marketing_generar_pieza`,
  - `marketing_programar_publicacion`,
  - `marketing_contenido_creado`.

Commit aplicado:

- `d03d5e1c0550703e6038eb2475288bcb944180fe` · `feat(marketing): emitir eventos de integracion seguros`

---

### CL-PEND-003 · Helper `Orbit.integraciones`

Archivo base:

- `core/integraciones.js`

Contrato:

```js
Orbit.integraciones.emit(evento, payload, opts)
Orbit.integraciones.status()
Orbit.integraciones.list(filter)
Orbit.integraciones.resumen()
Orbit.integraciones.diagnostico(filter)
Orbit.integraciones.openPanel(filter)
Orbit.integraciones.mark(idEvento, patch)
```

Uso esperado desde Marketing:

- `marketing_programar_publicacion`,
- `marketing_generar_pieza`,
- `marketing_sync_sheets`,
- `marketing_campana_email`,
- `marketing_whatsapp_broadcast`,
- `marketing_metricas_actualizadas`,
- `marketing_contenido_creado`.

Regla: los módulos no llaman APIs externas directo. Emiten eventos. Backend/Make resuelve integración real por tenant.

Commits aplicados:

- `def19ea93d3ee63f45465b7aed2334c0db8af6a2` · `feat(integraciones): agregar helper seguro de eventos`
- `23fca9827cab93c8da516037392c73a7f27341e6` · `feat(integraciones): extender seed demo marketing`
- `6d7e6703735cb7c0766a595cdc35545f8a73ba32` · `feat(integraciones): agregar diagnostico de eventos`
- `795776c7766a355c60b9400ed48d756d0296cf26` · `feat(integraciones): cargar panel diagnostico bajo demanda`

Claude debe conservar este archivo y su carga desde el shell. Si lo modifica, debe mantener compatibilidad completa con el contrato anterior.

---

### CL-PEND-004 · Panel diagnóstico de integraciones

Archivo nuevo:

- `core/integraciones-panel.js`

Documento:

- `docs/AVANCE-PANEL-DIAGNOSTICO-INTEGRACIONES-20260703.md`

Commit aplicado:

- `b964e498d7e8b4dd7054ae6d29bdaa813f8ef97d` · `feat(integraciones): agregar panel diagnostico reutilizable`

Claude debe incorporar este panel dentro de la UI final de Automatizaciones/Integraciones:

1. Agregar botón “Ver eventos de integración”.
2. Llamar `Orbit.integraciones.openPanel()`.
3. Desde Marketing, permitir historial por contenido con:

```js
Orbit.integraciones.openPanel({ modulo: 'marketing', entidad: 'contenidos', entidadId: contenido.id })
```

4. Mostrar KPIs:
   - total eventos,
   - pendientes,
   - pendiente configuración,
   - errores.
5. Mostrar tabla de últimos eventos.
6. Filtros por módulo, proveedor, evento y estado.
7. Mantenerlo como diagnóstico seguro hasta activar backend/Make por tenant.

---

### CL-PEND-005 · Seed demo de Marketing + Integraciones

Documento:

- `docs/AVANCE-SEED-MARKETING-INTEGRACIONES-20260703.md`

Estructura demo agregada desde `core/integraciones.js`:

- `integraciones`,
- `eventosIntegracion`,
- `campanas`,
- `piezas`,
- `metricasMarketing`.

Campos ampliados en `contenidos`:

- `tenantId`,
- `campanaId`,
- `objetivo`,
- `publico`,
- `pais`,
- `piezaIds`,
- `programacion`.

Claude debe mantener compatibilidad con estas colecciones. Si decide mover la extensión al `data/seed.js`, debe hacerlo sin hardcodear A&S y sin romper `Orbit.store.init(Orbit.SEED)`.

---

### CL-PEND-006 · Automatizaciones: mojibake y panel final

Hallazgo:

- `modules/automatizaciones.js` presenta señales de codificación dañada/mojibake en textos visibles.

Decisión ChatGPT/Codex:

- No reemplazarlo completo en backend branch para evitar regresión.
- Crear panel reutilizable en core y documentar integración UX para Claude.

Claude debe:

- corregir mojibake/textos dañados,
- integrar el panel de eventos dentro de Automatizaciones,
- no duplicar pantallas,
- no dejar notas técnicas visibles,
- mantener el diseño Orbit 360.

---

### CL-PEND-007 · Auth LAB / demo no mezclar

Fix aplicado en backend:

- `core/auth.js` dual demo + Firebase LAB.

Claude debe evitar volver a incrustar credenciales demo de manera que rompan el modo LAB. Si mantiene demo visual, debe permitir que `auth.js` pinte valores según modo.

---

### CL-PEND-008 · Errores reincidentes que Claude debe evitar

Documentos:

- `docs/BITACORA-ERRORES-REINCIDENTES-20260703.md`
- `docs/E-REC-007-ZIP-ONECLICK-BLOQUEADO-20260703.md`

Claude debe evitar:

- ZIPs anidados,
- archivos duplicados,
- notas técnicas visibles,
- cambios que reintroduzcan `localStorage` directo en módulos,
- reemplazar `auth.js`/`store.js`/hooks backend sin preservar contrato,
- dejar `CHANGELOG.md` desactualizado,
- perder avances de `core/integraciones.js`, `core/integraciones-panel.js` y `modules/marketing.js`.

---

## 3. Cambios que NO son para Claude salvo referencia

- `data/store-firestore-lab.local.js`: backend LAB, no debe tocarse desde prototipo.
- `core/backend-lab-loader.js`: backend LAB.
- `core/backend-lab-init.js`: backend LAB.
- `core/auth-firebase.config.local.js`: archivo local protegido, nunca subir ni pedir a Claude.

---

## 4. Estado

**ACTIVO / ACTUALIZADO.**

Cuando Paula pida el paquete para Claude, este documento debe incluirse o resumirse junto con los pendientes acumulados post-v1.97.
