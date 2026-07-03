# Manifiesto paquete Claude · post v1.97

**Fecha:** 2026-07-03  
**Base:** Claude v1.97  
**Estado:** preparado para cuando Paula solicite el paquete.

---

## Objetivo

Evitar que la siguiente versión del prototipo pierda avances hechos en backend/LAB, contratos y documentación.

---

## Archivos que deben incluirse como referencia para Claude

- `docs/MEJORAS-CHATGPT-PARA-CLAUDE-POST-V197-20260703.md`
- `docs/PUENTE-CLAUDE-VALIDADOR-MAKE-POST-V197-20260703.md`
- `docs/RESUMEN-AVANCE-INTERNO-POST-V197-20260703.md`
- `docs/RESUMEN-AVANCE-INTERNO-POST-V197-20260703-SUPLEMENTO-VALIDADOR-MAKE.md`
- `docs/CHECKLIST-VALIDACION-MARKETING-INTEGRACIONES-20260703.md`
- `docs/PENDIENTE-CLAUDE-CONFIG-INTEGRACIONES-UI-20260703.md`
- `docs/BITACORA-BACKEND-CHATGPT-20260703.md`
- `docs/CHECKLIST-EMPALME-POST-CLAUDE-BACKEND-20260703.md`
- `docs/CRITERIOS-BACKEND-REAL-POST-EMPALME-20260703.md`
- `docs/PLAN-BACKEND-REAL-INTEGRACIONES-POST-EMPALME-20260703.md`
- `docs/INVENTARIO-INTEGRACIONES-MARKETING-POST-V197-20260703.md`
- `docs/PROTOCOLO-AUDITORIA-NUEVO-ZIP-CLAUDE-20260703.md`
- `docs/BORRADOR-PROMPT-CLAUDE-POST-V197-20260703.md`
- `docs/MATRIZ-PENDIENTES-CLAUDE-BACKEND-POST-V197-20260703.md`

---

## Archivos de código que Claude debe conservar o migrar

- `core/integraciones.js`
- `core/integraciones-panel.js`
- `core/integraciones-lab-mock.js`
- `modules/marketing.js`
- `tools/orbit360-validate-marketing-integraciones.mjs`

---

## Contratos que no debe romper

- `Orbit.integraciones.emit(...)`
- `Orbit.integraciones.configurar(...)`
- `Orbit.integraciones.openPanel(...)`
- `Orbit.integraciones.labMock(...)`
- `Orbit.integraciones.mark(...)`

---

## Reglas que Claude debe respetar

- Los módulos no llaman servicios externos directamente.
- Marketing no debe volver a acciones solo tipo toast.
- Integraciones deben ser por tenant, no por navegador local.
- La simulación LAB no debe verse como conexión real.
- El backend real se conecta después del empalme, no en el prototipo visual.
- No reintroducir datos reales ni hardcodeo de A&S.
- No tocar `Orbit.store` API ni romper Auth LAB.

---

## Pendientes principales para Claude

1. Mejorar UI de Configuración de Integraciones.
2. Integrar panel de eventos dentro de Automatizaciones/Integraciones.
3. Mostrar historial por contenido en Marketing.
4. Mantener estados claros de integración.
5. Corregir textos dañados/mojibake si aparecen en Automatizaciones.
6. Mantener diseño Orbit 360 sin notas técnicas visibles.

---

## Estado

**LISTO COMO MANIFIESTO.**
