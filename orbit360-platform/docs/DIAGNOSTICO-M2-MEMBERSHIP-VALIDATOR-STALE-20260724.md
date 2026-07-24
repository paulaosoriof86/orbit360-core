# Diagnóstico M2 — membership validator stale

Fecha: 2026-07-24  
Gate: `block2-product-readonly-runtime-v20260723`  
Contrato: `2.2.1`

## Ejecución runtime consumida

```text
Run: 30120872643
Commit: 7e18bfaa7018808f0a2633e893a54f95d5b49970
Artifact: 8607334226
Digest: sha256:9ca918fa457dec4cd21c25f86b3963db738b0a333a62d3008daedc14bc443e26
Resultado observado: DATA_CONTRACT_FAILURE
Bootstrap phase: blocked
Store instalado: no
Snapshots adjuntos: no
```

Preflight, proyecto, Auth, Firestore y membership pasaron. La ejecución quedó consumida y no fue repetida.

## Evidencia estática vinculante

```text
Run: 30121522166
Commit: 8f3494a1168347d0e34d28e4a5c16c39a5bb6216
Artifact: 8607610574
Digest: sha256:adcbc769341dbfc1c266edac7d4ebc963e8fda06bdf81f0d1da1878c0f58ff20
Preflight canónico: GO_GATE_CONTRACT 32/32
Prueba de causa raíz: PASS 24/24
Resultado: M2_MEMBERSHIP_VALIDATOR_STALE_PROVEN
```

## Subcausa exacta

El owner canónico de membership declara deliberadamente la identidad histórica con `email: orbit.lab@demo.com`, estado activo, roles, países y scopes completos. El readiness corregido inicialmente aplicó la transición controlada al usuario Auth, pero mantuvo `membresia_demo_no_permitida` sin la excepción equivalente para la misma membership.

La prueba reprodujo exactamente un error con la membership canónica: `membresia_demo_no_permitida`. También confirmó que `auth_email_no_verificado` no fue la causa y que snapshots no se alcanzaron.

```text
Clasificación vinculante: VALIDATOR_STALE
Root cause: MEMBERSHIP_DEMO_MARKER_REJECTED_CONTROLLED_EXISTING_IDENTITY
Secondary: PIPELINE_MECHANISM_FAILURE
Auth email verified cause: false
Snapshots first cause: false
```

La brecha secundaria correspondía a la sanitización que convirtió el código contractual en `[redacted]:[redacted]`.

## Correcciones probadas

- la guarda controlada se aplica tanto a Auth como a membership;
- la membership debe coincidir con UID y tenant esperados;
- sin guarda o con identidad no vinculada, el marcador demo continúa bloqueado;
- una identidad demo genérica permanece bloqueada;
- no existe hardcode A&S en el owner genérico;
- la evidencia conserva códigos contractuales seguros y extrae errores de readiness sin exponer PII ni secretos.

## Seguridad observada

```text
Runtime reintentado: no
Secretos en prueba estática: no
Firebase en prueba estática: no
Firestore en prueba estática: no
Auth/membership modificados: no
Rules modificadas: no
Escrituras: 0
Hosting/Functions/importaciones: no
Pólizas/M3/merge/main: no
```

## Estado y siguiente frontera

Las autorizaciones runtime y estática quedaron consumidas:

```text
Runtime autorizado: no
Allowed runtime executions: 0
Static gate autorizado: no
Allowed static executions: 0
Runtime corregido preparado: sí
```

Después de dos bloqueos consecutivos en readiness, no existe reintento implícito. Cualquier futura ejecución requiere una autorización nueva y explícita, un request inmutable nuevo y revisión previa de esta evidencia.

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.  
Academia: versión `1.243` cerrada.
