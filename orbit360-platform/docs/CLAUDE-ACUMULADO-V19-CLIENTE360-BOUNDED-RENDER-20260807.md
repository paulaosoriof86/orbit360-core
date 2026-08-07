# Acumulado Claude — v19 Cliente 360 — 2026-08-07

## REPLICABLE_CLAUDE_ACUMULADO
- Patrón de lista grande con primera ventana paginada/acotada.
- Preservar filtros, total, KPIs y deep-links mientras solo se renderiza la página visible.
- Instrumentación de rendimiento por fases: cache/resumen, construcción de filas, `innerHTML`, bindings, post-render y total.
- Separación conceptual `required data ready` → navegación → `render ready`.
- Clasificador reusable para probe bloqueado por render cuando el estado posterior demuestra target listo.

## ACADEMIA_ACTUALIZAR
Actualizar formación de rendimiento, gates y diferencia entre defecto funcional, DATA_CONTRACT_FAILURE y VALIDATOR_STALE.

## BACKEND_PROTEGIDO_NO_CLAUDE
No enviar a Claude:
- lógica exacta del relay registrado;
- lifecycle/overlay/request consumer;
- sealer y paths operativos del gate;
- secretos, Firebase LAB, snapshots reales o procedimientos de restore/deploy.

## TENANT_AYS_ONLY / SECRETO_DATO_REAL
No hay reglas A&S hardcodeadas en el patrón reusable. Los conteos de fixture son sintéticos para reproducir volumen; no transportar datos de clientes ni credenciales.

## Estado
Patrón reusable acumulado. No sustituye autorización de runtime ni habilita producción.
