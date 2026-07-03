# Suplemento puente Claude · Validador y Make seguro post v1.97

**Fecha:** 2026-07-03  
**Base:** Claude v1.97  
**Rama backend:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** complemento del documento `MEJORAS-CHATGPT-PARA-CLAUDE-POST-V197-20260703.md`.

---

## 1. Motivo

Este suplemento registra avances posteriores al documento puente principal para que Claude no los pierda en la próxima versión del prototipo.

---

## 2. Validador Marketing + Integraciones

Archivo nuevo:

- `tools/orbit360-validate-marketing-integraciones.mjs`

Documento:

- `docs/AVANCE-VALIDADOR-MARKETING-INTEGRACIONES-20260703.md`

Commit:

- `36c871186d058146383a48c6e6350a8a7dd110e1` · `tools: agregar validador marketing integraciones`

Qué valida:

- existencia de `core/integraciones.js`,
- existencia de `core/integraciones-panel.js`,
- carga de `core/integraciones.js` desde `index.html`,
- presencia de eventos de Marketing,
- contrato base de `Orbit.integraciones`.

Claude no debe borrar este archivo ni reemplazarlo por instrucciones manuales. Es parte de la metodología incremental.

---

## 3. Especificación Make seguro

Documento nuevo:

- `docs/ESPEC-ADAPTADOR-MAKE-SEGURO-20260703.md`

Commit:

- `bdef9ff5832ce84f5174b1265fd4fa21a94be85e` · `docs(make): especificar adaptador seguro`

Reglas que Claude debe respetar:

- los módulos no llaman Make directamente;
- Marketing usa `Orbit.integraciones.emit(...)`;
- los eventos se trazan en `eventosIntegracion`;
- la activación real depende de backend seguro por tenant;
- no se deben mostrar ni guardar credenciales reales en frontend;
- demo/LAB debe operar con estado `pendiente_configuracion` cuando falte conexión real.

---

## 4. Impacto en UI Claude

Claude debe reflejar:

1. Botón o acceso a panel de eventos de integración.
2. Estados claros: pendiente configuración, pendiente, enviado, confirmado, error.
3. Mensajes de configuración pendiente sin notas técnicas visibles.
4. Historial de eventos por contenido en Marketing.
5. Configuración por tenant, no hardcodeada.

---

## 5. Estado

**ACTIVO COMO SUPLEMENTO PUENTE.**

Cuando Paula pida paquete para Claude, incluir este suplemento junto con:

- `docs/MEJORAS-CHATGPT-PARA-CLAUDE-POST-V197-20260703.md`
- `docs/RESUMEN-AVANCE-INTERNO-POST-V197-20260703.md`
