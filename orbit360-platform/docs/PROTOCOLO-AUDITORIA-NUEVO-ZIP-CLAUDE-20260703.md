# Protocolo auditoría nuevo ZIP Claude · Orbit 360

**Fecha:** 2026-07-03  
**Uso:** cuando Paula entregue la próxima versión del prototipo Claude.

---

## Objetivo

Auditar la nueva entrega antes de empalmarla, para identificar qué resolvió, qué rompió y qué sigue pendiente.

---

## Auditoría estructural

Confirmar:

- raíz única `orbit360-platform/`;
- sin ZIPs anidados;
- sin carpetas duplicadas;
- sin archivos temporales o copias;
- sin datos reales en seed o UI;
- sin notas técnicas visibles en UI;
- sin hardcodeo de cliente.

---

## Auditoría de contratos protegidos

Confirmar que no se rompa:

- `Orbit.store` y su API;
- `Orbit.tenant`;
- Auth LAB;
- `Orbit.ia.complete(...)`;
- `Orbit.integraciones.emit(...)`;
- `Orbit.integraciones.configurar(...)`;
- eventos de Marketing;
- panel diagnóstico;
- mock LAB solo demo/desarrollo.

---

## Auditoría funcional

Revisar especialmente:

- Marketing;
- Configuración;
- Automatizaciones;
- Integraciones;
- Finanzas;
- Academia;
- Renovaciones;
- Reportes;
- Orbit IA.

---

## Auditoría contra pendientes

Comparar contra:

- `docs/MANIFIESTO-PAQUETE-CLAUDE-POST-V197-20260703.md`;
- `docs/PUENTE-CLAUDE-VALIDADOR-MAKE-POST-V197-20260703.md`;
- `docs/PENDIENTE-CLAUDE-CONFIG-INTEGRACIONES-UI-20260703.md`;
- `docs/CHECKLIST-EMPALME-POST-CLAUDE-BACKEND-20260703.md`.

Clasificar cada punto como:

- resuelto;
- parcialmente resuelto;
- no resuelto;
- regresión;
- nuevo pendiente.

---

## Salida esperada

Generar un documento de auditoría post-ZIP con:

- versión recibida;
- archivos cambiados;
- pendientes cerrados;
- pendientes abiertos;
- regresiones;
- mejoras nuevas;
- recomendación de empalme;
- riesgos antes de backend real.

---

## Estado

**LISTO PARA PRÓXIMO ZIP CLAUDE.**
