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

## Estado vivo · R3 STOP_RETRY · 2026-08-14

```text
stateVersion: 20260814.r3-stop-retry-transitive-lab-policy-root-cause.1
fase: PRE_GOLIVE_R3_STOP_RETRY_SOURCE_ONLY_ROOT_CAUSE
RC: RC-AYS-LAB-CANONICA-01
baseline funcional preservado: 4ede3e785cb2cc889a7c11c2d9e2030c7af20b64
último runtime HEAD: dc5822d2b6561460edbd36c29e58951666a1000a
último run: 31834590862
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
- Router: renderiza `inicio` antes del pageerror.

## STOP_RETRY vigente

El run `31834590862` fue el **segundo fallo de la misma familia**:

`PIPELINE_MECHANISM_FAILURE / PRODUCT_BOOTSTRAP_INCLUDES_LAB_ONLY_ACADEMIA_STATIC_CONTENT`

No existe autorización para un tercer navegador de esa familia.

El intento directo de retirar `data/academia-v1230-operational-directory-v20260722.js` del bootstrap productivo sí funcionó: el bootstrap ya no lo solicita. Sin embargo, la clausura dinámica volvió a incluirlo.

### Causa raíz exacta

`core/academia-static-content-write-policy-v20260729.js`:

- se declara explícitamente `LAB only`;
- define `OPERATIONAL_OWNER_SRC='data/academia-v1230-operational-directory-v20260722.js?...'`;
- llama globalmente `ensureOperationalDirectoryOwner()`;
- permanece como root del artefacto productivo porque el gate actual identifica LAB principalmente por nombre/token y ese archivo no contiene `lab` en su ruta.

Resultado: el source-gate reportó PASS, pero la política LAB-only reinyectó el owner estático y volvió a producir `pageError: lecciones` contra el store productivo read-only. El store bloqueó correctamente la escritura; no debe modificarse para permitirla.

Clasificaciones vigentes:

- `VALIDATOR_STALE / PRODUCT_LAB_ONLY_STATIC_POLICY_NOT_REGISTERED`;
- causa raíz de pipeline: `PIPELINE_MECHANISM_FAILURE / PRODUCT_TRANSITIVE_LAB_ONLY_STATIC_POLICY_INCLUDED`.

## Siguiente acción exacta · SOURCE-ONLY

No ejecutar navegador, secrets, deploy, HostDime ni producción.

1. congelar runtime/producto;
2. corregir únicamente composición del paquete + registro/validador source para que `core/academia-static-content-write-policy-v20260729.js` y `data/academia-v1230-operational-directory-v20260722.js` sean incompatibles con el artefacto productivo;
3. ejecutar solo source-gate y clausura dinámica;
4. exigir que ambos archivos estén ausentes del artefacto y de la clausura, manteniendo las referencias críticas de Fase A;
5. detener después de esa evidencia source-only y volver a sincronizar documentación;
6. cualquier navegador posterior requiere una nueva frontera explícitamente autorizada después del cierre de causa raíz; no se considera un tercer retry automático.

## Porcentajes vigentes

```text
readiness funcional: 100%
avance técnico global: 50%
gates finales: 0/3
R3: required PASS / tenant-context PASS / router inicio PASS / product-safe closure FAIL / ZIP pendiente
R3 PASS -> 75% técnico / 67% gates
R4 PASS -> 100% / 100%
```

Los porcentajes no suben por actividad parcial.

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
