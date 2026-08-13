# Claude acumulado — capture watchdog v11 — 2026-08-06

## Clasificación

```text
REPLICABLE_CLAUDE_ACUMULADO
```

## Patrón reusable permitido

- Preservar el ejecutor funcional auditado sin reemplazo total.
- Interponer una envoltura mínima para operaciones visuales auxiliares.
- Capturar viewport mediante CDP con deadline local.
- Emitir checkpoints START, HEARTBEAT_n, PASS, WARN o TIMEOUT.
- En timeout, desacoplar únicamente la sesión de captura.
- Mantener página, contexto y navegador funcionales.
- Tratar screenshots como best-effort cuando el contrato los define no bloqueantes.
- Mantener STOP_RETRY y exigir autorización fresca para cualquier runtime posterior.

## No enviar a Claude

- credenciales o secretos;
- datos A&S o identificadores personales;
- configuración Firebase LAB/productiva;
- colecciones, digests o capturas reales;
- reglas, Auth o backend protegido.

## Evidencia reusable

```text
PASS_CAPTURE_WATCHDOG_SOURCE_ONLY: 17/17
Playwright 1.55 patchability: PASS
signal-safe: 48/48
cross-runner: 24/24
Windows: 7/7
context/browser close calls: 0/0
page usable after timeout: true
```

## Estado

Patrón source-only validado. No equivale a `PASS_VISUAL_POST_AUTH` y no autoriza nueva ejecución.
