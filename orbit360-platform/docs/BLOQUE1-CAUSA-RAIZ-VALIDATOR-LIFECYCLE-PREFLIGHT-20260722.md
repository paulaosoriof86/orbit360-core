# Bloque 1 — Causa raíz del preflight 1.0.37: ciclo de vida del validador

Fecha: 2026-07-22  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`

## Clasificación

`VALIDATOR_STALE`

El preflight central del contrato 1.0.37 cerró `GO_GATE_CONTRACT` con 1314/1314 checks. El fallo posterior no provenía del owner visual, los datos, la bóveda, el entorno del producto ni los importadores.

## Primer check real fallido

`FREEZE_STOP_THE_LINE`

El validador exigía que el freeze permaneciera en la fase anterior a la remediación y, simultáneamente, que la autorización ya estuviera consumida. Durante un preflight estático válido de un solo uso, la autorización debe estar activa y no consumida hasta finalizar.

Los otros checks fallidos fueron `FREEZE_NO_RUNTIME` y `AUTHORIZATION_CONSUMED`. Los dos fallos de arquitectura fueron propagación directa: `M1_VISUAL_REMEDIATION_CONTRACT_EXECUTES` y `M1_VISUAL_REMEDIATION_CONTRACT_PASS`.

## Corrección

Se conserva el gate contract 1.0.37 porque no cambió el producto ni el conjunto de owners. Se versiona por separado el ciclo de vida del validador como `phase-aware-static-authorization-v2`.

El validador acepta dos fases legítimas:

1. autorización estática activa, no consumida y con una ejecución;
2. autorización estática consumida, inactiva y con cero ejecuciones.

En ambas exige secretos, Firestore, escrituras, runtime, navegador, Functions, Rules, producción y deploy en falso. También exige M1 abierto y la reejecución del gate final bloqueada.

## Sustitución del mecanismo

Los dos commits que intentaron disparar el workflow no produjeron run ni status observable. Se clasificó `ENVIRONMENT_FAILURE` y se sustituyó el mecanismo por un único commit Git Data con parent SHA verificado. No se realizó un tercer disparo.

## Alcance preservado

No se modifican el owner visual, estilos, datos, credenciales, cuentas, Auth, `Orbit.store`, importadores, Firebase, Functions, Rules ni producción. Se mantienen 414 clientes, 26 aseguradoras, 7 asesores, 91 referencias bancarias válidas y 26/26 credenciales.

## Claude / prototipo

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Patrón reusable: un validador debe distinguir la fase autorizada y la fase consumida sin relajar permisos ni exigir estados incompatibles.

## Academia

Contenido 1.228: diferencia entre autorización estática activa y consumida, y prohibición de habilitar runtime, navegador o deploy para satisfacer un validador.

## Siguiente acción

Cuando el mecanismo estático esté disponible, crear una nueva autorización de un solo uso y repetir únicamente el preflight vinculante bajo gate contract 1.0.37 y lifecycle revision `phase-aware-static-authorization-v2`. No repetir el gate final.
