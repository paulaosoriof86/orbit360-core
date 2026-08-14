# CHANGELOG R1 — GO-LIVE 2026-08-14

## R1 · Observabilidad productiva y clasificación de causa raíz

### Changed
- Instrumentado únicamente `tools/orbit360-fase-a-product-local-synthetic-smoke-v20260814.mjs` para conservar transiciones sanitizadas `orbit:product-readonly-bootstrap` y requests HTTP fallidos sin query strings ni secretos.
- No se modificó producto funcional, datos, Auth, membership, Rules, Functions, HostDime ni producción.

### Verified
- Workflow `Orbit360 Fase A Product Local Synthetic 20260814` run `31820056535`, job `94830881175`.
- Gate source, ensamblaje, entrypoint, login DOM, runtime config e identidad smoke: PASS antes del fallo.
- Bootstrap observado: `environment -> authentication -> membership -> planning -> attaching -> blocked`.
- Error interno real: `snapshots_no_adjuntos`.
- Firestore/Auth/operational writes: 0.
- Deploy: 0.
- Producción: intacta.

### Root cause
- `DATA_CONTRACT_FAILURE / PRODUCT_RUNTIME_COLLECTION_POLICY_MISMATCH`.
- El catálogo actual `clientes, aseguradoras, gestiones, notificaciones` contradice el contrato required/optional canónico ya aprobado.
- `notificaciones` no tiene política productiva y no corresponde al almacenamiento usado por el módulo de mensajería.
- El store productivo P0 no distingue required/optional y puede declarar readiness parcial.

### Decision
- R2 será un solo rootfix de la capa catálogo/hidratación productiva reutilizando el contrato required/optional existente.
- No tercer intento de la misma familia si R2 repite el fallo.
- Avance: candidata funcional 100%; iteraciones 25% (1/4); gates finales 0% (0/3).
