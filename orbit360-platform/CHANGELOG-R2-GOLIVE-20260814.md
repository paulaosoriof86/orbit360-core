# CHANGELOG R2 GO-LIVE · 2026-08-14

## R2 · Required/Optional product hydration

### Implementado
- `tools/orbit360-fase-a-materialize-product-runtime-config-v20260813.mjs` deriva required/optional desde el contrato canónico `core/visual-runtime-hydration-contract-v20260805.js`.
- Nuevo owner aditivo `core/product-hydration-required-optional-p0.js` aplica readiness required/optional sobre el store productivo read-only sin modificar el store base.
- `asesores` permanece optional y se proyecta en lectura desde identidad activa y relaciones canónicas cuando la fuente legacy no está disponible.
- `tools/orbit360-fase-a-build-product-artifact-v20260813.mjs` sincroniza runtime source→artifact y verifica paridad para impedir probar copias versionadas antiguas.

### Evidencia
- Synthetic run `31822262972`, job `94838064587`, HEAD `8816f1e1119150f993a79fd56de33c104c29ecec`.
- Gate/source assembly PASS antes de secretos.
- Identidad/config pública PASS.
- Bootstrap alcanzó `ready-read-only`.
- Required: 7/7 adjuntas; missing=0; failed=0.
- Clientes 430; Aseguradoras 30.
- Firestore/Auth/operational writes=0; deploy=0; productionTouched=false.

### Cierre de causa R1
- CERRADO: `DATA_CONTRACT_FAILURE / PRODUCT_RUNTIME_COLLECTION_POLICY_MISMATCH`.
- `notificaciones` dejó de ser hard dependency.
- Optional/legacy degradado no bloquea readiness.

### Nuevo blocker
- El workflow global terminó FAIL después de readiness por timeout de `#host`.
- Router carga contratos por `import()` dinámico antes de renderizar y el artifact reportó 404 local de JS bajo `/core/`.
- Clasificación: `PIPELINE_MECHANISM_FAILURE / PRODUCT_DYNAMIC_RUNTIME_ASSET_GAP`.
- No se hizo segundo intento de esta nueva familia dentro de R2.

### Estado
- Readiness funcional: 100%.
- Plan técnico: 50% (R1+R2, 2/4).
- Gates go-live: 0% (0/3).
- R3 absorbe el cierre de assets dinámicos + paquete durable + manifest + hashes.
