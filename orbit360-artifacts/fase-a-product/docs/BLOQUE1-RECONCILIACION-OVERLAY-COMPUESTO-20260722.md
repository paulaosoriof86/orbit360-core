# Bloque 1 — Reconciliación del overlay del ciclo de vida

Fecha: 2026-07-22  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`

## Problema

Después de reconciliar el ciclo de vida del validador, el overlay visual 1.0.37 conservaba requisitos de Academia 1.227 y los checks retirados `FREEZE_STOP_THE_LINE`, `FREEZE_NO_RUNTIME` y `AUTHORIZATION_CONSUMED`.

El producto no debía modificarse para satisfacer esos tokens históricos.

## Clasificación

`VALIDATOR_STALE`

## Solución

Se conserva intacto el overlay visual histórico:

`tools/orbit360-gate-contract-overlay-v20260718.json`

Se agrega un overlay complementario:

`tools/orbit360-gate-contract-overlay-validator-lifecycle-v20260722.json`

El wrapper:

`tools/orbit360-validar-gate-contracts-composed-v20260722.mjs`

compone ambos overlays en un directorio temporal, reemplaza únicamente los requisitos de Academia y del lifecycle validator y ejecuta allí el preflight oficial:

`node tools/orbit360-validar-gate-contracts-v20260717.mjs block1-client360-insurers-lab-v20260717`

El mirror temporal se elimina al finalizar. No escribe en el repositorio, no lee secretos ni Firestore y no habilita runtime, navegador o deploy.

## Contratos actualizados

Academia:

- contenido 1.228;
- `_m1visualv:1228`;
- separación usuario/contraseña;
- exclusión de `Uso` en datos bancarios;
- responsive e `Instalar como app`;
- ciclo de vida de autorización estática.

Validador visual:

- `phase-aware-static-authorization-v2`;
- `FREEZE_M1_OPEN`;
- `FREEZE_NO_RUNTIME_BROWSER_DEPLOY`;
- `AUTHORIZATION_STATIC_LIFECYCLE`;
- gate contract preservado en 1.0.37.

## Alcance preservado

No se modificaron:

- owner visual ni CSS;
- datos, credenciales o cuentas;
- Auth, `Orbit.store` o importadores;
- Firebase, Functions o Rules;
- producción, `main` o merge.

Inventario preservado: 414 clientes, 26 aseguradoras, 7 asesores, 91 referencias bancarias válidas y 26/26 credenciales.

## Claude y Academia

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Patrón reusable: los overlays históricos se conservan y los cambios de ciclo de vida se aplican mediante una capa complementaria explícita; el producto no se modifica para satisfacer un validador obsoleto.

## Siguiente acción

Cuando exista un mecanismo de ejecución estática observable, crear una autorización de un solo uso y ejecutar el wrapper compuesto. No repetir el gate final y no habilitar runtime, navegador o deploy.
