# Bloque 1 · Validador obsoleto por versión literal del preflight

Fecha: 2026-07-21  
Gate: `block1-client360-insurers-lab-v20260717`  
Clasificación: `VALIDATOR_STALE`

## Evidencia previa

El contrato `1.0.30` pasó su preflight estático:

```txt
Run: 29874164347
Artifact: 8512322966
Digest: sha256:5fdccc1aa9b33943eb7f88ef909a0050b95fdc1c0a4106f4bdba240d46b2419c
Resultado: GO_GATE_CONTRACT
Checks: 1047/1047
Runtime: no ejecutado
Navegador: no ejecutado
Secretos: no leídos
Firestore: no consultado
Deploy: no ejecutado
```

## Hallazgo

Antes de autorizar runtime se comprobó que el workflow canónico todavía exigía literalmente:

```txt
1.0.29
```

Aunque ya comparaba el `runId` y parte de la evidencia contra el freeze, esa literalidad habría bloqueado el contrato `1.0.30` antes de leer credenciales.

## Causa raíz

El workflow no derivaba toda la versión del contrato desde las fuentes canónicas de autorización. Conservaba una versión anterior quemada.

## Corrección

Se modificó únicamente:

```txt
.github/workflows/orbit360-aseguradoras-runtime-gate-v20260716.yml
```

Ahora compara atómicamente:

```txt
marker.staticPreflightEvidence.contractVersion
=
freeze.staticPreflightAuthorization.contractVersion
=
freeze.finalGateAuthorization.contractVersion
```

No se cambió producto, módulo, datos, Store, Auth, reglas, backend ni Hosting.

## Regla de salida

Como el workflow cambió después del preflight `1.0.30`, esa evidencia no puede autorizar runtime. Se requiere un único preflight estático nuevo bajo contrato `1.0.31`, sin secretos, navegador, Firestore, bóveda ni deploy.

Solo `GO_GATE_CONTRACT` y `ok:true` habilitan posteriormente el mismo gate final único.
