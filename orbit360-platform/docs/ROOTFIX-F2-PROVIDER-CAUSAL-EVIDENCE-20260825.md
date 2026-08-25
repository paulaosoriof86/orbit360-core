# HISTORICAL INCIDENT EVIDENCE — NOT CURRENT STATE AUTHORITY

## F2 provider causal-evidence rootfix — 2026-08-25

### Incidente
El F2 one-shot `32900653602` pasó control-plane source-only, aceptación one-shot, publicación CAS/readback, gate semántico, descarga/rehash de la candidata y dependencias. El paso `provider` terminó con código 41 antes de integridad/browser.

El terminal durable solo pudo reducir `F2_STAGE_OUTCOME:authpublish=success;gate=success;provider=failure;browser=skipped;integrity=skipped`. El resolver sí había escrito `f2-identity-run-32900653602.json`, pero no lo emitía a stdout y el lifecycle class-wide lo eliminó antes de la publicación terminal.

### Clasificación causal
`PIPELINE_MECHANISM_FAILURE:F2_PROVIDER_CAUSAL_EVIDENCE_DROPPED_AND_OBSERVATION_FLAGS_NON_MONOTONIC`

No existe evidencia suficiente para atribuir el error interno del provider a secreto, permisos, red, identidad, membership o datos. Hacerlo sería especulación.

### Causa raíz
1. `tools/orbit360-m6-resolve-smoke-identity-readonly-v20260730.mjs` generaba un JSON causal en error pero no lo imprimía.
2. El terminal no consumía directamente ese archivo y el lifecycle lo limpiaba.
3. El catch marcaba `authRead:false` y `firestoreRead:false` para cualquier excepción, aun cuando la excepción pudiera ocurrir después de iniciar/completar esas etapas.
4. Por ello un fallo provider quedaba reducido a una etiqueta genérica y podía perder observabilidad autorizada.

### Rootfix
- Nuevo contrato puro `tools/orbit360-f2-provider-failure-evidence-v20260825.mjs`:
  - clasifica errores explícitos por contrato;
  - diferencia fallos de seguridad y entorno para errores externos;
  - registra `secretAccess`, `authReadAttempted/authRead`, `firestoreReadAttempted/firestoreRead` de forma monotónica;
  - produce un sobre causal current-run compatible con el slot runtime que ya consume el terminal;
  - tiene selftest source-only sin Firebase/secrets.
- El resolver M6 usa ese contrato, imprime el JSON sanitizado y, solo para `f2-identity-run-<run>.json`, materializa un `f2-browser-run-<run>.json` con `browserExecuted:false` y causa provider. El terminal existente lo reduce antes de que lifecycle limpie evidencia transitoria.
- `tools/orbit360-f2-validator-semantic-policy-audit-v20260825.mjs` ejecuta el selftest del nuevo contrato y bloquea futuras autorizaciones si falla.

### Invariantes preservadas
- Candidata `9504702901` no cambia.
- Cero writes de Firestore/Auth/operación.
- Cero deploy, producción, main o merge.
- No se reutiliza el one-shot consumido.
- El ledger sigue siendo la única autoridad mutable.
- Se conserva el workflow único y el mismo terminal owner.

### Carriles
- A frontend/UX/Academia: producto congelado; sin cambio funcional.
- B backend/seguridad/gates: rootfix de observabilidad causal provider.
- C datos reales/migración: sin cambios.

### Clasificación Claude / Academia
- `BACKEND_PROTEGIDO_NO_CLAUDE`: resolver, contrato causal y integración del gate.
- `ACADEMIA_ACTUALIZAR`: enseñar que un `provider=failure` genérico no basta para diagnóstico; la evidencia debe sobrevivir o reducirse antes del cleanup y distinguir intento/completado.
- No contiene secretos, PII ni datos reales.

### Criterio de salida
No solicitar nueva autorización F2 hasta que: (1) rootfix esté canónico; (2) regression reopen source-only pase; (3) selftest exact-path pase incluyendo provider causal evidence; y (4) hardening cierre nuevamente en `CONTROL_PLANE_DEFINITIVE_CAUSAL_PASS`.
