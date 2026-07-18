# Bloque 1 · redirección de página puente

Fecha: 2026-07-17  
Gate: `block1-client360-insurers-lab-v20260717`

## Evidencia

Los runs `29625830408` y `29625585600` confirmaron que `page.goto` termina primero en `ays-lab-preview.html`; el script de esa página redirige después a `index.html` con backend, tenant y runtime canónicos.

Dos cambios concurrentes movieron selectivamente el control de la transición:

- el controlador `tools/orbit360-gate-runtime-crm-v20260716.mjs` espera la redirección mediante `awaitPreviewRedirect`, con sondeo acotado y etapa `preview_redirect_ready`;
- el helper `tools/orbit360-gate-bootstrap-auth-legal-v20260717.mjs` comprueba inmediatamente la URL canónica y continúa con runtime, Auth, owners y Router.

Las ejecuciones de `be5fabb` fueron canceladas por `cancel-in-progress` al avanzar la rama, no por evidencia funcional.

## Clasificación

`VALIDATOR_STALE` y `PIPELINE_MECHANISM_FAILURE`.

## Estado de carriles

- A: frontend y módulos preservados.
- B: un owner para la transición y otro para la postcondición; registro sincronizado.
- C: 414 clientes, 26 aseguradoras y 7 asesores preservados; sin reimportación.

## Claude y Academia

- `REPLICABLE_CLAUDE_INMEDIATO`: una transición tiene un solo owner; la siguiente capa solo valida la postcondición.
- `REPLICABLE_CLAUDE_ACUMULADO`: puente → destino → runtime → Auth → owners → Router.
- `ACADEMIA_ACTUALIZAR`: explicar deriva de validadores y cancelación por concurrencia.

El `SyntaxError` permanece abierto hasta obtener archivo y línea. Solo `ok:true` habilita revisión visual; Bloque 2 y producción continúan bloqueados.
