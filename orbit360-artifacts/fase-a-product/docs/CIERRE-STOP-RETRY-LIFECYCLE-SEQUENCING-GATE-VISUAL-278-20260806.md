# CIERRE STOP_RETRY — SECUENCIA LIFECYCLE/REQUEST DEL GATE VISUAL 2.7.8

Fecha: 2026-08-06  
Gate: `block2.7-visual-matrix-corrected-post-auth-lab-v20260805`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR rector: #5 draft/open  
Producción/main/merge: no autorizados

## 1. Autorización recibida

Se autorizó una única activación del lifecycle sobre el HEAD `4a48ce13134e4440ba2f13c2fb6a11d25b3b5187`, seguida de un request nuevo, inmutable y de un solo archivo, preflight corregido y continuación únicamente con `GO_GATE_CONTRACT`.

Límites: backup previo, máximo un deploy Hosting LAB, precheck observable, matriz read-only Dirección/Operativo/Asesor, capturas acotadas no bloqueantes, cero Functions/Rules/Firestore/Auth/operational writes, reimportación, producción, main o merge; rollback y STOP_RETRY ante cualquier fallo.

No podían reutilizarse:

- request `ba993d061a2d55f1703ebaeb0bad2cd9ab8a98ad`;
- run `31071875782`;
- run `31067506016`.

## 2. Ejecución observada

Request nuevo:

```text
75a50b2176aa4e333fb859169e76d81fb03ed542
```

- hijo directo del HEAD autorizado;
- un solo archivo modificado;
- request anterior y runs anteriores declarados como no reutilizados.

Transporte exclusivo:

```text
PR #15
commit 30ab467387182dbe3944834148933a6750feaa45
run 31104465513
```

Resultado:

```text
checkout/identidad de transporte: PASS
request nuevo fijado: PASS
GO_GATE_CONTRACT: FAIL
runtime: SKIPPED
secretos: 0
backup Hosting: 0
Hosting deploy: 0
navegador: 0
Firestore/Auth/operational writes: 0
Functions/Rules: 0
reimportación/producción/main/merge: 0
```

PR #15 se cerró sin merge. El request nuevo se retiró del branch rector.

## 3. Primer check real fallido

El engine del gate exige simultáneamente:

```text
lifecycle.status = AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST
authorizationReserved = true
allowedExecutions = 1
executionAuthorized = true
secretAccessAuthorized = true
firestoreReadAuthorized = true
browserAuthorized = true
hostingDeployAuthorized = true
```

El parent del request conservaba:

```text
lifecycle.status = SOURCEFIX_PASS_PENDING_NEW_EXCLUSIVE_REQUEST
authorizationReserved = false
allowedExecutions = 0
executionAuthorized = false
secretAccessAuthorized = false
firestoreReadAuthorized = false
browserAuthorized = false
hostingDeployAuthorized = false
```

Checks fallidos:

```text
authorizationReserved
executionBoundaries
```

## 4. Clasificación y causa raíz

```text
CLASIFICACIÓN: PIPELINE_MECHANISM_FAILURE
CAUSA RAÍZ: LIFECYCLE_ACTIVATION_PARENT_COMMIT_OMITTED
```

La instrucción autorizaba explícitamente activar el lifecycle antes de crear el request. La ejecución creó el request directamente sobre el lifecycle todavía congelado. El preflight negó correctamente toda capacidad de riesgo.

No es:

- defecto funcional del producto;
- nueva falla de Auth/membership;
- falla de hidratación;
- falla de carga lenta;
- falla de renderización;
- falla de datos;
- falla de Firebase/secret;
- falla de Hosting.

## 5. STOP_RETRY

La misma etapa `GO_GATE_CONTRACT` falló por segunda vez, aunque por checks distintos. Se activa STOP_RETRY:

- no crear otro request;
- no abrir otro transporte runtime;
- no solicitar otra autorización equivalente;
- no tocar producto, Auth, datos, Rules o Hosting;
- no ejecutar navegador ni deploy;
- corregir primero el mecanismo fuera de runtime.

## 6. Correctivo requerido antes de reabrir riesgo

El paquete source-only debe convertir la secuencia en una composición demostrable:

```text
HEAD funcional congelado
→ commit explícito de activación lifecycle
→ prueba sintética de lifecycle activo
→ commit posterior de request exclusivo de un solo archivo
→ prueba sintética de parent + request + diff exclusivo
→ GO_GATE_CONTRACT
→ solo después secretos/runtime/backup/deploy/precheck/matriz
```

La prueba debe demostrar que omitir la activación del lifecycle falla antes de crear el request y que el flujo correcto produce `GO_GATE_CONTRACT` sin secretos, Firebase, navegador ni deploy.

## 7. Estado protegido

```text
Hosting LAB: versión previa conservada
rootfix corregido vivo: NO
PASS_VISUAL_POST_AUTH: NO
Cobros 4.1: PAUSADO
request activo: NO
replay autorizado: NO
producción/main/merge: NO
```

## 8. Siguiente acción exacta

Ejecutar un único bloque source-only, sin autorización adicional, para:

1. implementar la activación lifecycle como prerrequisito explícito e ineludible;
2. agregar fixture y prueba sintética de la secuencia completa;
3. ejecutar sintaxis, source tests y router canónico sin secretos/runtime;
4. dejar evidencia sanitizada de PASS;
5. detenerse antes de crear cualquier request nuevo.

Solo después de ese PASS podrá evaluarse una nueva reapertura macro de riesgo.

## 9. Impacto Claude / Academia

- Clasificación Claude: `REPLICABLE_CLAUDE_ACUMULADO`.
- Patrón reusable: lifecycle y autorización deben ser una máquina de estados explícita; un request nunca puede activar capacidades implícitamente.
- Academia: diferencia entre autorización humana, activación técnica del lifecycle y request ejecutable; STOP_RETRY por repetición de etapa; producto congelado ante fallo de control plane.
