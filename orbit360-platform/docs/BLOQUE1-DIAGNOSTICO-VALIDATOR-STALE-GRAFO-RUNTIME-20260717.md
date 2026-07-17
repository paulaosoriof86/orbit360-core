# Bloque 1 — Diagnóstico `VALIDATOR_STALE` del grafo runtime LAB

Fecha: 2026-07-17  
Proyecto: Orbit 360 A&S  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`  
Contrato corregido: `1.0.2`  
Producción: no autorizada

## 1. Bloque y carriles

- Bloque del Plan Maestro: **Bloque 1 — Cliente 360 + Aseguradoras LAB**.
- Carril principal: **B — backend, seguridad, contratos y pipeline**.
- Carriles preservados: **A — frontend/UX/Academia** y **C — datos reales A&S**.
- Datos confirmados y no modificados: 414 clientes, 26 aseguradoras y 7 asesores.

## 2. Evidencia que activó el cortacircuitos

El run `29605732501`, sobre HEAD `a6f2ef6400856afc07db7d162837437e2e9e24aa`, confirmó:

- preflight anterior: verde;
- validación estática: verde;
- proyecto, cuenta de servicio, sincronización y canal LAB: verdes;
- runtime canónico: verde;
- primer bloqueo: `PIPELINE_STEP_TIMEOUT:authentication_observe_signin`;
- ninguna evidencia de fallo en Cliente 360, Aseguradoras, datos o scopes porque el gate no alcanzó esos checks.

La misma autenticación había avanzado en un run anterior y había llegado a Legal. Al repetirse la etapa de Auth después de sustituir el mecanismo de observación, se detuvieron los reintentos y se abrió diagnóstico del grafo runtime, conforme al Addendum de Control de Causa Raíz.

## 3. Causa raíz

El registro del gate ya declaraba retirados y prohibidos estos artefactos:

- `aseguradoras-candidate-actions.js`;
- `aseguradoras-frontend-projection-v20260716.js`;
- `empalme-v1251-runtime.js`;
- `import-initial-profiles.js`;
- `importar-initial-tenant-lab.js`.

Sin embargo, el bootstrap LAB activo todavía contiene dependencias transitivas hacia artefactos retirados:

- `core/backend-lab-init.js` carga `data/import-initial-profiles.js` y `modules/importar-initial-tenant-lab.js`;
- `core/backend-lab-auth-guard.js` carga `modules/aseguradoras-candidate-actions.js`;
- el guard de Auth mezcla autenticación con reenganche de store, carga de acciones de Aseguradoras, `showApp` y rerender de la ruta.

El preflight anterior no detectaba esta contradicción porque solo revisaba:

1. referencias retiradas dentro del workflow;
2. selectores retirados dentro del script final del gate.

No recorría los archivos realmente cargados por el runtime. Por eso devolvía `GO_GATE_CONTRACT` aunque el bootstrap activo contradijera el registro de owners y temporales retirados.

## 4. Clasificación

Clasificación primaria: **`VALIDATOR_STALE`**.

Motivo: la cadena de validación permitía ejecutar Firebase, Hosting y Playwright sobre un grafo runtime que incumplía el propio contrato versionado.

Consecuencia metodológica:

- se congela el producto;
- no se modifica Auth, Legal, Cliente 360, Aseguradoras ni datos;
- no se reejecuta el runtime;
- primero se corrigen registro y preflight para que el incumplimiento quede bloqueado antes del entorno.

## 5. Implementación aplicada

### `tools/orbit360-validar-gate-contracts-v20260717.mjs`

Se actualizó a `orbit360-gate-contract-preflight-v2-runtime-graph`.

Ahora:

- elimina comentarios antes de analizar JS, HTML y YAML;
- obtiene el grafo runtime declarado por el gate;
- verifica que cada archivo exista;
- inspecciona cada archivo activo contra todas las referencias retiradas/prohibidas;
- falla con `VALIDATOR_STALE` antes de secrets, Firebase, sincronización, Hosting o Playwright.

### `tools/orbit360-gate-contract-registry-v20260717.json`

Se actualizó el contrato a `1.0.2` y se agregó `runtimeGraphFiles`, incluyendo:

- preview e `index.html`;
- loader e init LAB;
- guard de Auth LAB;
- Router, Legal y Access;
- proyección canónica de clientes;
- Cliente 360 y Aseguradoras;
- configuración runtime del tenant.

El estado del gate pasó a:

`ACTIVE_FROZEN_VALIDATOR_STALE`

No se cambió el `gateId`, el workflow, los conteos, las tres vistas ni el predicado final `ok === true`.

## 6. Archivos no modificados

- `core/auth.js`;
- `core/legal.js`;
- `core/backend-lab-auth-guard.js`;
- `core/backend-lab-init.js`;
- `core/router.js`;
- `core/access-scope.js`;
- `modules/cliente360.js`;
- `modules/aseguradoras.js`;
- `data/store.js` y adaptadores;
- `firestore.rules`;
- importadores y datos.

## 7. Claude / prototipo comercializable

Clasificación:

- `REPLICABLE_CLAUDE_INMEDIATO`: un módulo o bootstrap no puede cargar bridges, proyecciones o acciones retiradas por dependencias indirectas.
- `REPLICABLE_CLAUDE_ACUMULADO`: cada candidata debe declarar su grafo de scripts activos y validarse contra el ledger de artefactos retirados antes del empalme.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: rutas LAB, Firebase, secrets, Playwright y detalles de Auth.
- `TEMPORAL_RETIRO`: cualquier bridge excepcional debe tener owner, consumidor, motivo y bloque de retiro; no puede permanecer oculto dentro de un loader o guard.

Patrón reusable:

> El contrato de un gate debe validar no solo los archivos propietarios, sino también el grafo efectivo de bootstrap. Una referencia retirada reintroducida transitivamente debe bloquear el build antes del runtime.

## 8. Impacto en Academia

`ACADEMIA_ACTUALIZAR` con el caso:

**“El gate está verde, pero el runtime carga una dependencia retirada.”**

La lección debe enseñar:

- diferencia entre defecto funcional y validador obsoleto;
- por qué un preflight debe revisar dependencias transitivas;
- por qué no se corrigen Cliente 360, Aseguradoras o datos si la primera falla ocurre en bootstrap/Auth;
- cómo aplicar el cortacircuitos tras repetir una etapa;
- por qué un guard de Auth no debe convertirse en owner de Aseguradoras, importación o render.

## 9. Estado y siguiente acción exacta

Estado: **Bloque 1 activo y congelado antes del runtime**.

Siguiente acción exacta, solo después de obtener evidencia del nuevo preflight:

1. confirmar `VALIDATOR_STALE` antes de cualquier acceso al entorno;
2. identificar todas las referencias retiradas reportadas en `core/backend-lab-init.js` y `core/backend-lab-auth-guard.js`;
3. clasificar la corrección de producto como `FUNCTIONAL_DEFECT` de bootstrap/owner separation;
4. retirar únicamente esas cargas transitivas, preservando Auth, store, importadores canónicos y datos;
5. actualizar contrato/documentación/Claude/Academia en el mismo cierre;
6. ejecutar el mismo preflight;
7. solo con `GO_GATE_CONTRACT`, ejecutar una vez el mismo gate runtime.

No se abre Bloque 2, no se revisa visualmente y no se autoriza producción hasta evidencia sanitizada `ok:true` del Bloque 1.
