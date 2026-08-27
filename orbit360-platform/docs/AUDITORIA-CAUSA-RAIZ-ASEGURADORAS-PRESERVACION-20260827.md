# Auditoría de causa raíz — Preservación Aseguradoras post-go-live

Fecha: 2026-08-27  
Módulo: Aseguradoras  
Tipo de cambio: mecanismo de preservación source-only; producto/datos sin cambios.

## Necesidad

Evitar que Aseguradoras sea investigado o reprocesado como módulo pendiente cuando su solución final ya fue incorporada a la candidata canónica, y evitar que una futura candidata pierda silenciosamente esa solución mientras un validador superficial sigue dando PASS.

## Esperado

La candidata solo puede continuar si conserva el owner operativo final y las reglas de negocio vigentes:

- owner `clientInsurerOperationalDirectoryOwner` versión `20260723.2`;
- usuario de portal visible como dato operativo según permisos;
- contraseña protegida y revelada temporalmente;
- número de cuenta bancaria visible como dato operativo;
- copia bancaria directa sin dependencia de reveal;
- owner sin writes/reimportación;
- Router bootstrap cargando esa versión final;
- bridge legacy permitido como consumidor, nunca como autoridad final.

## Evidencia histórica

Aseguradoras fue trabajado profundamente. Existieron defectos reales y posteriormente se cerraron mediante correcciones selectivas de datos/semántica/ownership, sin reimportación total.

La historia de causa raíz incluye:

- `DATA_CONTRACT_FAILURE`: usuario/cuenta bancaria llegaron a ser tratados con semántica de secreto que no correspondía;
- `FUNCTIONAL_DEFECT`: ownership/wiring y representación operativa no eran correctos;
- `VALIDATOR_STALE`: validadores posteriores podían aceptar una semántica anterior o comprobar solo presencia superficial.

El cierre final M1 y el commit `6145e3b0a4173c582617bfc26dbfdc0c55b88b86` consolidaron el owner dinámico/persistencia. La candidata certificada/desplegada `8c9668d6d423e82826b0295431ec699390d79b4b` contiene esa solución.

## Hallazgo actual

El archivo histórico `orbit360-platform/tools/orbit360-aseguradoras-owner-contract-v20260717.js` no protege el owner final del 23 de julio: no comprueba la versión `20260723.2`, `bankCopyDirect` ni el bootstrap final.

La matriz nativa posterior verificaba directorio/ficha/conocimiento/responsive, pero no todas las invariantes de usuario/contraseña/banco/owner final.

### Clasificación

**`VALIDATOR_STALE` — RESUELTO.**

No se clasifica como regresión de producto porque el source canónico conserva el owner final y el bootstrap correcto.

## Causa raíz definitiva

La solución funcional evolucionó después del contrato de validación original. El owner final fue incorporado y pasó a superseder una UI legacy que permaneció físicamente en el repositorio por compatibilidad, pero el mecanismo de preservación no evolucionó con el mismo nivel de precisión.

Esto permitía dos riesgos:

1. diagnosticar erróneamente el bridge legacy como owner actual;
2. certificar en el futuro una candidata que conserve 26 aseguradoras/ficha/conocimiento pero pierda el owner final o su semántica.

## Fix aplicado

### 1. Guard source-only nuevo

`tools/orbit360-aseguradoras-operational-owner-preservation-v20260827.mjs`

Comprueba 16 invariantes de owner, semántica, bootstrap y rol explícito del consumidor legacy.

### 2. Registry específico

`orbit360-platform/docs/orbit360-aseguradoras-preservation-registry-v20260827.json`

Declara la autoridad final, marca el validador histórico como stale para esta versión y congela la regla de no reimportación.

### 3. Registry principal

`orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json`

Registra el guard como `ACTIVE_SOURCE_ONLY_FAIL_CLOSED`, exige ejecución antes de inspeccionar intents y prohíbe mutar producto/datos cuando falle.

### 4. Workflow canónico único

`.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml`

Ejecuta el guard antes de inspeccionar/aceptar cualquier intent y también dentro del selftest source-only.

### 5. Invariant del control plane

`tools/orbit360-single-state-invariant-v20260827.mjs`

Exige coherencia entre registry, guard, workflow, versión final y registry específico. Si alguien elimina o desincroniza el guard, falla cerrado.

### 6. Matriz canónica post-go-live

`orbit360-platform/docs/MATRIZ-CANONICA-REGRESION-POSTGO-LIVE-CONTRA-ULTIMO-PASS-20260826.md`

Aseguradoras queda protegido como `PASS_PRESERVED_SOURCE`; no se reconstruye ni reimporta sin regresión reproducible.

### 7. Academia

`orbit360-platform/docs/ACADEMIA-PRESERVACION-ASEGURADORAS-POSTGO-LIVE-20260827.md`

Enseña owner vs consumidor, dato operativo vs secreto y `VALIDATOR_STALE` vs defecto funcional.

## Primer selftest causal — hallazgo del propio validador

Run `33040721176` falló antes de cualquier claim/runtime. El invariant general dio PASS y 15/16 checks del guard de Aseguradoras dieron PASS. El único fallo fue `legacy-bridge-not-authority`.

Causa: el check intentaba inferir ausencia de ownership mediante una condición textual indirecta. Se clasificó como `VALIDATOR_STALE` del guard nuevo y se aplicó `STOP_RETRY`; el run no se reejecutó.

El bridge legacy ya declara explícitamente:

`phase: 'post-router-render', autoloadsBeforeRouter: false`

Por tanto, el rootfix reemplazó la inferencia frágil por una validación del metadata real de ownership. Commit del rootfix: `33709b658635bd5bc40234c6b281d7bf562be4c4`.

## Selftest causal fresco — PASS

Rama efímera: `ays/orbit360-exec-aseguradoras-preservation-selftest-v2-20260827`  
Intent commit: `22bd246cfff018b7d49e4c9042b77ab69a0517f1`  
Run: `33040847676`  
Job: `98413866140`  
Conclusión: **SUCCESS**  
Artifact: `9633785865`  
Artifact SHA256: `73dd6df8b2473595e7ed4fb412d2ef8a6381f4694b98c5dfeb91f1038b91d68b`

### Evidencia del guard final

`ASEGURADORAS_FINAL_OWNER_PRESERVATION_PASS`

16/16 checks PASS:

1. owner final `20260723.2`;
2. ownerId canónico;
3. supersesión explícita de secciones legacy;
4. usuario operativo visible;
5. contraseña protegida/reveal temporal;
6. cuenta bancaria visible;
7. banco sin dependencia de reveal;
8. copia bancaria directa;
9. campos exactos de copia;
10. owner sin writes de store;
11. owner sin reimportación;
12. bootstrap solicita owner final;
13. bootstrap carga source final;
14. readiness exige versión final;
15. owner se solicita antes de Router;
16. bridge legacy explícitamente `post-router-render` y sin autoload pre-Router.

`failedCheckIds = []`.

### Evidencia transversal del control plane

También PASS:

- `SINGLE_STATE_CONTROL_PLANE_STATIC_INVARIANT_PASS`;
- `SINGLE_STATE_CONTROL_PLANE_SELFTEST_PASS`;
- `wrongTargetBlocked = true`;
- `oldAuthorizationBlocked = true`;
- `secondClaimBlocked = true`;
- `staleRevisionBlocked = true`;
- `goLivePreserved = true`;
- `GO_LIVE_RELEASE_HANDLER_SOURCE_ONLY_PASS`;
- `POST_GO_LIVE_ACCESS_RECOVERY_SOURCE_ONLY_PASS`;
- `F2_BROWSER_BINDER_CURRENT_RUN_CAUSAL_SELFTEST_PASS`.

No hubo claim ni capacidad privilegiada en este selftest:

- runtime ejecutado: no;
- browser ejecutado: no;
- secretos: no;
- Firestore read: no;
- Firestore writes: 0;
- Auth writes: 0;
- operational writes: 0;
- deploy: no;
- producción: no.

## Impacto

- Se conserva toda la solución histórica de Aseguradoras.
- Se elimina el incentivo a reimportar/reconstruir por anomalías de UI/wiring.
- El control plane tiene ahora protección fail-closed específica sobre la semántica final.
- Una futura regresión del owner ya no debe pasar silenciosamente por un check superficial.
- El bridge legacy puede permanecer por compatibilidad sin confundirse con la autoridad final.

## Clasificación para Claude

- arquitectura reusable del patrón owner/consumer + preservation guard: `REPLICABLE_CLAUDE_ACUMULADO`;
- Academia: `ACADEMIA_ACTUALIZAR` — actualizado;
- mecanismo control plane y validadores: `BACKEND_PROTEGIDO_NO_CLAUDE`;
- datos reales/credenciales: no enviados.

## Estado

**CLOSED/PASS — `VALIDATOR_STALE` RESUELTO. PRODUCTO Y DATOS DE ASEGURADORAS NO FUERON REPROCESADOS NI MODIFICADOS.**

## Siguiente acción exacta

1. mantener `HUMAN-LOGIN-VERIFICATION` como primera frontera funcional productiva pendiente;
2. tras login humano estable, ejecutar smoke diferencial de Aseguradoras contra el owner `20260723.2`;
3. si el comportamiento productivo coincide con el contrato preservado, declarar `PASS_PRESERVED` post-go-live;
4. continuar Cliente 360 → Pólizas → Vehículos → Recibos/cartera → Cobros → Ops → Leads → roles/scopes → sincronizaciones, sin reprocesar dominios cerrados.