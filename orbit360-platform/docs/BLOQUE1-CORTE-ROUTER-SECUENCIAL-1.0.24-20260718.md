# Bloque 1 · Corte Router secuencial 1.0.24

Clasificación: `FUNCTIONAL_DEFECT` del scheduling del Router y `VALIDATOR_STALE` en dos tokens duplicados del registro.

La evidencia 1.0.23 aprobó Auth, handoff, PWA, sintaxis, loader y proyección de Cliente 360. El contrato core de Aseguradoras respondió HTTP 200 y terminó su descarga, pero no fue parseado ni ejecutado dentro del límite.

Se conserva el guard que impide render temprano antes de `Orbit.route`. La cola exclusiva del Router usa `async=false`, conserva su secuencia `next()` y no comparte bootstrap con cargadores de módulos.

El preflight inicial de 1.0.24 encontró exactamente dos referencias obsoletas: `script.async = true` y `contractVersion: 1.0.23` dentro de `runtimeVersionContracts`. Se actualizaron junto con owner, runner y registro.

Carril A: sin cambios en Cliente 360, Aseguradoras o UX.
Carril B: Router, gate, registro, documentación y Academia; Store, Auth y reglas intactos.
Carril C: 414 clientes, 26 aseguradoras y 7 asesores sin reimportación.

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`. Academia: diferenciar transporte HTTP, parseo, ejecución, owner y readiness; los validadores duplicados deben cambiar con el contrato propietario.

Salida: preflight vinculante y una sola ejecución oficial; cierre únicamente con `ok:true`.
