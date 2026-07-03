# Checklist empalme post-Claude · proteger backend

**Fecha:** 2026-07-03  
**Aplicar cuando:** Paula entregue nuevo ZIP Claude posterior a v1.97.

---

## Objetivo

Empalmar la nueva versión del prototipo sin perder avances backend/LAB ni contratos de integración.

---

## Antes de empalmar

Confirmar:

- ZIP nuevo tiene raíz única `orbit360-platform/`.
- No trae ZIPs anidados.
- No trae archivos duplicados o temporales.
- No reintroduce datos reales en demo.
- No elimina documentación clave.

---

## Archivos backend protegidos

Revisar antes de reemplazar:

- `data/store.js`
- `data/store-firestore-lab.local.js`
- `core/auth.js`
- `core/backend-lab-loader.js`
- `core/backend-lab-init.js`
- `core/integraciones.js`
- `core/integraciones-panel.js`
- `core/integraciones-lab-mock.js`
- `tools/orbit360-validate-marketing-integraciones.mjs`

---

## Archivos visuales a auditar en el ZIP Claude

- `modules/marketing.js`
- `modules/configuracion.js`
- `modules/automatizaciones.js`
- `index.html`
- `data/seed.js`
- `CHANGELOG.md`
- `docs/BITACORA-CAMBIOS.md`

---

## Validaciones después del empalme

Confirmar:

- `Orbit.integraciones.emit(...)` existe.
- `Orbit.integraciones.configurar(...)` existe.
- Marketing sigue emitiendo eventos.
- Panel de integraciones sigue disponible.
- Mock LAB no aparece como producción.
- Auth LAB no fue reemplazado por demo-only.
- `Orbit.store` conserva API.
- No hay llamadas externas directas desde módulos.
- No hay storage directo desde módulos.
- No hay notas técnicas visibles.

---

## Orden recomendado

1. Auditar ZIP Claude.
2. Comparar contra rama backend actual.
3. Empalmar módulos visuales con protección de core/backend.
4. Ejecutar validadores técnicos.
5. Hacer smoke visual local.
6. Registrar cerrados, pendientes y regresiones.
7. Solo después continuar backend real.

---

## Estado

**CHECKLIST LISTA PARA PRÓXIMO ZIP CLAUDE.**
