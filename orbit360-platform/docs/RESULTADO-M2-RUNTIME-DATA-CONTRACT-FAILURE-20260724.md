# Resultado M2 runtime read-only — causa raíz cerrada

Fecha: 2026-07-24  
Gate: `block2-product-readonly-runtime-v20260723`

## Run runtime histórico

```text
Run: 30103556811
Commit: 83e881394495a678cf343e2f4977669175e01cbe
Artifact: 8600630817
Resultado observado: DATA_CONTRACT_FAILURE
```

Proyecto, configuración web, Auth y membership fueron resueltos. El bootstrap no instaló el store ni llegó a snapshots. No hubo Rules ni escrituras.

## Diagnóstico estático posterior

```text
Run: 30106013739
Commit: a478551a31bf4799907c63bad3e8108cc8c93cb6
Artifact: 8601596832
Digest: sha256:8f2e8429268d1e4a7cfcd89fe2dc68e70da6f1345a3d9b2f3046de1904fb16a5
Preflight: GO_GATE_CONTRACT 40/40
Prueba de causa raíz: PASS 28/28
Resultado: M2_ROOT_CAUSE_STATIC_PROVEN
```

## Reclasificación vinculante

```text
Clasificación: VALIDATOR_STALE
Root cause: AUTH_DEMO_MARKER_REJECTED_AUTHORIZED_EXISTING_IDENTITY
Snapshots first cause: false
```

El validador anterior rechazaba la identidad existente autorizada por un marcador histórico antes de adjuntar snapshots. La corrección mantiene el bloqueo demo general y permite únicamente una transición explícita, reconciliada, read-only, derivada desde membership y con escrituras desautorizadas.

## Cobertura diagnóstica corregida

Una futura ejecución guardará fase y errores sanitizados de bootstrap, readiness y snapshots. El runtime corregido sigue sin autorización.

```text
Runtime autorizado: no
Allowed executions: 0
Rules modificadas: no
Escrituras: 0
Producción tocada: no
```

## Control neto del cierre

Un archivo raíz accidental fue creado y eliminado inmediatamente. La comparación entre el HEAD anterior y el posterior devolvió cero archivos modificados, por lo que el efecto neto fue nulo.
