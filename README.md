# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/orbit360-live-state-v1.json`;
2. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
3. último workflow/evidencia indicado por `lastEvidence`;
4. `orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`;
5. `orbit360-platform/docs/CIERRE-R3-STOP-RETRY-ACADEMIA-TRANSITIVE-ROOT-CAUSE-20260814.md`;
6. `orbit360-platform/CHANGELOG-R3B-GOLIVE-20260814.md`.

No usar memoria, README histórico, PENDIENTES o una conversación anterior como sustituto del live-state.

## Estado vivo · R3 post-causa-raíz source-only · 2026-08-14

```text
stateVersion objetivo: 20260814.r3-source-only-transitive-composition-pass.1
previousStateVersion: 20260814.r3-stop-retry-transitive-lab-policy-root-cause.1
fase: PRE_GOLIVE_R3_POST_ROOT_CAUSE_VALIDATION_AUTHORIZATION
RC: RC-AYS-LAB-CANONICA-01
baseline funcional preservado: 4ede3e785cb2cc889a7c11c2d9e2030c7af20b64
último runtime HEAD: dc5822d2b6561460edbd36c29e58951666a1000a
último source-only HEAD: fc281a6865f5b5ae75d01f9deb01b4da04baa305
último source-only run: 31835646012
PR #5: draft/open
main/merge: no
HostDime: no bloquea todavía
ZIP durable: no
producción tocada: no
```

## Cerrado y NO se reabre

- R1 observabilidad / policy mismatch.
- R2 required/optional: store `ready-read-only`, 7/7 required, 430 clientes, 30 aseguradoras.
- Tenant-context productivo: PASS y cerrado.
- Auth/membership: no son el bloqueo.
- Router: renderiza `inicio` antes del antiguo pageerror.
- Causa raíz transitiva de Academia LAB-only: **CERRADA SOURCE-ONLY**.

## Cierre source-only de causa raíz

Run: `31835646012`  
HEAD: `fc281a6865f5b5ae75d01f9deb01b4da04baa305`

El workflow estuvo congelado explícitamente en `ORBIT360_R3_SOURCE_ONLY_ROOTFIX=true`.

Resultado:

```text
Gate/assemble/dynamic closure: PASS
Install runtime tools: SKIPPED
Secrets/identity: SKIPPED
Browser/render: SKIPPED
ZIP: SKIPPED
secretAccess: false
browserExecuted: false
deployExecuted: false
productionTouched: false
```

La clausura productiva quedó:

```text
staticRootCount: 115
dependencyClosureCount: 193
dynamicDependencyCount: 78
missing: 0
dynamicMissing: 0
knownMissing: 0
tenantRefsMissing: 0
parityFailures: 0
forbiddenIncluded: 0
semanticForbiddenIncluded: 0
discoveredSemanticForbidden: 0
noLabRuntime: true
```

Registro semántico incompatible con product-readonly:

- `core/academia-static-content-write-policy-v20260729.js`;
- `data/academia-v1230-operational-directory-v20260722.js`.

Ambos quedaron ausentes del artefacto y de la dependency closure. El entrypoint crítico continuó PASS, con DOM funcional, assets resueltos, product tenant bridge, product router bootstrap y store pre-auth fail-closed.

Clasificaciones cerradas source-only:

- `VALIDATOR_STALE / PRODUCT_LAB_ONLY_STATIC_POLICY_NOT_REGISTERED` → CLOSED;
- `PIPELINE_MECHANISM_FAILURE / PRODUCT_TRANSITIVE_LAB_ONLY_STATIC_POLICY_INCLUDED` → CLOSED_SOURCE_ONLY.

## STOP_RETRY y siguiente frontera

El `STOP_RETRY` del antiguo browser family permanece registrado: no se autoriza un tercer retry automático de `PRODUCT_BOOTSTRAP_INCLUDES_LAB_ONLY_ACADEMIA_STATIC_CONTENT`.

La causa raíz ya quedó corregida y validada source-only. Cualquier nuevo navegador debe ser una **frontera explícita de aceptación post-causa-raíz**, no una repetición automática del intento anterior.

Siguiente acción exacta, solo después de autorización explícita:

1. mantener congelados R1/R2/Auth/tenant-context/store/router;
2. retirar únicamente el freeze `ORBIT360_R3_SOURCE_ONLY_ROOTFIX` del workflow existente;
3. ejecutar una sola validación post-causa-raíz sobre la composición ya certificada;
4. exigir tenant-context PASS, 7/7 required, 430/30, `inicio` renderizado, cero `pageErrors`, cero local HTTP failures y cero writes;
5. solo con ese PASS, crear manifest + SHA256 + ZIP durable en el mismo run;
6. cualquier nuevo fallo se clasifica por su familia real antes de otra acción; no reabrir la familia ya cerrada sin evidencia nueva.

## Porcentajes vigentes

```text
readiness funcional: 100%
avance técnico global: 50%
gates finales: 0/3
R3 interno: required PASS / tenant-context PASS / router inicio PASS histórico / product-safe closure PASS SOURCE-ONLY / clean render pendiente / ZIP pendiente
R3 PASS -> 75% técnico / 67% gates
R4 PASS -> 100% / 100%
```

Los porcentajes globales no suben por actividad parcial.

## Reglas anti-bucle

- una frontera larga por iteración;
- checkpoint antes de runtime/browser/deploy;
- misma familia dos fallos = `STOP_RETRY`;
- `VALIDATOR_STALE` congela producto y obliga a corregir registro/validador/workflow antes de runtime;
- no buscar paquetes antiguos;
- HostDime no vuelve a ser diagnóstico antes del ZIP durable;
- no reimportar datos para resolver composición o visualización;
- no habilitar writes en product read-only;
- cada cambio de estado sincroniza live-state + PR #5 + README + checkpoint + bitácora.
