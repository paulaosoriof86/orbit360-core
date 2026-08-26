# ACADEMIA — DELTA CONTROL-PLANE ESTADO ÚNICO

Enseñar por rol técnico:

- el ledger es la única autoridad mutable;
- contracts/pointers/evidence no son estado vivo;
- `PIPELINE_MECHANISM_FAILURE` obliga a sustituir el mecanismo, no a tocar producto;
- una rama efímera de ejecución contiene un solo intent;
- el claim CAS ocurre antes del riesgo;
- un evento stale o duplicado no puede ejecutar un segundo claim;
- runtime y producción nunca dependen de README, PR body, CHANGELOG o una proyección documental;
- handlers futuros reutilizan el mismo state owner y no crean otro control-plane.
