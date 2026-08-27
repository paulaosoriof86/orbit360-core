# Auditoría de causa raíz — Preservación Aseguradoras post-go-live

Fecha: 2026-08-27  
Módulo: Aseguradoras  
Tipo de cambio: mecanismo de preservación source-only; producto/datos congelados.

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

### Clasificación actual

**`VALIDATOR_STALE`**

No se clasifica como regresión de producto porque el source canónico conserva el owner final y el bootstrap correcto.

## Causa raíz definitiva

La solución funcional evolucionó después del contrato de validación original. El owner final fue incorporado y pasó a superseder una UI legacy que permaneció físicamente en el repositorio por compatibilidad, pero el mecanismo de preservación no evolucionó con el mismo nivel de precisión.

Esto permitía dos riesgos:

1. diagnosticar erróneamente el bridge legacy como owner actual;
2. certificar en el futuro una candidata que conserve 26 aseguradoras/ficha/conocimiento pero pierda el owner final o su semántica.

## Fix aplicado

### 1. Guard source-only nuevo

`tools/orbit360-aseguradoras-operational-owner-preservation-v20260827.mjs`

Comprueba 16 invariantes de owner, semántica, bootstrap y ausencia de autoridad legacy.

### 2. Registry específico

`orbit360-platform/docs/orbit360-aseguradoras-preservation-registry-v20260827.json`

Declara la autoridad final, marca el validador histórico como stale para esta versión y congela la regla de no reimportación.

### 3. Registry principal

`orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json`

Ahora registra el guard como `ACTIVE_SOURCE_ONLY_FAIL_CLOSED`, exige ejecución antes de inspeccionar intents y prohíbe mutar producto/datos cuando falle.

### 4. Workflow canónico único

`.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml`

Ejecuta el guard antes de inspeccionar/aceptar cualquier intent y también dentro del selftest source-only.

### 5. Invariant del control plane

`tools/orbit360-single-state-invariant-v20260827.mjs`

Ahora exige coherencia entre registry, guard, workflow, versión final y registry específico. Si alguien elimina o desincroniza el guard, falla cerrado.

### 6. Matriz canónica post-go-live

`orbit360-platform/docs/MATRIZ-CANONICA-REGRESION-POSTGO-LIVE-CONTRA-ULTIMO-PASS-20260826.md`

Aseguradoras queda protegido como `PASS_PRESERVED_SOURCE`; no se reconstruye ni reimporta sin regresión reproducible.

### 7. Academia

`orbit360-platform/docs/ACADEMIA-PRESERVACION-ASEGURADORAS-POSTGO-LIVE-20260827.md`

Enseña owner vs consumidor, dato operativo vs secreto y `VALIDATOR_STALE` vs defecto funcional.

## Verificación source readback

El source vivo confirma:

- owner final `20260723.2`;
- `usernameOperationalVisible: true`;
- `passwordProtectedTemporaryReveal: true`;
- `bankNumberOperationalVisible: true`;
- `bankRevealDependency: false`;
- `bankCopyDirect: true`;
- campos de copia `banco,tipo,numero,moneda,titular`;
- `writesStore: false`;
- `reimportsData: false`;
- bootstrap solicitando/cargando `20260723.2`;
- bridge v1202 sin declararse owner final.

No se ejecutó browser/runtime/Firebase/deploy para este cierre porque la clasificación es `VALIDATOR_STALE` y el producto permanece congelado hasta completar la verificación source-only del mecanismo.

## Impacto

- Se conserva toda la solución histórica de Aseguradoras.
- Se elimina el incentivo a reimportar/reconstruir por anomalías de UI/wiring.
- El control plane gana una protección fail-closed específica sobre la semántica final.
- Una futura regresión del owner ya no debe pasar silenciosamente por un check superficial.

## Clasificación para Claude

- arquitectura reusable del patrón owner/consumer + preservation guard: `REPLICABLE_CLAUDE_ACUMULADO`;
- Academia: `ACADEMIA_ACTUALIZAR` — ya actualizado;
- mecanismo control plane y validadores: `BACKEND_PROTEGIDO_NO_CLAUDE`;
- datos reales/credenciales: no enviados.

## Estado

**FIX SOURCE-ONLY MATERIALIZADO / VALIDACIÓN EJECUTABLE INCORPORADA / PRODUCTO Y DATOS SIN CAMBIOS.**

## Siguiente acción exacta

1. comprobar source-only del control plane actualizado sin secretos/runtime;
2. mantener `HUMAN-LOGIN-VERIFICATION` como primera frontera funcional productiva pendiente;
3. tras login humano estable, ejecutar smoke diferencial de Aseguradoras contra el owner `20260723.2`;
4. si pasa, declarar `PASS_PRESERVED` y continuar con Cliente 360/Pólizas/Recibos/Cobros/Ops/Leads sin reprocesamiento.
