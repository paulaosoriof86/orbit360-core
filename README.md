# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/orbit360-live-state-v1.json`;
2. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
3. último workflow/evidencia indicado por `lastEvidence`;
4. `orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`;
5. `orbit360-platform/docs/CHECKPOINT-R4-POST-PUBLISH-AUTH-E2E-BEFORE-BROWSER-20260815.md`;
6. `orbit360-platform/CHANGELOG-R4-GOLIVE-20260814.md`.

No usar memoria ni documentación histórica como sustituto del live-state.

## Estado vivo · R4 PUBLICADO / AUTH + E2E PRODUCTIVO ACTIVO · 2026-08-15

```text
stateVersion: 20260815.r4-published-auth-e2e-prebrowser.1
fase: R4_POST_PUBLISH_AUTH_E2E_PREBROWSER
R1/R2/R3: CERRADOS
ZIP: orbit360-fase-a-product-r3-4f70f0dd6e87.zip
SHA256: 4fd52a748fa130fd069b2d2684e1944369164aeb0646fe728067dd7b4ce29e69
source head R3: 4f70f0dd6e870e8c7443a7638a9dc6e954eace1b
app.aysseguros.com: paquete cargado y extraído manualmente
login público: visible
HostDime transport: ya no bloquea el smoke
POST_GO_LIVE_SMOKE_PASS: pendiente
```

## Publicación confirmada por captura

Paula cargó y extrajo el paquete certificado directamente en `/home/ayssegur/public_html/app.aysseguros.com`. La estructura visible contiene `index.html`, `core/`, `data/`, `docs/`, `modules/`, `styles/`, `product-runtime-config.js`, `sw.js` y `orbit360-package-manifest.json`, conservando los archivos propios del hosting.

`https://app.aysseguros.com` muestra el login productivo de Orbit 360.

## Auth actual

Un intento humano con la cuenta administrativa mostró el error genérico de login. Ese texto no permite distinguir contraseña, `emailVerified`, membership, tenant o bootstrap y **no se usará para diagnosticar por intuición**.

No se pedirán más pruebas manuales de contraseña antes de la clasificación automática.

El paquete productivo no expone una función de recuperación de contraseña en esa pantalla; `Limpiar sesión` solo limpia estado local.

## Siguiente frontera

Se reutiliza el actor de smoke no humano ya existente y los secrets protegidos usados por R3. El resolver read-only exige exactamente una identidad elegible, verificada, activa y con roles `Dirección + Operativo + Asesor`, sin crear ni modificar usuarios.

Antes de cualquier secreto/browser:

```text
node tools/orbit360-validar-gate-contracts-v20260717.mjs fase-a-ops-leads-crm-release-lab-v20260812
```

Solo con PASS se ejecutará una única frontera Playwright contra el dominio público para:

- verificar el manifest exacto publicado;
- distinguir Auth HTTP / emailVerified / membership / tenant;
- validar tenant `alianzas-soluciones`;
- store `ready-read-only` y required 7/7;
- 430 clientes / 30 aseguradoras en la vista privilegiada;
- Dirección desktop, Operativo tablet y Asesor móvil;
- Inicio + rutas críticas según permisos;
- cero errores relevantes, copy técnico y escrituras inesperadas.

## Avance

```text
readiness funcional: 100%
avance técnico: 75%
gates finales: 67% (2/3)
R4: publicación completada; smoke productivo pendiente
```

R4 solo cierra con `POST_GO_LIVE_SMOKE_PASS`. Sin reconstrucción, reimportación, main ni merge.
