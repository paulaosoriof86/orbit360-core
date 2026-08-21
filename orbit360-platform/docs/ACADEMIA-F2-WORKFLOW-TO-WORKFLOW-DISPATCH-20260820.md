# Academia Orbit 360 — workflow-to-workflow sin disparos implícitos

Un commit creado dentro de GitHub Actions con el `GITHUB_TOKEN` no debe usarse como supuesto mecanismo para encadenar otro workflow por evento `push`. Que el archivo llegue correctamente al repositorio no garantiza que el siguiente workflow vaya a ejecutarse.

Para una transición crítica como F2, el patrón reusable es explícito: el control plane valida estado, request y autorización; después invoca el runtime con `workflow_dispatch` y parámetros ligados a la identidad autorizada. El runtime vuelve a validar esos parámetros y ejecuta el gate canónico antes de cualquier capacidad sensible.

La clasificación correcta cuando el request existe pero el run esperado no nace por este mecanismo es `PIPELINE_MECHANISM_FAILURE`, no `FUNCTIONAL_DEFECT`. No corresponde reabrir producto, reimportar datos ni crear otro Request para compensar el disparo ausente.

Reachability debe validar no solo que existan owner, workflow y gate, sino que la transición entre ellos sea realmente invocable. Una ruta documentalmente correcta pero no disparable no está cerrada.
