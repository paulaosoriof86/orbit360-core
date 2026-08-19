# Orbit 360 — F2 SOURCE01 validator stale lifecycle composition

Fecha: 2026-08-19
Gate: `f2-productive-acceptance-exact-successor-v20260818`
Candidate: `9385306424`
Run SOURCE fallido: `32310148537`
Clasificación: `VALIDATOR_STALE`
Código: `CANONICAL_LIFECYCLE_REVISION_MISMATCH`

El request SOURCE pasó su boundary inmutable y falló en el primer gate canónico, antes de descargar el artifact. No hubo secretos, Firebase, datos, browser, runtime, writes, deploy ni producción.

Causa raíz: el router conservaba una composición lifecycle global `phase-capability-contract-v1`. El gate F2 sucesor usa deliberadamente `phase-capability-contract-v2-source-rebind`.

Rootfix: composición lifecycle profile-aware por gate. V1 permanece default para los demás gates; F2 declara explícitamente V2. No se cambian capacidades ni se relaja seguridad.

Siguiente acción: ejecutar el gate canónico en working tree y exigir PASS; después emitir un segundo y último SOURCE-only sobre artifact 9385306424. Si reaparece el mismo código, `STOP_RETRY`.
