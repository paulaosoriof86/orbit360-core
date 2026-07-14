# ORBIT 360 · Paquete Claude post v1.97

Este paquete contiene solo lo indispensable para que Claude continúe el prototipo sin perder avances de backend/contratos hechos por ChatGPT/Codex.

## Objetivo

Continuar Orbit 360 sobre la base v1.97, mejorar con profundidad los pendientes abiertos y entregar un ZIP completo de `orbit360-platform/` sin romper la arquitectura SaaS/white-label/multi-tenant.

## Reglas esenciales

- No reiniciar el prototipo.
- No eliminar módulos existentes.
- No hardcodear A&S ni ningún cliente.
- Usar datos ficticios en demo.
- No mostrar notas técnicas en UI final.
- No tocar ni romper la API `Orbit.store`.
- Los módulos no deben tocar `localStorage` directamente.
- Los módulos no deben llamar proveedores externos directamente.
- Mantener `Orbit.tenant` como fuente de configuración por cliente.
- Mantener separación demo / LAB / producción.
- Documentar todo cambio, bug, mejora y pendiente en bitácora/changelog.
- Backend real NO se activa en esta entrega visual; se hará después del empalme por ChatGPT/Codex.
