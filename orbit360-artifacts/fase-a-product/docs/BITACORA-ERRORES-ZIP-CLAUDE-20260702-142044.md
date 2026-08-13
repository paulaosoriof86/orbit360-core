# Bitacora de errores - ZIP Claude 2026-07-02 14:20:44

Fecha: 2026-07-02
ZIP: `Prototype Development Request - 2026-07-02T142044.699.zip`
Estado: documento delta creado porque `BITACORA-ERRORES.md` ya es largo y el conector puede truncar contenido.

---

## 1. P0 - localStorage directo reintroducido/conservado en Configuracion

- Fecha: 2026-07-02
- Modulo: Configuracion / Marca / Logo white-label
- Sintoma/necesidad: El ZIP nuevo conserva `localStorage.setItem('orbit360_logo', ...)` y `localStorage.removeItem('orbit360_logo')` dentro de `modules/configuracion.js`.
- Esperado: Ningun modulo debe tocar `localStorage` directo. El logo y la configuracion white-label deben pasar por `Orbit.tenant`, `Orbit.store.pref/setPref` o configuracion tenant.
- Causa raiz si aplica: Remanente del prototipo visual; el ZIP de Claude no hereda automaticamente el parche local backend donde esto ya se habia saneado.
- Archivo/funcion: `modules/configuracion.js`, bloque `Logo del cliente`.
- Fix o mejora aplicada: No se empalma `modules/configuracion.js` completo sin parche. Hallazgo documentado y marcado como bloqueo de empalme full-copy.
- Impacto en prototipo comercializable: Critico para SaaS multi-tenant y backend-swappable; aplicar a prototipo base.
- Estado: ABIERTO.

---

## 2. P1/P0 - Fechas quemadas en flujos operativos

- Fecha: 2026-07-02
- Modulo: Ciclo/Ops, Cliente 360, Portal, Siniestros
- Sintoma/necesidad: El ZIP documenta avances de fechas vivas, pero el escaneo encontro literales operativos `2026-06-20`, `2026-06-22`, `2026-06-24`, `2026-06-27` en flujos que crean o precargan datos.
- Esperado: Toda fecha operativa nueva debe derivarse de `Orbit.ui.today()`, fecha relativa o valor editable del usuario; no debe quedar anclada a junio 2026.
- Causa raiz si aplica: Saneamiento parcial: `data/seed.js` y `core/ui.js` avanzaron, pero `core/ciclo.js` y algunos defaults de modulos no fueron barridos completamente.
- Archivo/funcion: `core/ciclo.js`, `modules/cliente360.js`, `modules/portal.js`, `modules/siniestros.js`.
- Fix o mejora aplicada: Hallazgo documentado. No se cierra P0/P1 de fechas vivas hasta reemplazo y validacion visual.
- Impacto en prototipo comercializable: Alto; afecta demo viva, reportes de gestion y percepcion de plataforma actualizada.
- Estado: ABIERTO.

---

## 3. P0 - Riesgo de perder hook LAB si se copia index completo

- Fecha: 2026-07-02
- Modulo: Backend LAB / `index.html`
- Sintoma/necesidad: El ZIP nuevo trae `index.html` sin `data/store-firestore-lab.local.js`.
- Esperado: En backend LAB, el orden debe ser `data/store.js -> data/store-firestore-lab.local.js -> data/seed.js`.
- Causa raiz si aplica: Claude entrega prototipo demo visual, no rama backend LAB.
- Archivo/funcion: `index.html`, bloque de scripts DATA LAYER.
- Fix o mejora aplicada: El plan de empalme exige reinsertar el hook LAB automaticamente si se copia `index.html`.
- Impacto en prototipo comercializable: Critico para no romper Fase 8 Firestore LAB validada.
- Estado: ABIERTO hasta empalme y Fase 7D.

---

## 4. P0 - No cerrar Portal -> Siniestros sin validacion visual

- Fecha: 2026-07-02
- Modulo: Portal / Siniestros / Cliente 360 / Historial / Ops
- Sintoma/necesidad: El codigo del ZIP mejora el flujo transversal, pero aun no se ejecuto la prueba visual completa en Chrome sobre el repo local con backend preservado.
- Esperado: Validar clic por clic: Portal reporta siniestro, aparece en Ops, Historial, Siniestros, Cliente 360; cambio de estado refleja en Ops/Historial; cerrar gestion no borra reclamo.
- Causa raiz si aplica: Auditoria de codigo no reemplaza verificacion visual real.
- Archivo/funcion: `modules/portal.js`, `modules/siniestros.js`, `modules/cliente360.js`, `core/ciclo.js`.
- Fix o mejora aplicada: Caso de prueba queda documentado en `AUDITORIA-ZIP-CLAUDE-20260702-142044.md` y `EMPALME-ZIP-CLAUDE-20260702-142044.md`.
- Impacto en prototipo comercializable: Critico para calidad del flujo cliente/operacion.
- Estado: EN PROGRESO.

---

## 5. P1 - Notificaciones cliente aun son prototipo, no backend real

- Fecha: 2026-07-02
- Modulo: `core/notify.js`, Cotizador, Comparativo, Cobros, Cliente 360, Ops
- Sintoma/necesidad: El ZIP agrega una capa transversal de notificacion, pero la entrega usa `wa.me`, compositor Orbit o `mailto`.
- Esperado: En backend real, la entrega debe pasar por Make/webhook/correo real/WhatsApp Cloud API y registrar estado de entrega por tenant.
- Causa raiz si aplica: Mini-release de prototipo visual/UX, no fase backend.
- Archivo/funcion: `core/notify.js` / `_deliver`.
- Fix o mejora aplicada: Aceptar como avance de prototipo; mantener como pendiente backend para fase de integraciones.
- Impacto en prototipo comercializable: Alto pero no bloqueante para empalme visual; aplicar a prototipo base como contrato swappable.
- Estado: ABIERTO para backend futuro.
