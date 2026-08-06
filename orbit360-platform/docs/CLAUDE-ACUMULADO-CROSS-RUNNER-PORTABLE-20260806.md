# Claude acumulado — cross-runner portable — 2026-08-06

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Patrón reusable:

- reemplazar dependencias GNU de timeout por supervisor Node portable;
- separar instalación Playwright por sistema operativo;
- mantener runner bloqueado por defecto sin autorización;
- conservar traps de señales, rollback y persistencia exactamente una vez;
- probar primero source-only en al menos dos familias de runner;
- distinguir `RUNNER_QUEUE_UNAVAILABLE` de `EVENT_DISPATCH_UNAVAILABLE`;
- no interpretar ausencia de run como fallo funcional del producto.

No enviar a Claude secretos, datos reales, credenciales, rutas protegidas de backend ni contratos operativos A&S.
