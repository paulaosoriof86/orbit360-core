# Claude acumulado — cross-runner portable y verificación de proveedor — 2026-08-06

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Patrón reusable:

- reemplazar dependencias GNU de timeout por supervisor Node portable;
- separar instalación Playwright por sistema operativo;
- mantener runner bloqueado por defecto sin autorización;
- conservar traps de señales, rollback y persistencia exactamente una vez;
- probar primero source-only en al menos dos familias de runner;
- verificar configuración real del repositorio antes de inferir restricciones;
- verificar estado oficial del proveedor antes de atribuir ausencia de runs a configuración local;
- distinguir `RUNNER_QUEUE_UNAVAILABLE` de `GITHUB_ACTIONS_MAJOR_OUTAGE_ACTIVE`;
- no interpretar ausencia de run como fallo funcional del producto;
- retirar explícitamente una hipótesis cuando evidencia nueva la contradiga.

No enviar a Claude secretos, datos reales, credenciales, rutas protegidas de backend ni contratos operativos A&S.
