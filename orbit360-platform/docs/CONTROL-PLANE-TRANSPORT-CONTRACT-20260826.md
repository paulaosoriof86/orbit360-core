# CONTROL-PLANE — CONTRATO DE TRANSPORTE V2

El transporte activo ya no utiliza PR técnico.

Secuencia única:

`HEAD+ledger vivo → rama efímera desde ese HEAD → un commit de intent → validación del padre/HEAD/revisión → invariant source-only → claim ledger-only por CAS cuando exista riesgo → ejecución → evidencia run-scoped → terminal ledger-only por CAS`.

No se resetean PRs, no se reabren PRs, no se depende de `synchronize`, no se usa un mutex estático compartido y no se proyecta estado a documentación humana.

Cualquier base stale o segundo claim falla antes de capacidades privilegiadas.
