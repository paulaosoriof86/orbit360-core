# CIERRE R4 · HOSTDIME SERVER-SIDE ESCALATION · 2026-08-15

## Estado

R4 publicado con paquete R3 exacto. Browser R4 congelado source-only. `POST_GO_LIVE_SMOKE_PASS` pendiente.

## Evidencia válida acumulada

1. Browser frontier #2 (`31907938110` / `95068560384`) llegó hasta `auth-asset-validated` y recibió HTTP 500 para `/core/auth.js` antes de enviar login.
2. HTTP-only #1 (`31908342723` / `95069516527`) probó neutros 200+SHA R3 y tres assets auth/credenciales 500 Apache idéntico.
3. cPanel no expone ModSecurity ni WAF/Incidents de Imunify; `Errores` solo mostró `AH01630` sobre `php.ini`, no sobre `auth.js`.
4. HTTP-only #2 final (`31912332328` / `95079202582`, artifact `9254004177`) mostró una nueva interceptación genérica: todos los HEAD 200 con HTML ~12 KB y todos los GET `socket hang up`, incluidos assets neutros.

## Clasificación

`ENVIRONMENT_FAILURE / R4_HOSTING_SECURITY_EDGE_INTERCEPTION_GENERIC`

El producto, Auth, contraseña y membership no se modifican ni se culpan. La evidencia client-side ya no puede identificar el rule ID/directiva exactos.

## STOP_RETRY

Se alcanzó el límite de dos diagnósticos HTTP de la misma familia. No ejecutar un tercero. No reabrir browser/Auth hasta que HostDime corrija el owner server-side y exista evidencia HTTP estática PASS.

## Siguiente acción exacta

Abrir un único ticket técnico de soporte HostDime para `app.aysseguros.com` y pedir:

- revisar Apache/ModSecurity/Imunify/audit logs para la cronología reproducible;
- identificar rule ID, directiva, handler o control exacto;
- determinar por qué los assets JavaScript publicados reciben HTTP 500/intercepción;
- aplicar únicamente una exclusión puntual o corrección del owner demostrado;
- no desactivar ModSecurity/Imunify globalmente.

Tras confirmación de HostDime, ejecutar una sola verificación HTTP-only. Requisito: HTTP 200 + MIME JavaScript + SHA-256 exacto R3 para `core/auth.js`, `core/auth-password-change-v20260805.js`, `core/user-credential-selfservice-v20260805.js` y controles neutros. Solo después se permite una nueva frontera browser/Auth.

## Carriles

- A frontend/UX: congelado, sin cambios.
- B backend/security/Auth: Auth congelado; owner actual hosting/Apache security.
- C datos reales: intacto; cero reimportación/escrituras.

## Prohibido en este cierre

Sin cambio de contraseña, usuarios, memberships, `core/auth.js`, nombres de archivos, paquete, datos, main, merge o deploy.
