# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/orbit360-live-state-v1.json`;
2. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
3. último workflow/evidencia indicado por `lastEvidence`;
4. `orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`;
5. `orbit360-platform/docs/CIERRE-R4-HOSTDIME-SERVER-SIDE-ESCALATION-20260815.md`;
6. `orbit360-platform/CHANGELOG-R4-GOLIVE-20260814.md`.

No usar memoria ni documentación histórica como sustituto del live-state.

## Estado vivo · R4 PUBLICADO / HOSTDIME SERVER-SIDE EVIDENCE REQUIRED · 2026-08-15

```text
R1/R2/R3: CERRADOS
app.aysseguros.com: PUBLICADO, login visible
paquete: exacto R3 certificado, sin rebuild
R4 browser #1: inválido por timeout del harness
rootfix harness source-only: PASS
R4 browser #2: FAIL antes de login; auth.js HTTP 500
HTTP-only #1: assets neutros 200+SHA R3; tres assets auth/credenciales 500 Apache idéntico
HTTP-only #2: capa Apache/seguridad interceptó incluso neutros; HEAD 200 HTML ~12 KB / GET socket hang up
cPanel: ModSecurity no expuesto; Imunify sin WAF/Incidents; Errores solo muestra AH01630 sobre php.ini, no auth.js
browser R4: REFROZEN SOURCE-ONLY
Auth/contraseña: NO EVALUADOS
avance: 100% funcional / 75% técnico / 67% gates
```

## Cierre anti-bucle

Se alcanzaron dos diagnósticos HTTP de la misma familia. No se ejecuta un tercero y no se reabre browser/Auth.

Clasificación vigente:

`ENVIRONMENT_FAILURE / R4_HOSTING_SECURITY_EDGE_INTERCEPTION_GENERIC`

La evidencia de cPanel visible no identifica la regla/directiva que produce el fallo de `auth.js`; los mensajes `AH01630` observados corresponden a accesos denegados a `php.ini` y no se reutilizan como prueba del defecto Orbit.

## Siguiente acción exacta

Escalar una sola incidencia técnica a HostDime para `app.aysseguros.com` y solicitar inspección server-side de Apache/ModSecurity/Imunify/audit logs. Deben identificar el rule ID, directiva, handler o control exacto que produce el HTTP 500/intercepción sobre los assets JavaScript publicados y aplicar únicamente una corrección puntual del falso positivo o owner demostrado.

No desactivar ModSecurity/Imunify globalmente. No cambiar contraseña, usuarios, memberships, `core/auth.js`, nombres de archivos, paquete, datos, main ni merge.

Después del fix de hosting se exige una sola verificación HTTP-only: HTTP 200, MIME JavaScript y SHA-256 exacto del R3 en todos los assets afectados. Solo con ese PASS se puede volver a abrir el browser/Auth.
