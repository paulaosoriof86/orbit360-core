# CHECKPOINT R4 · POST-PUBLISH AUTH + E2E · BEFORE BROWSER · 2026-08-15

Estado: **PAQUETE PUBLICADO MANUALMENTE / E2E PRODUCTIVO PENDIENTE**.

Rama: `ays/backend-tenant-lab-v99-20260703`  
PR #5: draft/open · sin merge  
R1/R2/R3: cerrados y congelados.

## Evidencia de publicación aportada por Paula

El paquete certificado R3 fue cargado y extraído manualmente en:

`/home/ayssegur/public_html/app.aysseguros.com`

La captura posterior al extract confirmó directamente en el document root:

- `index.html`;
- `core/`;
- `data/`;
- `docs/`;
- `modules/`;
- `styles/`;
- `product-runtime-config.js`;
- `sw.js`;
- `orbit360-package-manifest.json`;
- conservación de `.htaccess`, `.user.ini`, `php.ini`, `cgi-bin` y `.well-known`.

`https://app.aysseguros.com` carga el login productivo de Orbit 360.

Paquete inmutable:

- ZIP: `orbit360-fase-a-product-r3-4f70f0dd6e87.zip`;
- SHA256: `4fd52a748fa130fd069b2d2684e1944369164aeb0646fe728067dd7b4ce29e69`;
- source head: `4f70f0dd6e870e8c7443a7638a9dc6e954eace1b`;
- fileCount: 194.

No se autoriza reconstruir ni sustituir el paquete para resolver Auth o hosting.

## Observación de Auth humana

Paula intentó ingresar con su correo administrativo y una contraseña almacenada localmente. La UI devolvió el mensaje genérico:

`No fue posible iniciar sesión. Verifica tu usuario y contraseña e intenta nuevamente.`

Ese mensaje **no clasifica la causa**. El owner productivo en el paquete ejecuta, en orden:

1. Firebase Auth con email/password;
2. requisito `emailVerified=true`;
3. bootstrap productivo read-only;
4. membership activa por UID;
5. tenant derivado de membership;
6. rol activo/asignado;
7. store `ready-read-only`.

No se realizarán más intentos manuales con la contraseña personal hasta clasificar automáticamente.

El enlace `Limpiar sesión` no es recuperación de contraseña; el paquete productivo no contiene `sendPasswordResetEmail` ni un owner de reset de contraseña en esa superficie.

## Actor automatizado protegido ya existente

Se reutiliza el patrón R3, no se crea otro usuario:

- service account mediante secrets existentes del workflow R3;
- password mediante `ORBIT360_LAB_LOGIN_PASSWORD`;
- `tools/orbit360-m6-resolve-smoke-identity-readonly-v20260730.mjs` selecciona exactamente 1 actor elegible;
- exige usuario Auth existente, habilitado, `emailVerified=true`, membership `active`, y roles asignados `Dirección + Operativo + Asesor`;
- exporta el email solo al entorno del runner;
- cero escrituras Firestore/operacionales.

Los valores de secretos no se imprimen ni se incorporan a evidencia.

## Frontera autorizada

La autorización R4 ya otorgada cubre el E2E productivo final. La próxima ejecución será **una sola frontera de navegador read-only** contra `https://app.aysseguros.com`.

Antes de secretos/browser debe pasar:

`node tools/orbit360-validar-gate-contracts-v20260717.mjs fase-a-ops-leads-crm-release-lab-v20260812`

El gate se ejecuta en su perfil source-only y debe demostrar cero secretos/runtime/browser/deploy/producción en preflight.

## Secuencia de la frontera

1. gate canónico source-only;
2. validar fuente/harness con `node --check`;
3. solo con PASS instalar Playwright/Firebase Admin;
4. resolver el actor smoke existente de forma read-only;
5. abrir `https://app.aysseguros.com` en contexto limpio;
6. leer `orbit360-package-manifest.json` desde el dominio y exigir source head + fileCount + flags certificados;
7. login real con secretos protegidos;
8. diferenciar fallo de Auth HTTP, `emailVerified`, membership, tenant o activación sin exponer PII/secrets;
9. si Auth PASS: exigir tenant `alianzas-soluciones`, store `ready-read-only`, required 7/7, 430 clientes y 30 aseguradoras bajo vista Dirección;
10. validar Dirección desktop, Operativo tablet y Asesor móvil mediante el owner multirol existente, sin escribir membership;
11. validar Inicio y rutas críticas permitidas por rol; una ruta no permitida debe bloquearse de forma honesta;
12. cero pageErrors/console errors relevantes, cero fallos HTTP críticos, cero copy técnico y cero endpoints de escritura inesperados;
13. evidencia sanitizada y cierre documental.

## Regla de clasificación

La observación humana permanece **UNCLASSIFIED_PENDING_AUTOMATED_DIAGNOSTIC** hasta la frontera.

Si falla:

- rechazo de `signInWithPassword` con actor smoke válido → clasificar Auth/credencial protegida o configuración del proveedor según evidencia;
- Auth válido + email no verificado → `DATA_CONTRACT_FAILURE`;
- Auth válido + membership ausente/inactiva/rol inválido → `DATA_CONTRACT_FAILURE`;
- Auth/membership válidos + bootstrap/render falla → `FUNCTIONAL_DEFECT` o `PIPELINE_MECHANISM_FAILURE` según owner;
- error de dominio/TLS/red → `ENVIRONMENT_FAILURE`;
- vulneración de aislamiento/escritura → `SECURITY_FAILURE`.

Misma familia dos veces: `STOP_RETRY`.

## Avance antes de la frontera

- readiness funcional: 100%;
- avance técnico: 75%;
- gates finales: 67% (2/3);
- R4 publicación manual: completada;
- POST_GO_LIVE_SMOKE_PASS: pendiente.
