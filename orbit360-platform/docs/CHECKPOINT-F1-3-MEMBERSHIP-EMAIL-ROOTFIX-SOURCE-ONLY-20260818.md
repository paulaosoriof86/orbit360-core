# CHECKPOINT F1.3 — MEMBERSHIP EMAIL ROOTFIX SOURCE-ONLY PASS

Fecha: 2026-08-18 15:52 GT
Proyecto: Orbit 360 / A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open · sin main/merge

## Estado de entrada

F1.2B quedó consumido mediante run `32175674293` sobre source HEAD `811395c09826b1f69d76af12bbaa73e7377c8f35`.

La observación sanitizada del bootstrap aisló el primer error interno real:

`membership_invalid:email_invalido`

Evidencia runtime:
`orbit360-platform/runtime-gate-crm-v20260716/r4-production-readonly-smoke-run-32175674293.json`

Invariantes de esa ejecución:
- Auth firmado y email verificado;
- membership disponible/activa;
- tenant correcto;
- runtime/store/router no iniciados;
- bootstrap `phase=blocked`;
- Firestore/Auth/operational writes = 0;
- deploy/rebuild = 0.

## Causa raíz F1.3

Clasificación final: `VALIDATOR_STALE`.

Subcausa: `MEMBERSHIP_EMAIL_REQUIRED_STALE_AUTH_IDENTITY_OWNERSHIP`.

Evidencia de owners:
- `core/access-role-session-owner-v20260728.js` no exige email en membership;
- `core/auth.js` obtiene el correo desde Firebase Auth;
- `tools/orbit360-auth-paula-membership-readonly-reconcile-v20260817.mjs` acepta `email/correo` ausente y, si existe, exige que coincida con Auth;
- `core/membership-multirol-contract-p0.js` conservaba la regla anterior que exigía siempre un email válido;
- `core/backend-product-readonly-bootstrap-p0.js` delegaba en ese contrato y por eso produjo el bloqueo observado.

No es un fallo de contraseña, usuario, membership inexistente, tenant, HostDime, datos, Firestore ni Auth.

## Rootfix aplicado

Commits source-only:
- `a808e13d69dcb687f488be7e17411796eaec3509` — contrato multirol: email opcional; formato se valida solo si está presente; Auth declarado owner de identidad email.
- `b050d5a1a9861f898d2bb50d1bcc5c26beb72e9b` — bootstrap: si membership trae email, debe coincidir con Auth; si lo omite, Auth sigue siendo la fuente canónica.
- `01fbfc9372e6a6987e70c8a0522322d18109b333` — smoke ampliado con casos específicos de ownership de email.
- `24a36d216f7f7baa407bae03f8c8a965c05fe4af` — workflow source-only actualizado para validar contrato + effective owner + bootstrap y persistir evidencia sanitizada.

## Evidencia source-only

Commit de evidencia: `7e2123f91d1cbf518a92197b6e24fed9ae29c65c`.

Archivo:
`orbit360-platform/runtime-gate-crm-v20260716/f1-3-membership-email-ownership-source-only-v20260818.json`

Resultado:
- `ok=true`;
- `status=F1_3_MEMBERSHIP_EMAIL_OWNERSHIP_SOURCE_ONLY_PASS`;
- `failed=[]`;
- `staticViolations=[]`;
- membership sin email = PASS;
- email presente con formato inválido = BLOCK;
- email ausente + Auth válido = PASS;
- email presente igual a Auth = PASS;
- email presente distinto de Auth = BLOCK;
- writeAuthorized=false;
- writeExecuted=false.

## Riesgo y entorno

En F1.3:
- browser/runtime: 0;
- secrets: 0;
- Firebase/Auth/Firestore reads: 0;
- Firebase/Auth/Firestore/operational writes: 0;
- deploy: 0;
- rebuild/candidata: 0;
- contraseña/reset/usuarios: 0;
- memberships/datos: 0;
- main/merge: 0.

Paquete público R4S9C permanece inmutable.

## Progreso

Subfases F1 nombradas:
- F1.1 owner/observer source: CLOSED;
- F1.2A observer self-test: CLOSED;
- F1.2B single sanitized runtime observation: CLOSED/CONSUMED;
- F1.3 owner rootfix + source/static/synthetic: CLOSED/PASS;
- F1.4 attribution close + single runtime confirmation frontier: PENDING.

Seguimiento interno por hitos: `4/5 = 80%`.

Por regla del plan congelado, F1 no suma su peso global hasta cerrar Definition of Done:
- ruta inmediata a producción cerrada: 20%;
- programa integral cerrado: 10%.

## Impacto Claude / Academia

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE` para implementación; patrón reusable acumulable: identidad de email pertenece a Auth y membership no debe duplicar obligatoriamente el correo.

Academia: `ACADEMIA_ACTUALIZAR` — ejemplo de `VALIDATOR_STALE`, ownership de identidad y por qué no se corrigen datos para satisfacer un validador antiguo.

## Siguiente acción exacta

`F1_4_SINGLE_RUNTIME_ROOTFIX_CONFIRMATION`.

Solo después de autorización explícita de runtime/browser:
1. ejecutar primero el gate-contract validator;
2. usar un request nuevo, único, inmutable y single-use; no reutilizar `32175674293`;
3. ejecutar una sola frontera productiva read-only contra la misma ruta observada;
4. comprobar que desaparece `membership_invalid:email_invalido` y capturar fase/error siguiente o PASS;
5. cero deploy/rebuild, cero writes, cero resets/usuarios/membership/data changes;
6. detener inmediatamente y sincronizar live-state/PR/README/checkpoint.

Si reaparece la misma familia después del rootfix, `STOP_RETRY`; no tercer intento equivalente.
