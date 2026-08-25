# Rootfix F2 — atribución causal de consola en probe cross-tenant

Fecha: 2026-08-25

## Clasificación

`VALIDATOR_STALE:F2_EXPECTED_DENIAL_CONSOLE_ERROR_CAUSAL_ATTRIBUTION_MISSING`

## Evidencia que dispara el cambio

Run `32904415944`, PR técnico `#132`, candidata certificada `9504702901`.

El F2 superó gate source-only, aceptación one-shot, publicación CAS, gate semántico, provider, integridad before, 21 trazas de rutas, integridad after y comparación before/after. También probó `crossTenantDenied:true`, cero page errors y cero write signals. El único fallo del browser fue un mensaje genérico de consola por HTTP 400.

El runner vigente ejecutaba deliberadamente la lectura cross-tenant denegada antes de exigir globalmente `consoleErrors.length===0`, pero el listener de consola solo conservaba texto genérico. No existían URL/status-origen/fase suficientes para atribuir causalmente ese 400 al producto. Por tanto, el terminal observado `FUNCTIONAL_DEFECT` no constituye evidencia causal suficiente para modificar Orbit 360.

## Rootfix

Se mantiene estricto el runner funcional. El binder current-run solo entra en diagnóstico cuando se cumplen simultáneamente: error único `F2_CONSOLE_ERRORS` HTTP 400/403, `crossTenantDenied:true`, todas las trazas de ruta PASS, cero page errors y cero write signals.

En ese único caso ejecuta un probe diagnóstico read-only contra la misma candidata e identidad. La señal solo se normaliza si el diagnóstico reproduce la denegación, observa una respuesta Firestore 400/403 en la ventana del probe y obtiene exactamente el mismo mensaje de consola. Un 400 no relacionado, múltiple, no reproducido o acompañado por otro error permanece FAIL.

El auditor semántico pre-auth ejecuta además un selftest puro que demuestra: denegación esperada aislada, 400 no relacionado rechazado y denegación sin ruido aceptada.

## Impacto

- Producto/candidata: sin cambios.
- Datos: sin cambios.
- Writes: ninguno.
- Deploy/producción/main/merge: ninguno.
- Run consumido: no replay.
- Siguiente cierre: `REGRESSION_REOPEN → SELFTEST → HARDENING_CLOSE`; solo después puede existir una identidad F2 fresca.
