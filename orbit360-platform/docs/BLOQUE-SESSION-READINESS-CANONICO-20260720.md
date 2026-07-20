# Bloque Session Readiness canónico — 2026-07-20

Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción: no autorizada

## Objetivo

Separar “usuario autenticado” de “sesión operativa lista” y evitar que un gate intente hacer clic mientras identidad, rol, tenant o aceptación legal siguen pendientes.

## Owner canónico

`core/session-readiness-contract-v20260720.js`

Versión: `20260720.1`.

El owner observa:

```txt
browserAuthReady
activeRoleResolved
tenantResolved
legalApiReady
legalAcceptanceRecorded
legalOverlayOpen
legalGateSatisfied
appVisible
```

Solo declara `ready:true` cuando todas las condiciones operativas obligatorias están satisfechas.

## Garantías

- No acepta acuerdos.
- No hace clics.
- No escribe en almacenamiento.
- No llama directamente al registrador legal.
- No usa `Orbit.store`.
- No contiene datos del tenant.
- No expone identidad ni valores protegidos en evidencia.

## Bootstrap

`core/router-tenant-config-bootstrap.js` carga el owner antes del contrato del importador.

Versiones sincronizadas:

```txt
session readiness: 20260720.1
importer execution: 20260720.2
Academia: 1.226
```

## Auditoría determinista

Validador:

`tools/orbit360-validate-session-readiness-contract-v20260720.mjs`

Resultado local aislado:

```txt
19 PASS
0 FAIL
ok:true
```

Escenarios comprobados:

1. usuario no autenticado → `AUTH_NOT_READY`;
2. gate legal pendiente → `LEGAL_GATE_PENDING`;
3. aceptación registrada pero overlay abierto → sigue bloqueado;
4. identidad, rol, tenant y gate legal resueltos → `ready:true`;
5. cero escrituras durante todos los escenarios.

Este resultado es una validación determinista local del contrato. No sustituye el preflight de repositorio ni reactiva el gate congelado.

## Estado del gate

`importers-e2e-acceptance-lab-v20260720` permanece congelado.

No se reutiliza la revisión que falló dos veces en la etapa de confirmación. Una futura revisión debe integrar la interacción con la UI legal real y probar `legalGateSatisfied:true` antes del primer clic del importador.

## Corte seguro

No se implementó ningún bypass, escritura directa de aceptación ni fixture que simule consentimiento. La interacción legal debe conservar el owner y la UI reales.

## Siguiente acción exacta

Diseñar una revisión nueva del conductor de navegador que:

1. espere el owner `session-readiness`;
2. detecte `LEGAL_GATE_PENDING`;
3. complete la UI legal real una sola vez;
4. espere `ready:true`;
5. registre evidencia sanitizada;
6. solo entonces permita el primer clic del importador.

Antes de ejecutar esa revisión se debe actualizar el registro, ejecutar el preflight vinculante y mantener el workflow anterior congelado.
