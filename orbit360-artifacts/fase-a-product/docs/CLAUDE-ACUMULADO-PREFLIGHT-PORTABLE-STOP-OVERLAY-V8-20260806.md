# Claude acumulado — Preflight portable y stop overlay v8

Fecha: 2026-08-06

## Clasificación

`REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

- El entrypoint canónico debe propagar explícitamente la ruta del request al motor.
- Antes de leer JSON debe validar existencia y tipo archivo; nunca intentar leer un directorio.
- El preflight no debe depender de herramientas externas no garantizadas como `jq`; la validación JSON se concentra en un helper Node portable.
- Un STOP previo se expresa mediante un overlay fail-closed separado del request histórico e inmutable.
- El router debe rechazar cualquier request cuya versión no coincida con la versión fresca registrada por el workflow.
- El workflow solo puede abrir runtime cuando el último commit modifica exclusivamente el request autorizado y el overlay de STOP ya fue cerrado por un cambio source-only previo.

## Fuera de alcance para Claude

- Secretos o credenciales.
- Firebase, Firestore, Auth, Rules, Hosting o producción.
- Datos reales A&S.
- Reutilización del request v8.

## Evidencia

`preflight-portable-source-test-sanitized-v20260806.json`: 17/17 PASS, cero accesos operativos.
