# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/orbit360-live-state-v1.json`;
2. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
3. último workflow/evidencia indicado por `lastEvidence`;
4. `orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`;
5. `orbit360-platform/docs/CIERRE-R4-HTTP-ONLY-SENSITIVE-ASSET-PATTERN-20260815.md`;
6. `orbit360-platform/CHANGELOG-R4-GOLIVE-20260814.md`.

No usar memoria ni documentación histórica como sustituto del live-state.

## Estado vivo · R4 PUBLICADO / BLOQUEO EN CAPA APACHE-SEGURIDAD · 2026-08-15

```text
R1/R2/R3: CERRADOS
app.aysseguros.com: PUBLICADO, login visible
paquete: exacto R3 certificado, sin rebuild
R4 browser frontier #1: no válida por timeout del harness
rootfix harness source-only: PASS
R4 browser frontier #2: FAIL clasificado antes de login
HTTP-only diagnosis: PASS como mecanismo
browser R4: REFROZEN SOURCE-ONLY
Auth/contraseña: NO EVALUADOS
bloqueo: Apache/hosting devuelve 500 a assets de auth/credenciales
avance: 100% funcional / 75% técnico / 67% gates
```

## Evidencia HTTP-only

Run `31908342723`, job `95069516527`, HEAD `474e022382920382f6e0f408038d4734908521ec`.

PASS:

- gate canónico;
- watchdog source-only;
- requests HTTP no-store;
- cero secretos;
- cero datos;
- cero browser;
- cero writes;
- cero deploy/rebuild.

Assets neutros servidos correctamente y con SHA-256 exacto del source R3:

- `core/config.js` → HTTP 200;
- `core/legal.js` → HTTP 200;
- `core/access-scope.js` → HTTP 200.

Assets ligados a autenticación/credenciales:

- `core/auth.js` → HEAD 500 / GET 500;
- `core/auth-password-change-v20260805.js` → HEAD 500 / GET 500;
- `core/user-credential-selfservice-v20260805.js` → HEAD 500 / GET 500.

Los tres 500 son servidos por Apache como HTML de 712 bytes y comparten la misma firma SHA-256. El paquete R3 no contiene `orbit360-platform/.htaccess`.

Clasificación vigente:

`ENVIRONMENT_FAILURE / R4_CORE_STATIC_DELIVERY_BROADER_FAILURE`

Interpretación operativa: el owner está en la capa Apache/seguridad/handler del hosting para assets sensibles. La evidencia todavía no identifica el ID exacto de una regla ModSecurity ni autoriza desactivar seguridad.

## Siguiente acción exacta

Mantener el browser congelado. Obtener evidencia del servidor para los 500 reproducibles de los tres assets sensibles: regla ModSecurity/Apache exacta, directiva, handler o metadata/permisos. Preferir whitelist de la regla falsa positiva únicamente para `app.aysseguros.com`; no desactivar ModSecurity globalmente.

Si cPanel expone `Security > ModSecurity`, revisar el estado del dominio sin modificarlo todavía. Si no expone el rule/audit log, escalar el caso reproducible a HostDime para que identifique la regla exacta.

Después del rootfix del hosting se exige HTTP 200 + SHA-256 R3 exacto para todos los assets afectados antes de cualquier nuevo browser/Auth.

Sin cambio de contraseña, usuarios, memberships, `core/auth.js`, paquete, datos, main ni merge.
