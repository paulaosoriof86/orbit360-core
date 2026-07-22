# ADDENDUM MAESTRO — CONTROL PLANE DE GATES, FASES E INMUTABILIDAD

**Fecha:** 2026-07-22  
**Proyecto:** Orbit 360 — Alianzas y Soluciones  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Gate:** `block1-client360-insurers-lab-v20260717`  
**Producción, main, merge, Functions y Rules:** no autorizados

## 0. Carácter vinculante

Este addendum complementa el Documento Maestro Consolidado, el Addendum de Academia Profunda, el Addendum de Patrones Reutilizables, el Plan Maestro de Ejecución Productiva y el Addendum de Control de Causa Raíz, Validadores y Gates.

Para cualquier conflicto sobre fase de ejecución, capacidades permitidas, autorización de un gate, disparo de workflows, consumo de intentos, estado vivo del HEAD y evidencia de salida, prevalece este addendum.

No crea un gate paralelo. Endurece el gate canónico existente.

## 1. Incidente y recurrencia comprobada

El preflight vinculante de M1 falló repetidamente en la misma etapa, aun después de varias reconciliaciones parciales.

Evidencia relevante:

- run `29953485798`: `PIPELINE_MECHANISM_FAILURE`, check `CANONICAL_PREFLIGHT_ENTRYPOINT`;
- run `29954997417`: `VALIDATOR_STALE`, checks `WORKFLOW_PROJECT_LOCK` y `WORKFLOW_CHANNEL_LOCK`;
- gate técnico histórico: PASS, sin reejecución;
- remediación visual: PASS estático previo;
- producto, datos, Store, Auth, importadores y backend protegido: sin regresión demostrada.

La repetición no fue causada por Clientes, Aseguradoras, credenciales, referencias bancarias ni por la remediación visual.

## 2. Causa raíz estructural

La causa raíz fue un **control plane distribuido y mutable**, sin un modelo canónico de fase y capacidades.

El estado efectivo del gate estaba repartido entre:

1. registro del gate;
2. extensiones del registro;
3. overlay funcional;
4. patch de lifecycle;
5. motor de validación;
6. entrypoint de composición temporal;
7. freeze del incidente;
8. archivo de autorización mutable;
9. workflow;
10. texto manual del PR.

Estas fuentes no tenían la misma semántica:

- el registro describía un gate runtime con proyecto Firebase y canal Hosting;
- el workflow activo era un preflight puramente estático;
- el lifecycle podía reemplazar tokens, pero no cambiar validaciones incondicionales del motor;
- el motor exigía proyecto y canal en todas las fases;
- el archivo de autorización permanecía `active:true` después de haber sido usado porque el workflow tenía permisos de solo lectura;
- el cuerpo del PR copiaba manualmente un HEAD que quedaba obsoleto al siguiente commit.

Por eso cada corrección alineaba una capa y dejaba otra desfasada. La cadena producía un nuevo bloqueo con la misma causa general.

## 3. Modelo canónico obligatorio: fase + capacidades

Todo gate debe declarar un `executionProfile` efectivo antes de validar el workflow.

Fases autorizadas:

```text
STATIC_PREFLIGHT
LAB_RUNTIME_GATE
LAB_HOSTING_DELIVERY
```

Cada fase declara explícitamente sus capacidades:

```text
secrets
firestoreRead
writes
runtime
browser
deploy
functionsDeploy
rulesDeploy
production
```

Regla bloqueante:

> Un requisito de entorno solo se valida cuando la capacidad correspondiente está habilitada para la fase declarada.

Aplicación:

- `STATIC_PREFLIGHT`: no exige proyecto Firebase ni canal Hosting y todas las capacidades operativas permanecen en `false`;
- `LAB_RUNTIME_GATE`: puede exigir proyecto, runtime y navegador únicamente mediante autorización separada;
- `LAB_HOSTING_DELIVERY`: puede exigir proyecto y canal únicamente mediante autorización separada y alcance Hosting explícito;
- producción nunca se deriva de una fase LAB.

Queda prohibido volver a usar checks incondicionales de proyecto, canal, secretos, runtime o navegador para todas las fases.

## 4. Un solo contrato efectivo

El contrato efectivo del gate es el resultado de la composición canónica ejecutada por:

```text
tools/orbit360-validar-gate-contracts-v20260717.mjs
```

El motor preservado es:

```text
tools/orbit360-validar-gate-contracts-engine-v20260717.mjs
```

La composición debe entregar al motor, antes de cualquier check:

- `gateId`;
- `contractVersion`;
- `executionProfile.phase`;
- `executionProfile.capabilities`;
- `executionProfile.workflowLocks`;
- owners y archivos requeridos;
- evidencia esperada.

Ningún workflow, overlay auxiliar o documento puede redefinir silenciosamente la fase después de esa composición.

## 5. Solicitud inmutable de ejecución

Se retira como mecanismo de ejecución el archivo Git mutable con campos `active`, `consumed` y `allowedExecutions`.

Toda futura ejecución controlada usa una **solicitud inmutable** con:

- `requestId` único;
- `gateId`;
- fase exacta;
- capacidades permitidas;
- `parentHead` exacto;
- una ejecución permitida;
- prohibición de rerun;
- cero secretos y datos personales.

El workflow debe comprobar:

```text
GITHUB_RUN_ATTEMPT == 1
request.parentHead == HEAD^
request.phase == fase declarada
request.capabilities == contrato efectivo
```

La solicitud se crea como último commit, después de alinear motor, lifecycle, workflow, freeze y documentación. Antes de ese commit no se ejecuta nada.

Queda prohibido:

- reutilizar una solicitud;
- editar una solicitud ya ejecutada;
- reintentar el mismo run;
- convertir un fallo en una nueva autorización sin diagnóstico de causa raíz;
- usar el archivo de autorización retirado como trigger.

## 6. Estado vivo y evidencia

Fuentes vivas autorizadas:

1. metadata del PR para HEAD, rama y estado draft/open;
2. GitHub Actions para run, attempt, conclusión y SHA ejecutado;
3. artefacto sanitizado del run para checks y predicado de éxito;
4. freeze versionado para restricciones y causa raíz.

El cuerpo del PR no debe volver a declarar manualmente un HEAD como fuente autoritativa. Debe indicar:

```text
HEAD vivo: consultar metadata del PR
```

Un resumen documental nunca puede contradecir la metadata del PR o el artefacto del run.

## 7. Regla reforzada después de dos fallos

Cuando la misma etapa falle dos veces:

```text
STOP THE LINE
NO NUEVA SOLICITUD
NO NUEVO WORKFLOW
NO NUEVO OVERLAY PARALELO
NO CAMBIO DE PRODUCTO
NO RUNTIME
NO DEPLOY
```

Antes de permitir otra solicitud debe existir una matriz de causalidad que responda:

- qué fase se ejecuta;
- qué capacidades están habilitadas;
- qué fuente define cada requisito;
- qué check falló;
- por qué el check aplica a esa fase;
- qué capa se corrige;
- qué capas deben permanecer congeladas;
- cómo se evita la recurrencia.

Solo se habilita una nueva solicitud cuando la causa raíz queda cerrada en el control plane, no cuando se oculta el check fallido.

## 8. Cambio atómico obligatorio

Cuando cambie la semántica de una fase, deben alinearse antes del disparo:

```text
registro/contrato efectivo
lifecycle
motor de validación
workflow
freeze
mecanismo de solicitud
documentación
impacto Claude
impacto Academia
```

Los commits intermedios no pueden disparar ejecución. La solicitud inmutable es siempre el último commit.

## 9. Aplicación al cierre M1 actual

Fase vigente:

```text
STATIC_PREFLIGHT
```

Capacidades vigentes:

```text
secrets=false
firestoreRead=false
writes=false
runtime=false
browser=false
deploy=false
functionsDeploy=false
rulesDeploy=false
production=false
```

Predicado único de aceptación:

```text
GO_GATE_CONTRACT
executionPhase=STATIC_PREFLIGHT
visual remediation PASS 29/29
GO_STATIC_ARCHITECTURE
finalGateRerun=false
```

Este preflight no ejecuta el gate técnico final, no abre navegador, no despliega Hosting, no lee bóveda y no toca datos.

## 10. Verificación estructural realizada

La solicitud inmutable `m1-static-preflight-control-plane-reconciled-v1-20260722` se ejecutó una sola vez:

```text
Run: 29961263105
Attempt: 1
Execution phase: STATIC_PREFLIGHT
Gate contract: GO_GATE_CONTRACT
Contract checks: 1366/1366
Runtime/browser/deploy/writes: false
Final technical gate rerun: false
```

Este resultado prueba que la causa raíz del control plane distribuido quedó corregida: el preflight estático dejó de exigir proyecto Firebase y canal Hosting.

El run se detuvo después en el contrato visual:

```text
Visual checks: 28/29
Failed check: ACADEMY_RESPONSIVE
Classification: VALIDATOR_STALE
```

La lección de Academia sí contenía `títulos`, `encabezados`, `pestañas`, `acciones` e `Instalar como app`. El validador exigía una frase literal con una conjunción distinta. No existió defecto de contenido ni regresión del producto.

El check fue corregido sin nueva ejecución para validar el conjunto semántico de conceptos. La solicitud inmutable quedó consumida y no puede reutilizarse.

## 11. Auditoría independiente no ejecutora

Se verificó sin ejecutar GitHub Actions que:

- el motor lee `executionProfile` antes de aplicar locks de entorno;
- `STATIC_PREFLIGHT` deshabilita capacidades operativas y locks de proyecto/canal;
- el workflow solo se dispara por la solicitud inmutable;
- la solicitud se liga a `HEAD^` y bloquea `GITHUB_RUN_ATTEMPT` distinto de 1;
- la autorización mutable anterior está inactiva, consumida y retirada;
- `ACADEMY_RESPONSIVE` valida tokens semánticos individuales;
- Academia contiene todos los conceptos exigidos.

Resultado:

```text
INDEPENDENT_NON_EXECUTING_AUDIT: PASS
NEW_EXECUTION_AUTHORIZED: false
STOP_THE_LINE: vigente
```

## 12. Impacto Claude / prototipo

**Clasificación:** `REPLICABLE_CLAUDE_ACUMULADO`.

Claude debe conservar:

- diferencia entre defecto funcional y validador obsoleto;
- owners canónicos;
- estados honestos;
- cero cambios de UX para satisfacer un check de infraestructura;
- retiro de bridges y mecanismos paralelos.

Claude no recibe workflows internos, autorizaciones, infraestructura Firebase, secretos, datos reales ni implementación protegida del motor.

## 13. Impacto Academia

Academia técnica debe enseñar:

- fase frente a capacidad;
- por qué un preflight estático no exige proyecto ni canal;
- cómo leer una solicitud inmutable;
- diferencia entre `VALIDATOR_STALE`, `PIPELINE_MECHANISM_FAILURE` y `FUNCTIONAL_DEFECT`;
- por qué dos fallos detienen los reintentos;
- por qué no se corrige el producto para satisfacer infraestructura desalineada;
- por qué los validadores deben comprobar semántica o conducta y no redacciones literales frágiles.

## 14. Estado vinculante posterior

```text
CONTROL PLANE ROOT CAUSE: CLOSED STRUCTURALLY
PREFLIGHT CONTROL CONTRACT: GO 1366/1366
VISUAL VALIDATOR STALE: CORRECTED WITHOUT RERUN
INDEPENDENT NON-EXECUTING AUDIT: PASS
M1: OPEN
NEW EXECUTION: NOT AUTHORIZED
RUNTIME / BROWSER / HOSTING / DATA / PRODUCTION: BLOCKED
```

M1 no se cierra con este addendum. Una futura ejecución solo podrá abrirse mediante una decisión metodológica separada basada en la auditoría completada; no puede reutilizar la solicitud consumida ni crear otra automáticamente.
