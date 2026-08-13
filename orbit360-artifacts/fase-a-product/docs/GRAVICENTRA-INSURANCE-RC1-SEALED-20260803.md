# GRAVICENTRA INSURANCE RC1 — CANDIDATA SELLADA

Fecha: 2026-08-03  
Estado: `RC1_SOURCE_SEALED / NOT_DEPLOYED / NOT_PRODUCTION`

## Identidad inmutable

```text
releaseBranch: release/gravicentra-insurance-rc1-20260803
releaseCommit: 27cb7dfcda8568280ebef15993a953364304f29b
baselineProductHead: 267f7231b46d65b80c167f54567a67503b6a6793
mobileShellFixCommit: 12a52de72f541cf39aae3556fd52a2d444d57b17
pullRequest: 5 draft/open
```

La rama de release se creó desde el commit exacto anterior y no debe recibir cambios. Cualquier correctivo posterior exige una nueva candidata RC2; no se moverá RC1 ni se incorporarán parches silenciosos.

## Alcance preservado

```text
Cliente 360
Aseguradoras
Pólizas
Ops
Leads
roles y scopes
backend/read owner Orbit.store
dataset LAB validado
```

Gate 7.11 preservado:

```text
run 30816576914
artifact 8857032288
GATE711_RELEASE_CRITICAL_RUNTIME_PASS
snapshots before/after byte identical
Auth/Firestore/operational writes 0/0/0
```

## Delta de producto posterior al Gate 7.11

Un único cambio funcional:

```text
classification: FUNCTIONAL_DEFECT
owner: Shell/Topbar responsive
file: orbit360-platform/styles/base.css
fix: mobile shared topbar height and offsets
backend/data impact: none
```

No existen cambios funcionales por módulo, reimportaciones, writers, rules, functions, credenciales o datos.

## Evidencia focalizada

```text
file: orbit360-platform/docs/evidence/SHELL-MOBILE-RC1-FOCUSED-LOCAL-20260803.json
result: PASS_FOCUSED_LAYOUT_RC1_SEAL_ALLOWED
viewport: 390x844
routes: cliente360, polizas, leads
routesPassed: 3
routesFailed: 0
```

La evidencia focalizada complementa y no sustituye el Gate 7.11. El workflow estático/visual del repositorio continúa como control de predeploy; no abre otra auditoría general ni modifica RC1.

## Cloud / Claude / Academia

```text
core reusable implemented: yes
GitHub documentation: yes
Cloud/Claude ledger: CL-094 to CL-097
external Cloud/Claude delivery: no
Academia impact: documented
tenant hardcode: no
```

El estado externo `NO_ENVIADO` es honesto y no bloquea RC1. La sincronización futura debe transportar el patrón reusable, no datos, secretos ni backend protegido.

## Reglas de protección

- no mover ni actualizar la rama RC1;
- no merge a main;
- no deploy ni producción sin autorización explícita;
- no reimportar datos;
- no repetir Gate 7.11;
- no agregar fixes locales dentro de RC1;
- todo hallazgo nuevo se clasifica y, si es bloqueante, crea RC2;
- Cloud/Claude, Academia y documentación deben acompañar cualquier delta futuro.

## Frontera siguiente

```text
predeploy focalizado sobre releaseCommit 27cb7df...
→ backup y rollback exactos
→ confirmación de Hosting/proyecto/target
→ una sola autorización explícita de deploy
→ deploy
→ smoke productivo focalizado
```
