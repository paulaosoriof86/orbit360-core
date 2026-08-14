# FUENTES RECTORAS VIGENTES — ORBIT 360 / A&S

Corte original: 2026-07-30  
Actualización de continuidad: 2026-08-14

## Precedencia vigente

Para cualquier nueva conversación, auditoría, implementación o decisión se debe leer y resolver conflictos en este orden:

1. Documento Maestro Consolidado 20260704.
2. Addendum Academia Profunda 20260704.
3. Addendum Patrones Reutilizables Claude/Backend 20260707.
4. Addendum Continuidad Clientes/Multirol/Importadores 20260709.
5. Plan Maestro de Ejecución Productiva 20260716.
6. Addendum Control de Causa Raíz, Validadores y Gates 20260717.
7. **Addendum Maestro Aceleración Productiva, Reuso Transversal y Control de Autorizaciones 20260730.**
8. **Nota Rectora Rebranding GRAVICENTRA No Bloqueante 20260730.**
9. **Addendum Maestro Continuidad, Sincronización, Antibucle, Go-Live y Postproducción 20260814.**
10. **`orbit360-platform/docs/orbit360-live-state-v1.json` como estado operativo único.**
11. Estado vivo de PR #5 + HEAD de `ays/backend-tenant-lab-v99-20260703`.
12. Evidencia reciente nombrada por `lastEvidence` en el live-state.
13. Plan Único, README, CHANGELOG, PENDIENTES y cierres históricos únicamente en lo no contradicho por 9–12.

Cuando exista conflicto entre un procedimiento operativo antiguo y una regla posterior de aceleración/no repetición/continuidad, prevalece la regla posterior siempre que no reduzca seguridad, integridad, trazabilidad o rollback.

## Fuentes incorporadas 20260814

- `orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`
- `orbit360-platform/docs/orbit360-live-state-v1.json`
- `orbit360-platform/docs/CORTE-FORENSE-ANTIBUCLE-GO-LIVE-20260814.md`

## Nuevas fuentes 20260730

- `orbit360-platform/docs/ADDENDUM-MAESTRO-ACELERACION-PRODUCTIVA-REUSO-TRANSVERSAL-Y-CONTROL-AUTORIZACIONES-20260730.md`
- `orbit360-platform/docs/NOTA-RECTORA-REBRANDING-GRAVICENTRA-NO-BLOQUEANTE-20260730.md`
- `orbit360-platform/docs/ARQUITECTURA-REUTILIZABLE-INGESTA-MODULOS-POST-M6-20260730.md`
- `orbit360-platform/docs/CIERRE-M6-FINAL-630-PASS-20260730.md`
- `orbit360-platform/docs/REGLA-FUENTES-OPERATIVAS-VIGENTES-BAJO-DEMANDA-20260730.md`
- `orbit360-platform/docs/DRYRUN-POLIZAS-FUENTES-COMPLEMENTARIAS-AYS-20260730.md`

## Reglas que deben sobrevivir a cualquier cambio de conversación

- prioridad inmediata: salida a producción controlada de la Fase A;
- cero manual salvo imposibilidad técnica real;
- autorización por bloque macro de riesgo, no por micro-pasos;
- `STOP_RETRY` ante repetición de la misma etapa/familia de fallo;
- producción no se usa para desarrollar validators;
- antes de reabrir riesgo: causa raíz + fix reusable + prueba estática/sintética;
- infraestructura transversal se reutiliza en todos los módulos siguientes;
- cada módulo añade solo dominio/fuente/reglas propias;
- ningún rebranding debe contaminar la ruta crítica funcional;
- GRAVICENTRA se ejecuta como bloque aislado en el último punto seguro antes del lanzamiento público definitivo;
- PR #5 permanece draft/open; no main/merge/Functions salvo autorización expresa;
- para toda fuente posterior se usa delta desde el último corte/watermark documentado;
- una sola frontera larga de runtime/browser/deploy por iteración;
- checkpoint durable antes de una frontera larga;
- al terminar una frontera se detiene, lee, clasifica y sincroniza antes de continuar;
- `live-state` + PR #5 + README + checkpoint deben avanzar juntos;
- artefacto efímero de runner no equivale a paquete durable de producción;
- HostDime no es diagnóstico ni blocker antes de materializar el paquete durable;
- una conversación nueva debe reanudar desde live-state/HEAD/última evidencia, no desde memoria.

## Estado operativo actual — remitirse al live-state

El detalle vigente ya no se duplica en este documento para evitar staleness. La fuente única es:

`orbit360-platform/docs/orbit360-live-state-v1.json`

Al corte de esta actualización:

```text
stateVersion: 20260814.forensic-continuity.1
phase: PRE_GOLIVE_RECOVERY
last run: 31773511066
classification: PIPELINE_MECHANISM_FAILURE / OBSERVABILITY_GAP
HostDime blocker: no
durable production ZIP: pending after synthetic PASS
next action: instrumentar únicamente el synthetic harness y ejecutarlo una vez
```

## Ruta crítica integrada vigente

```text
R1 observabilidad + synthetic único
→ R2 rootfix único solo si se demuestra causa
→ R3 paquete durable + manifest + hashes
→ R4 HostDime/app.aysseguros.com + E2E productivo
→ R5 habilitación operativa + delta controlado
→ R6 módulos postproducción incrementales
→ R7 gate de reutilización para siguiente tenant
```

Cada etapa reutiliza Auth/membership/scopes, Orbit.store/write guard, manifiesto/aliases, readiness, smoke multivista, integridad, rollback, STOP_RETRY y gate único. Solo se añade el contrato/reglas propias del dominio.
