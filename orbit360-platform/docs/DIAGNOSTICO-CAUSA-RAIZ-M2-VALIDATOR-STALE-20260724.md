# Diagnóstico estático de causa raíz M2 — VALIDATOR_STALE

Fecha: 2026-07-24  
Gate: `block2-product-readonly-runtime-v20260723`  
Contrato: `2.2.1`  
Rama: `ays/backend-tenant-lab-v99-20260703`

## Evidencia vinculante

```text
Run: 30106013739
Commit evaluado: a478551a31bf4799907c63bad3e8108cc8c93cb6
Artifact: 8601596832
Digest: sha256:8f2e8429268d1e4a7cfcd89fe2dc68e70da6f1345a3d9b2f3046de1904fb16a5
Preflight canónico: GO_GATE_CONTRACT 40/40
Prueba de causa raíz: PASS 28/28
Resultado: M2_ROOT_CAUSE_STATIC_PROVEN
Clasificación: VALIDATOR_STALE
```

## Causa raíz probada

La identidad canónica del LAB coincide entre el owner vigente y Firestore Rules. El contrato productivo anterior incluía esa identidad entre los marcadores demo prohibidos y reproducía `auth_demo_no_permitido`.

```text
Root cause code: AUTH_DEMO_MARKER_REJECTED_AUTHORIZED_EXISTING_IDENTITY
Exact subcause proven: true
Snapshots excluded as first cause: true
```

El orden del bootstrap confirma que `backendProductReadinessP0.readiness` se ejecuta antes de `_attachSnapshots`. Por tanto, snapshots no fueron la primera causa del run `30103556811`.

## Reclasificación

El run anterior conservó su resultado histórico `DATA_CONTRACT_FAILURE`, pero su causa vinculante queda reclasificada a `VALIDATOR_STALE`. La brecha secundaria `PIPELINE_MECHANISM_FAILURE` correspondía a la pérdida de fase y códigos sanitizados en la evidencia.

## Corrección fail-closed

El validador genérico conserva el bloqueo demo por defecto. Una identidad histórica solo puede superar readiness cuando se prueban simultáneamente:

- transición controlada de identidad existente;
- proyecto existente reconciliado;
- tenant derivado únicamente desde membership;
- modo read-only;
- escrituras desautorizadas.

Si falta una condición, se mantienen `auth_demo_no_permitido` y `transicion_identidad_existente_incompleta`. La prueba confirmó además que una identidad demo genérica continúa bloqueada y que el owner genérico no contiene tenant, UID ni correo A&S.

## Cobertura de evidencia corregida

Una futura ejecución autorizada conservará sanitizados:

- `bootstrapPhase`;
- `bootstrapErrors`;
- `readinessStatus`;
- `readinessErrors`;
- `storeStatus`;
- `storeSnapshotErrorKeys`;
- aceptación de identidad existente controlada.

## Seguridad observada

```text
Secretos accedidos: no
Firebase accedido: no
Firestore leído: no
Runtime ejecutado: no
Rules modificadas: no
Escrituras de configuración: 0
Escrituras operativas: 0
Hosting/Functions: no
Importaciones: no
Pólizas/M3: no
Merge/main: no
```

## Control de modificación accidental

Durante el cierre se creó accidentalmente un `README.md` raíz fuera de alcance y se eliminó inmediatamente. La comparación entre el HEAD anterior y el HEAD posterior confirmó `files: []`, por lo que el efecto neto es cero y no quedó ninguna modificación ajena al diagnóstico. El freeze final registra este control.

## Estado y siguiente frontera

La autorización estática quedó consumida. El runtime corregido está preparado, pero permanece no autorizado:

```text
Runtime autorizado: no
Allowed runtime executions: 0
Corrected runtime request created: false
```

La siguiente acción exige una nueva autorización explícita de una sola ejecución del runtime corregido. Esa decisión no autoriza Rules, escrituras, Hosting, Functions, importaciones, Pólizas, M3, merge ni `main`.

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.  
Academia: versiones `1.240` y `1.241`, diferencia entre resultado histórico y causa raíz, validador obsoleto, guardas fail-closed y trazabilidad diagnóstica sanitizada.
