# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/orbit360-live-state-v1.json`;
2. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
3. último workflow/evidencia indicado por `lastEvidence`;
4. `orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`;
5. `orbit360-platform/docs/CIERRE-R4-SECOND-BROWSER-AUTH-ASSET-HTTP500-20260815.md`;
6. `orbit360-platform/CHANGELOG-R4-GOLIVE-20260814.md`.

No usar memoria ni documentación histórica como sustituto del live-state.

## Estado vivo · R4 PUBLICADO / AUTH BLOQUEADO ANTES DE CREDENCIALES · 2026-08-15

```text
R1/R2/R3: CERRADOS
app.aysseguros.com: publicado, login visible
paquete: exacto R3 certificado, sin rebuild
harness R4 bounded observability: PASS
segunda frontera browser: FAIL CLASIFICADO
manifest: PASS / HTTP 200 / source R3 exacto
/core/auth.js: HTTP 500
Auth/password/emailVerified/membership browser: NO EVALUADOS
clasificación: ENVIRONMENT_FAILURE / R4_PUBLISHED_AUTH_ASSET_MISMATCH
workflow browser: REFROZEN source-only
avance: 100% funcional / 75% técnico / 67% gates
```

## Segunda frontera R4

Run `31907938110`, job `95068560384`, HEAD `9150d249e6eeeb1962d0831a541e18737e35b7e3`.

PASS antes del punto de fallo:

- gate canónico;
- instalación;
- binding de secretos protegidos;
- resolver read-only;
- exactamente 1 actor elegible;
- roles requeridos presentes;
- target HTTPS 200;
- login visible;
- manifest R3 HTTP 200 y exacto;
- cero writes.

Primer fallo válido:

`/core/auth.js` respondió HTTP `500`.

El harness se detuvo en `auth-asset-validated` con:

`ENVIRONMENT_FAILURE / R4_PUBLISHED_AUTH_ASSET_MISMATCH`

No hubo request de login a Identity Toolkit; por tanto no existe evidencia de contraseña incorrecta, email no verificado, membership defectuosa ni fallo del runtime.

Artifact `9252867826`, digest `sha256:854906ce4618e24f1c1c7c004ecf608b5919849637fdac1c1a8104a4299951e5`.

## Refreeze anti-bucle

HEAD `6c15b7ccaee4a56be50912148470949e9a28317b` reactivó source-only.

Control run `31908033440`, job `95068778079`: **SUCCESS**.

- gate PASS;
- watchdog PASS;
- install skipped;
- secrets skipped;
- identity skipped;
- browser skipped.

## Siguiente acción exacta

Diagnosticar **fuera de Auth** el HTTP 500 de `/core/auth.js` con requests HTTP directos no-store, comparación contra assets hermanos de `/core` y contra el source/paquete R3 certificado. Determinar primero si el owner es regla/handler/seguridad/permisos del hosting o integridad/entrega del archivo.

No tocar contraseña, usuarios, memberships, `core/auth.js`, paquete productivo, datos ni HostDime por intuición. Corregir únicamente el owner demostrado y exigir evidencia estática/HTTP antes de otro browser.

No reconstrucción, no reimportación, no main, no merge.
