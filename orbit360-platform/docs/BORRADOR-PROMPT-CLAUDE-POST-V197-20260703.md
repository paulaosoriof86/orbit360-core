# Borrador prompt Claude · Orbit 360 post v1.97

**Fecha:** 2026-07-03  
**Estado:** borrador para paquete Claude. Paula pedirá el paquete final cuando corresponda.

---

## Prompt base

Continúa Orbit 360 sobre la base v1.97. No reinicies el prototipo ni elimines módulos existentes. Debes corregir e incorporar los pendientes documentados sin romper la arquitectura comercializable, white-label y multi-tenant.

---

## Reglas obligatorias

- No hardcodear A&S ni ningún cliente.
- No usar datos reales en demo.
- No mostrar notas técnicas en UI final.
- No tocar `Orbit.store` API.
- Los módulos no deben tocar `localStorage` ni llamar proveedores externos directamente.
- Mantener `Orbit.tenant` como fuente de configuración por cliente.
- Mantener separación demo/LAB/producción.
- Mantener marca Orbit 360 en chrome y logo cliente solo en slot white-label.

---

## Avances ChatGPT/Codex que debes conservar

Conserva o migra sin romper:

- `core/integraciones.js`
- `core/integraciones-panel.js`
- `core/integraciones-lab-mock.js`
- `modules/marketing.js`
- `tools/orbit360-validate-marketing-integraciones.mjs`

Contratos obligatorios:

- `Orbit.integraciones.emit(...)`
- `Orbit.integraciones.configurar(...)`
- `Orbit.integraciones.openPanel(...)`
- `Orbit.integraciones.labMock(...)`
- `Orbit.integraciones.mark(...)`

---

## Pendientes a resolver

1. Mejorar UI de Configuración de Integraciones para que no sea local por navegador, sino tenant-wide.
2. Integrar panel de eventos dentro de Automatizaciones/Integraciones.
3. Mostrar historial por contenido en Marketing.
4. Mantener estados claros de integración.
5. Corregir mojibake/textos dañados en Automatizaciones si aparecen.
6. Mejorar Marketing hacia ficha operativa diaria completa.
7. Mantener Academia, Finanzas, Renovaciones, Reportes y Orbit IA sin regresiones.
8. Actualizar `CHANGELOG.md` y bitácoras.

---

## Backend real

No actives backend real en esta entrega visual. Solo conserva contratos y deja UI lista.

El backend real se conectará después del empalme, cuando ChatGPT/Codex valide el nuevo prototipo.

---

## Documentos de referencia

Lee e incorpora:

- `docs/MANIFIESTO-PAQUETE-CLAUDE-POST-V197-20260703.md`
- `docs/PUENTE-CLAUDE-VALIDADOR-MAKE-POST-V197-20260703.md`
- `docs/PENDIENTE-CLAUDE-CONFIG-INTEGRACIONES-UI-20260703.md`
- `docs/CHECKLIST-EMPALME-POST-CLAUDE-BACKEND-20260703.md`
- `docs/INVENTARIO-INTEGRACIONES-MARKETING-POST-V197-20260703.md`

---

## Entrega esperada

Entrega ZIP completo de `orbit360-platform/`, con changelog y bitácora actualizados.

Incluye resumen final indicando:

- qué pendientes cerraste;
- qué quedó parcial;
- qué no tocaste;
- archivos modificados;
- riesgos o validaciones pendientes.

---

## Estado

**BORRADOR / NO ENVIAR HASTA QUE PAULA PIDA EL PAQUETE.**
