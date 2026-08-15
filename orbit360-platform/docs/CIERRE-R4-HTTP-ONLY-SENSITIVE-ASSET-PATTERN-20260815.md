# CIERRE R4 — HTTP-ONLY SENSITIVE ASSET PATTERN · 2026-08-15

## Estado

R4 permanece publicado y browser refrozen source-only. Esta iteración no ejecutó navegador, secretos, Auth, Firestore, deploy ni rebuild.

## Fuente/base

- repo: `paulaosoriof86/orbit360-core`;
- branch: `ays/backend-tenant-lab-v99-20260703`;
- PR: #5 draft/open;
- product source R3: `4f70f0dd6e870e8c7443a7638a9dc6e954eace1b`;
- HTTP diagnostic commit: `474e022382920382f6e0f408038d4734908521ec`;
- run: `31908342723`;
- job: `95069516527`;
- artifact: `9252961845`;
- artifact digest: `sha256:0ac94926266abff0cf6c219b565fe334b10f013deb51d889e0f8cef4d4909932`.

## Clasificación

`ENVIRONMENT_FAILURE / R4_CORE_STATIC_DELIVERY_BROADER_FAILURE`

No es una clasificación de contraseña, Firebase Auth, `emailVerified`, membership, tenant o producto funcional.

## Evidencia

### Neutros servidos correctamente

- `core/config.js`: HEAD 200 / GET 200; bytes y SHA-256 coinciden con R3.
- `core/legal.js`: HEAD 200 / GET 200; bytes y SHA-256 coinciden con R3.
- `core/access-scope.js`: HEAD 200 / GET 200; bytes y SHA-256 coinciden con R3.

### Assets sensibles con el mismo fallo Apache

- `core/auth.js`: HEAD 500 / GET 500.
- `core/auth-password-change-v20260805.js`: HEAD 500 / GET 500.
- `core/user-credential-selfservice-v20260805.js`: HEAD 500 / GET 500.

Los tres GET 500 tienen:

- `server: Apache`;
- `content-type: text/html; charset=iso-8859-1`;
- body de 712 bytes;
- misma firma SHA-256 `07e2c9e80962ab9ff4072c4d192e5b5e51d993d7e100c5af563c2eeff21cc002`.

Los response bodies no se persistieron en evidencia.

El paquete/source R3 no contiene `orbit360-platform/.htaccess`.

## Causa raíz acotada

La evidencia descarta corrupción general del paquete o fallo general del directorio `/core`: tres assets neutros se sirven exactamente como R3.

La familia de owner está en la entrega Apache/hosting de recursos ligados a autenticación/credenciales: regla de seguridad, handler, policy o metadata/permisos aplicados selectivamente.

**ModSecurity es una hipótesis fuerte, no una regla ID probada.** El ID/directiva exacto solo puede cerrarse con evidencia server-side (audit/error log o soporte HostDime).

## Qué NO hacer

- no cambiar contraseñas;
- no crear otro usuario;
- no cambiar membership;
- no editar `core/auth.js`;
- no renombrar assets para evadir la seguridad;
- no reconstruir ni volver a subir el paquete;
- no reimportar datos;
- no ejecutar otro browser;
- no desactivar ModSecurity globalmente;
- no main ni merge.

## Siguiente acción exacta

Obtener evidencia server-side para las tres rutas 500 en `app.aysseguros.com` e identificar:

1. rule ID de ModSecurity si aplica;
2. directiva Apache/handler si aplica;
3. metadata/permisos si aplica;
4. timestamp y request reproducible correlacionado.

Si se demuestra falso positivo de ModSecurity, preferir exclusión/whitelist de la regla exacta únicamente para `app.aysseguros.com` en vez de desactivar el motor global.

Solo después del fix de hosting ejecutar un gate HTTP-only que exija 200 + SHA-256 R3 exacto en todos los assets afectados. Únicamente con ese PASS se puede considerar reabrir una frontera browser/Auth.

## Carriles

- A frontend/UX: sin cambios.
- B backend/Auth: Auth congelado; bloqueo previo a Auth.
- C datos reales: sin acceso ni escrituras.

## Claude / Academia

- `REPLICABLE_CLAUDE_ACUMULADO`: patrón reusable de diagnóstico asset-by-asset con hash y cache bypass; no incluye backend protegido ni secretos.
- `ACADEMIA_ACTUALIZAR`: ejemplo de `ENVIRONMENT_FAILURE` frente a defecto funcional, y de por qué no se corrigen credenciales cuando el fallo ocurre antes del request Auth.

## Avance

- readiness funcional: 100%;
- avance técnico: 75%;
- gates finales: 67% (2/3);
- `POST_GO_LIVE_SMOKE_PASS`: pendiente.
