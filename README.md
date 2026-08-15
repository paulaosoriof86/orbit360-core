# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/orbit360-live-state-v1.json`;
2. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
3. último workflow/evidencia indicado por `lastEvidence`;
4. `orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`;
5. `orbit360-platform/docs/CIERRE-R4-FIRST-PRODUCTION-SMOKE-HARNESS-TIMEOUT-20260815.md`;
6. `orbit360-platform/CHANGELOG-R4-GOLIVE-20260814.md`.

No usar memoria ni documentación histórica como sustituto del live-state.

## Estado vivo · R4 PUBLICADO / RECUPERACIÓN SOURCE-ONLY DEL HARNESS · 2026-08-15

```text
R1/R2/R3: CERRADOS
app.aysseguros.com: PUBLICADO, login visible
paquete: exacto R3 certificado, sin rebuild
R4 browser frontier #1: CANCELLED por timeout del harness
producto/Auth defect: NO CLASIFICADOS por esa corrida
workflow R4 browser: REFROZEN SOURCE-ONLY
avance: 100% funcional / 75% técnico / 67% gates
```

## Primera frontera productiva

Run `31903805595`, job `95058471779`, HEAD `5c12be143b6241a0af335d78f227c0ad14b05008`.

Pasaron antes del navegador:

- gate canónico source-only;
- instalación;
- binding de secretos protegidos;
- resolver read-only de identidad;
- exactamente 1 actor elegible;
- roles requeridos presentes;
- resolver con cero escrituras.

El paso browser inició a `19:24:57Z` y fue cancelado por el timeout del job a `19:44:28Z`. Node y Chromium permanecieron activos hasta la cancelación.

El artifact `9252029652` solo contiene:

- `preflight-sanitizado.json` PASS;
- `m6-product-smoke-identity-summary.json` PASS.

No existe `r4-production-readonly-smoke-v20260815.json`. Por ello la corrida no demuestra si el punto de espera fue manifest, Auth, membership, tenant, activación o rutas.

Clasificación:

`PIPELINE_MECHANISM_FAILURE / R4_HARNESS_UNBOUNDED_BROWSER_AWAIT_AND_FINAL_ONLY_EVIDENCE`

No clasificar esta corrida como contraseña incorrecta ni defecto funcional.

## Freeze anti-bucle

El workflow R4 se refreezeó en HEAD `73a9cfc6d0ae6d430919aa32fcc0be7871b94740`.

Control source-only:

- run `31904861893` SUCCESS;
- gate PASS;
- instalación `skipped`;
- secretos `skipped`;
- identity `skipped`;
- browser `skipped`.

Mientras el freeze esté activo, editar el harness no puede disparar otro browser productivo.

## Siguiente acción exacta

Corregir **solo** `tools/orbit360-r4-production-readonly-smoke-v20260815.mjs` y, si es necesario, assertions del workflow:

- deadline global menor al timeout del job;
- timeouts explícitos para cada async browser-side;
- checkpoints sanitizados antes/después de manifest, login HTTP, Auth, membership, activación y rol/rutas;
- persistir evidencia parcial aunque una etapa expire;
- finalización signal-safe.

Validar source-only con gate + `node --check` + assertions de watchdog/checkpoints. No ejecutar segundo navegador antes de cerrar esta recuperación y sincronizar documentación.

## Avance

```text
readiness funcional: 100%
avance técnico: 75%
gates finales: 67% (2/3)
R4: publicación completa; primer smoke no válido por fallo del harness
```

Sin reconstrucción, reimportación, main ni merge. No pedir nuevas pruebas manuales de contraseña a Paula mientras Auth siga sin clasificación automática válida.
