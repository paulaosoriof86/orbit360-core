# Actualización plan vivo — auditoría unificada v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S / base comercializable  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

Después de matriz roles/permisos/acciones sensibles, era necesario consolidar el shape común de bitácora/auditoría para no tener auditorías fragmentadas por módulo.

## Bloque cerrado

| Bloque | Estado | Resultado |
|---|---|---|
| Auditoría unificada acciones sensibles v1330 | Cerrado documental/tooling | Contrato, schema JSON, validador, tests, impacto Academia, addendum Claude y registro. |

## Intermedio agregado

### Intermedio 27 — Auditoría unificada de acciones sensibles

Motivo: Equipo/Config, M5, Documentos, Cobros, Cliente360, roles, integraciones y Academia ya tienen acciones sensibles; faltaba contrato común para auditarlas y reutilizarlas en futuros tenants.

Estado: agregado.

Archivos principales:

```txt
orbit360-platform/docs/CONTRATO-AUDITORIA-UNIFICADA-ACCIONES-SENSIBLES-V1330-20260708.md
orbit360-platform/docs/AUDITORIA-UNIFICADA-SCHEMA-V1330.json
tools/orbit360-validar-auditoria-unificada-v1330.mjs
tools/orbit360-test-auditoria-unificada-v1330.mjs
```

## Qué resuelve

- Define shape común auditLog/auditoria.
- Define categorías y severidades.
- Define acciones mínimas auditables.
- Prohíbe secretos, tokens, base64, bytes y payloads en bitácora.
- Exige confirmación para acciones críticas.
- Valida moneda por país.
- Requiere bloqueos[] cuando una acción queda bloqueada.
- Distingue historial interno vs historial visible para cliente.
- Agrega impacto Academia.

## Pendientes actualizados

| Prioridad | Pendiente | Estado esperado |
|---|---|---|
| P0 | Claude debe reflejar bitácora/historial por rol si no cerró candidata | Addendum creado. |
| P0 | Candidata Claude debe auditar historial/bitácora | Usar checklist y auditor. |
| P1 | Integrar validador auditoría al runner agrupado | Próximo bloque o cuando se requiera. |
| P1 | Implementar auditLog real en backend final | Futuro, requiere Auth/roles final aprobado. |

## Próximo bloque recomendado

```txt
Actualizar runner agrupado para incluir validadores de matriz roles/permisos y auditoría unificada, o esperar candidata Claude si ya está lista.
```

## Estado

Plan vivo actualizado. Sin merge, deploy, main ni producción.