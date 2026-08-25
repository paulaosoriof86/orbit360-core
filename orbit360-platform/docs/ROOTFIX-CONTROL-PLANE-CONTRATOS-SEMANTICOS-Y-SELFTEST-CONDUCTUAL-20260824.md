# ROOTFIX CONTROL-PLANE — CONTRATOS SEMÁNTICOS, REGISTER READ-ONLY Y SELFTEST CONDUCTUAL — 2026-08-24

## Estado

`SOURCE_ONLY_ROOTFIX_IMPLEMENTED_AWAITING_CANONICAL_SELFTEST`

No constituye PASS de Iteración 1. El cierre solo puede ocurrir después de una ejecución real del workflow canónico que produzca un selftest PASS y un handshake durable del mismo run, seguida de una revalidación independiente del mismo contrato conductual por el owner antes de mutar el ledger.

## Clasificación

- Incidente estructural rector: `PIPELINE_MECHANISM_FAILURE`.
- Run canónico `32791496642`: `VALIDATOR_STALE / TEST_HARNESS_CONTRACT_MISMATCH` para los dos fallos inmediatos del arnés.
- Causa mecánica adicional descubierta antes de repetir el selftest: `RUNTIME_REGISTER_TRANSIENT_SOURCE_REWRITE`.
- Producto/candidata: congelados; no existe evidencia nueva que invalide artifact `9504702901` ni source `8c9668d6d423e82826b0295431ec699390d79b4b`.
- Carril A: producto sin cambios; Academia actualizada por este documento.
- Carril B: único carril intervenido.
- Carril C: congelado; cero reimportación.
- Progreso: 75%; F2 no autorizado.

## Evidencia del run 32791496642

El selftest más exigente falló cerrado antes de handshake, autorización real, runtime, provider, browser, secrets o Firestore.

Sí quedaron demostrados en PASS:

- candidata dinámica desde ledger;
- preflight semántico sin proof-by-source-text;
- exact F2 source path;
- lifecycle pre-auth por clase;
- lifecycle pre-terminal por clase;
- cleanup de filename futuro/desconocido;
- projection idempotente/no muta ledger;
- remote CAS readback;
- segundo attempt → `STOP_RETRY`;
- prueba negativa provider sin gate;
- prueba negativa candidata hardcodeada;
- prueba negativa revisión operacional hardcodeada.

Fallaron dos supuestos del arnés:

1. la superficie esperada después de `ATTEMPT_ACCEPT` omitía el ledger, aunque el registry lo declara `sourceOfTruth` y necesariamente cambia por el owner;
2. el run sintético creado por el selftest no se propagó como `GITHUB_RUN_ID`, mientras el register correctamente exige `request.runtimeRunId === GITHUB_RUN_ID`.

La reparación de esos dos puntos se hizo en el arnés; no se debilitó owner ni register para hacer pasar la prueba.

## Causa raíz ampliada

La auditoría posterior al fallo del selftest encontró una deuda real del mecanismo: `tools/orbit360-register-f2-productive-acceptance-runtime-v20260819.mjs` modificaba temporalmente archivos canónicos para adaptar F2 v3 y el workflow después los restauraba.

La secuencia histórica era conceptualmente:

`leer request → mutar runtime lifecycle → mutar gate authority → reescribir router → ejecutar gate → restaurar archivos antes de publicar`.

Aunque la restauración pudiera dejar el árbol limpio, esta arquitectura viola la regla R7 del Plan Maestro y mantiene una dependencia peligrosa de `mutate → restore`: cualquier excepción, filename nuevo, cambio de orden o fallo intermedio puede producir residuos y otro `publication surface failure`.

La corrección definitiva no consiste en ampliar la lista de archivos restaurados. Consiste en eliminar la necesidad de reescribirlos.

## Reparación transversal

### 1. Contrato semántico machine-readable

`orbit360-control-plane-semantic-contract-v20260824.json` es el contrato versionado para componentes activos, bindings, lifecycle, invariantes y propiedades obligatorias de selftest.

La candidata y las revisiones se derivan del ledger/intent. El contrato exige expresamente:

- register runtime read-only;
- router F2 v3 nativo;
- gate sin dependencia de source rewrite transitorio;
- source writes prohibidos en paths activos;
- superficie pre-provider inmutable;
- pruebas negativas y conductuales antes de cerrar.

### 2. Register F2 convertido en validador read-only

`tools/orbit360-register-f2-productive-acceptance-runtime-v20260819.mjs` ya no modifica router, gate authority ni lifecycle.

Ahora únicamente valida:

- request v3 aceptado;
- one-shot budget consumido antes de preflight;
- `request.runtimeRunId === GITHUB_RUN_ID`;
- identidad de autorización;
- candidata exacta;
- binding del request en ledger/authority/lifecycle;
- lifecycle sincronizado con el estado canónico;
- replay cerrado.

Su salida contractual es `F2_RUNTIME_REGISTER_READ_ONLY_VALIDATED_V4` y declara `registerMode: READ_ONLY_VALIDATOR`, `sourceMutationAllowed:false` y `persistentSourceChanged:false`.

### 3. Router F2 v3 nativo

`tools/orbit360-validar-gate-contracts-v20260717.mjs` resuelve F2 sin que otro script lo transforme.

- `NONE_PENDING_FRESH_AUTHORIZATION` → lifecycle source.
- `F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V3` → lifecycle runtime.
- cualquier modo no reconocido → fail closed.

El router valida directamente schema/status/one-shot/run binding del request F2 v3.

El archivo runtime lifecycle conserva dos conceptos separados:

- `currentPhase/status` = proyección del estado global del ledger;
- `executionProfile.phase` = contrato de la fase F2 que representa ese lifecycle.

Antes del gate, las capacidades efectivas del lifecycle permanecen todas cerradas. El permiso read-only proviene exclusivamente del authorization record/request aceptado y solo el gate semántico puede devolver `runtime/browser/secrets/firestoreRead=true`.

### 4. Gate semántico sin mutación transitoria

`tools/orbit360-f2-gate-semantic-v20260824.mjs` ya no requiere que el runtime lifecycle haya sido reescrito.

Valida simultáneamente:

- authority → runtime lifecycle;
- runtime lifecycle → mismo estado del ledger;
- capacidades pre-gate cerradas;
- request/authority/lifecycle/ledger con el mismo activeRequest;
- runtimeRunId end-to-end;
- autorización persistida exacta;
- read capabilities requeridas;
- writes/deploy/production/main/merge cerrados;
- `gate` antes de `provider`.

Un GO válido declara `nativeRouterRuntimeContract:true` y `registerMode:READ_ONLY_VALIDATOR`.

### 5. Guard de source rewrite por clase

`tools/orbit360-control-plane-no-source-rewrite-guard-v20260824.mjs` obtiene el universo activo desde el contrato semántico y ahora también rechaza patrones de escritura sobre código fuente, incluyendo reescritura de router y `writeFileSync` dirigido a `.js/.mjs/.cjs` activos.

No se limita al filename del incidente anterior.

### 6. Selftest conductual aislado

`tools/orbit360-control-plane-selftest-v20260824.mjs` ejecuta el camino real en un worktree temporal sin provider/secrets/browser.

Debe demostrar simultáneamente:

- `candidateBindingDynamic:true`;
- `semanticPreflightPass:true`;
- `sourceShapeValidationUsed:false`;
- `exactF2SourcePathExecuted:true`;
- `classWidePreAuthEvidenceLifecyclePass:true`;
- `classWidePreTerminalEvidenceLifecyclePass:true`;
- `arbitraryFutureFilenameCleanupPass:true`;
- `scratchBehavioralTransitionsPass:true`;
- `preProviderGatePathPass:true`;
- `projectionImmutabilityPass:true`;
- `remoteCASReadbackPass:true`;
- `secondAttemptStopRetryPass:true`;
- `workflowProviderUngatedNegativePass:true`;
- `workflowCandidateHardcodeNegativePass:true`;
- `workflowOperationalRevisionHardcodeNegativePass:true`;
- `sourceRewriteMutationNegativePass:true`;
- `authPublicationSurfacePass:true`;
- `runtimeRunIdBindingSimulationPass:true`;
- `runtimeRegisterReadOnlyPass:true`;
- `routerNativeRuntimeContractPass:true`;
- `negativeRegressionSuitePass:true`.

El `ok:true` del selftest se deriva de `selftestRequiredTrueFields` del contrato semántico. Agregar una nueva propiedad obligatoria al contrato sin implementarla hace que el test falle automáticamente.

### 7. Pruebas negativas adicionales

El selftest modifica únicamente su scratch para introducir deliberadamente:

- provider sin gate;
- candidata hardcodeada;
- revisión operacional hardcodeada;
- intento de escritura de source desde el register.

Cada una debe ser rechazada. Luego el scratch debe volver a cero cambios.

### 8. Superficie pre-provider inmutable

El contrato define `runtimePreProviderImmutablePaths` con register, router, gate semántico, engine, authority y lifecycles F2.

El selftest captura esos archivos antes del register, ejecuta register y gate nativo, y exige igualdad byte a byte después. El único output mutable permitido en esa fase es evidencia sanitizada, administrada por el lifecycle de evidencias.

### 9. Owner de cierre como segundo verificador

El handshake durable prueba identidad causal del run, pero no sustituye el comportamiento.

En un cierre canónico real, `tools/orbit360-continuity-transition-owner-v20260824.mjs` vuelve a ejecutar el selftest antes de permitir que el ledger salga de `CONTROL_PLANE_REGRESSION_OPEN_STOP_RETRY`.

La excepción sintética del scratch requiere simultáneamente `technicalPullRequest:0` y ruta `__selftest-handshake-*`; no es válida para un cierre real.

## Sobre el restore histórico del workflow

El workflow todavía contiene una restauración defensiva de tres archivos antes del terminal reconcile. Tras este rootfix esa restauración deja de ser una dependencia funcional porque register/router/gate ya no modifican esos archivos.

La garantía no se apoya en ese restore:

1. antes de materializar autorización F2, el mismo workflow ejecuta el selftest completo;
2. el selftest exige que register sea byte-for-byte read-only;
3. el guard rechaza source writes en paths activos;
4. el router soporta F2 v3 nativamente.

Por seguridad del cambio, el YAML no se reescribe dentro de este rootfix mientras Iteración 1 está en STOP_RETRY. La eliminación posterior de una restauración ya redundante no puede considerarse requisito para que el mecanismo sea correcto, y tampoco puede utilizarse para ocultar una mutación porque el selftest la detectaría antes de autorización.

## Gate de confiabilidad para cerrar Iteración 1

No se cierra Iteración 1 porque desaparezca un error individual.

Debe ocurrir la cadena completa:

`rootfix source-only auditado → fast-forward limpio → un CONTROL_PLANE_SELFTEST canónico → selftest completo PASS → handshake durable del mismo run → owner reejecuta selftest completo → CONTROL_PLANE_HARDENING_CLOSE → convergence/terminal-truth/independent-readback/docs discovery PASS`.

Si el selftest o la revalidación del owner falla:

- no rerun automático;
- no F2;
- no nueva autorización;
- no producto ni datos;
- se clasifica la causa dentro de esta misma Iteración 1.

## Efectos y límites

- Producto: sin cambios.
- Candidata: intacta.
- Datos reales: sin cambios.
- Secrets/Firestore/browser: no usados por este rootfix.
- Writes operacionales: 0.
- Deploy: 0.
- Producción: no tocada.
- `main`: no tocado.
- Merge: no ejecutado.
- F2: no autorizado.
- Progreso: 75%.

## Academia

Patrón reusable obligatorio:

- distinguir validator stale de defecto funcional;
- no demostrar comportamiento por texto fuente;
- candidata/revisiones mediante bindings dinámicos;
- source code activo no se autoparchea durante runtime;
- register como validador read-only;
- router nativo por contrato versionado;
- autoridad efectiva separada de perfil contractual;
- lifecycle de evidencia por clase;
- scratch behavioral testing pre-provider;
- invariantes de inmutabilidad byte a byte;
- pruebas negativas obligatorias;
- handshake como identidad causal, no sustituto de pruebas;
- owner de cierre con revalidación independiente;
- `STOP_RETRY` como propiedad ejecutada.

## Claude

`BACKEND_PROTEGIDO_NO_CLAUDE`.

No enviar este bloque a Claude: pertenece al control-plane/backend protegido.

## Siguiente acción exacta

`AUDIT_FAST_FORWARD_ROOTFIX → BOOTSTRAP_SOURCE_ONLY_IF_CLEAN → ONE_CANONICAL_CONTROL_PLANE_SELFTEST → SAME_RUN_HANDSHAKE → OWNER_REVALIDATES_FULL_BEHAVIOR → CONTROL_PLANE_HARDENING_CLOSE`

Hasta completar esa cadena no se declara Iteración 1 cerrada ni se solicita autorización F2.
