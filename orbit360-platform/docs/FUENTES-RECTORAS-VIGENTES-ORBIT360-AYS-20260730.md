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
- `orbit360-platform/docs/CIERRE-M6-FINAL-630-PASS-20260730.md`
- `orbit360-platform/docs/REGLA-FUENTES-OPERATIVAS-VIGENTES-BAJO-DEMANDA-20260730.md`
- `orbit360-platform/docs/DRYRUN-POLIZAS-FUENTES-COMPLEMENTARIAS-AYS-20260730.md`

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
- PR #5 permanece draft/open; no main/merge/Functions salvo autorización expresa;
- para toda fuente posterior se debe pedir el periodo exacto; si ya hay histórico al corte, se pide solo delta.

## Estado actual resumido

- M1–M4 cerrados.
- M5 5.0.44 cerrado + revisión visual aprobada.
- M6 6.3.0 cerrado: `M6_FINAL_CLOSURE_PASS`.
- infraestructura transversal productiva read-only: LIVE; 0 escrituras del cierre M6.
- Pólizas: fuentes vigentes/complementarias recibidas el 30-07-2026.
- Pólizas dry-run: **1,377 términos canónicos**; **1,375 crear**; **2 requieren validación por vigencia invertida**.
- Clientes nuevos candidatos desde Pólizas: **2**, con calidad pendiente; pre-write idempotent match obligatorio.
- Recibos julio 2026: **101** en staging separado; no cobros aplicados ni conciliación.
- Vehículos 2017–2026: fuente recibida, reservada para el siguiente bloque; no crea pólizas.
- Escritura real de Pólizas: no autorizada todavía.
- producción/main/merge/Functions: no autorizados.
- GRAVICENTRA: registrado/diferido, no bloqueante.

## Ruta crítica

`Pólizas → Vehículos → Recibos/cartera → Cobros/conciliación → Comisiones/planillas → financiero histórico → Siniestros/Documentos`

Cada etapa reutiliza Auth/membership/scopes, Orbit.store/write guard, manifiesto/aliases, readiness, smoke multivista, integridad, rollback, STOP_RETRY y gate único. Solo se añade el contrato/reglas propias del dominio.
