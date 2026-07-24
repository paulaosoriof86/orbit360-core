# Diagnóstico M2 — membership validator stale

Fecha: 2026-07-24  
Gate: `block2-product-readonly-runtime-v20260723`  
Contrato: `2.2.1`

## Ejecución consumida

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

Preflight, proyecto, Auth, Firestore y membership pasaron. La ejecución quedó consumida y no se permite reintento.

## Subcausa exacta probada desde owners

El owner canónico de membership declara deliberadamente la identidad histórica con `email: orbit.lab@demo.com`, estado activo, roles, países y scopes completos. El readiness corregido inicialmente aplicó la transición controlada al usuario Auth, pero mantuvo `membresia_demo_no_permitida` sin excepción equivalente para la misma membership.

El artefacto registró un único error de readiness. La reproducción estática con la membership canónica produce exactamente un error: `membresia_demo_no_permitida`. Con `emailVerified:true`, `auth_email_no_verificado` queda excluido; snapshots tampoco se alcanzaron.

```text
Clasificación: VALIDATOR_STALE
Root cause: MEMBERSHIP_DEMO_MARKER_REJECTED_CONTROLLED_EXISTING_IDENTITY
Secondary: PIPELINE_MECHANISM_FAILURE
```

La brecha secundaria corresponde a la sanitización que convirtió el código contractual en `[redacted]:[redacted]`.

## Correcciones estáticas

- la guarda controlada se aplica ahora tanto a Auth como a membership;
- la membership debe coincidir con UID y tenant esperados;
- sin guarda, con guarda incompleta o con identidad no vinculada, el marcador demo continúa bloqueado;
- no se incorporó hardcode A&S en el owner genérico;
- la evidencia conserva códigos contractuales seguros y extrae errores de readiness sin exponer PII ni secretos.

## Seguridad

```text
Runtime reintentado: no
Secretos nuevos: no
Firebase nuevo acceso: no
Firestore nuevo acceso: no
Auth/membership modificados: no
Rules modificadas: no
Escrituras: 0
Hosting/Functions/importaciones: no
Pólizas/M3/merge/main: no
```

## Siguiente frontera

Ejecutar una única prueba estática, sin Firebase, para cerrar la clasificación y la corrección fail-closed. Solo después podría evaluarse una autorización completamente nueva del runtime; la autorización consumida no puede reutilizarse.

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.  
Academia: versión `1.243`.
