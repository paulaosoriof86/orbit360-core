# Bloque 1 · contrato 1.0.11

Fecha: 2026-07-17

Gate: `block1-client360-insurers-lab-v20260717`

## Hallazgo

El run `29615254551` confirmó preflight, canal LAB y conteos 414/26/7. El validador se detenía antes del acceso porque exigía más de una ruta visible sin identidad ni rol activo.

El owner Access opera correctamente en modo fail-closed antes del login. La visibilidad completa corresponde al estado autenticado con rol y scope resueltos.

## Clasificación

`VALIDATOR_STALE`.

## Corrección

- retirar solo el requisito de menú múltiple pre-auth;
- conservar runtime, Firebase, proveedor Auth, formulario LAB y ruta inicial;
- registrar `preAuthAccessFailClosed`;
- validar menú completo después del login en Asesor móvil;
- incluir los helpers del gate en `paths` y `node --check` del workflow.

## Carriles

- A: frontend y módulos preservados.
- B: validador y cobertura CI corregidos.
- C: datos 414/26/7 preservados; sin reimportación.

## Claude y Academia

- `REPLICABLE_CLAUDE_INMEDIATO`: separar seguridad pre-auth de visibilidad post-auth.
- `REPLICABLE_CLAUDE_ACUMULADO`: readiness → identidad → rol → visibilidad.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: automatización LAB.
- `ACADEMIA_ACTUALIZAR`: enseñar fail-closed y scopes por rol.

## Estado

`ACTIVE_PENDING_RUNTIME_GATE`.

Solo evidencia `ok:true` habilita revisión visual. Bloque 2 y producción permanecen bloqueados.
