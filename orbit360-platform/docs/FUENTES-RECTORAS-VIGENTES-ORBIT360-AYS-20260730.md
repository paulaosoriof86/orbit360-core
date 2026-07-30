# FUENTES RECTORAS VIGENTES — ORBIT 360 / A&S

Corte: 2026-07-30

## Precedencia

Para cualquier nueva conversación, auditoría, implementación o decisión se debe leer y resolver conflictos en este orden:

1. Documento Maestro Consolidado 20260704.
2. Addendum Academia Profunda 20260704.
3. Addendum Patrones Reutilizables Claude/Backend 20260707.
4. Addendum Continuidad Clientes/Multirol/Importadores 20260709.
5. Plan Maestro de Ejecución Productiva 20260716.
6. Addendum Control de Causa Raíz, Validadores y Gates 20260717.
7. **Addendum Maestro Aceleración Productiva, Reuso Transversal y Control de Autorizaciones 20260730.**
8. **Nota Rectora Rebranding GRAVICENTRA No Bloqueante 20260730.**
9. Estado vivo de PR #5 + HEAD de `ays/backend-tenant-lab-v99-20260703`.
10. Evidencia reciente del módulo/gate en curso.

Cuando exista conflicto entre un procedimiento operativo antiguo y una regla posterior de aceleración/no repetición, prevalece la regla posterior siempre que no reduzca seguridad, integridad, trazabilidad o rollback.

## Nuevas fuentes 20260730

- `orbit360-platform/docs/ADDENDUM-MAESTRO-ACELERACION-PRODUCTIVA-REUSO-TRANSVERSAL-Y-CONTROL-AUTORIZACIONES-20260730.md`
- `orbit360-platform/docs/NOTA-RECTORA-REBRANDING-GRAVICENTRA-NO-BLOQUEANTE-20260730.md`
- `orbit360-platform/docs/ARQUITECTURA-REUTILIZABLE-INGESTA-MODULOS-POST-M6-20260730.md`

## Reglas que deben sobrevivir a cualquier cambio de conversación

- prioridad: salida a producción / cierre Fase A;
- cero manual salvo imposibilidad técnica real;
- autorización por bloque macro de riesgo, no por micro-pasos;
- `STOP_RETRY` ante repetición de la misma etapa/familia de fallo;
- producción no se usa para desarrollar validators;
- antes de reabrir riesgo: causa raíz + fix reusable + prueba estática/sintética;
- infraestructura transversal M6 se reutiliza en todos los módulos siguientes;
- cada módulo añade solo dominio/fuente/reglas propias;
- ningún rebranding debe contaminar la ruta crítica funcional;
- GRAVICENTRA se ejecuta como bloque aislado en el último punto seguro antes del lanzamiento público definitivo;
- PR #5 permanece draft/open; no main/merge/Functions salvo autorización expresa.

## Estado actual resumido

- M1–M5 cerrados.
- M6 sigue abierto.
- 6.1.14: rollback seguro por `VALIDATOR_STALE / LEGAL_GATE_DEFERRED_RENDER_RACE`.
- 6.1.15: PASS estático de blocking-gate readiness reusable.
- `STOP_RETRY`: activo.
- no existe request 6.1.16.
- producción funcional: no live; fail-closed.
- datos: intactos.
- Pólizas: todavía no iniciadas.
