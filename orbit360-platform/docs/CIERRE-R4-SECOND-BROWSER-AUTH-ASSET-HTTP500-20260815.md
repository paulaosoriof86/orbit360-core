# CIERRE R4 · SEGUNDA FRONTERA PRODUCTIVA · AUTH ASSET HTTP 500 · 2026-08-15

Estado: **FRONTERA 2 CERRADA / FAIL CLASIFICADO / BROWSER REFROZEN SOURCE-ONLY**.

Rama: `ays/backend-tenant-lab-v99-20260703`  
PR #5: draft/open · sin merge  
R1/R2/R3: cerrados y congelados.  
Producto/paquete: sin cambios.

## Objetivo de la frontera

Ejecutar una única frontera productiva read-only con el harness R4 recuperado para clasificar, en orden, manifest → `core/auth.js` → login HTTP → Auth → `emailVerified` → membership → tenant → runtime → Dirección/Operativo/Asesor → rutas.

## Activación

Commit de activación:

`9150d249e6eeeb1962d0831a541e18737e35b7e3`

Workflow:

`Orbit360 R4 Production Readonly Smoke 20260815`

Run `31907938110`  
Job `95068560384`

## PASS antes del fallo

- canonical source gate: PASS;
- instalación Playwright/Firebase Admin: PASS;
- binding de secretos protegidos: PASS;
- identity resolver read-only: PASS;
- `eligibleSmokeIdentityCount=1`;
- `authUserCount=9`;
- `membershipCount=8`;
- roles requeridos presentes;
- resolver Firestore writes `0`;
- resolver operational writes `0`;
- navegación a `https://app.aysseguros.com`: HTTP 200;
- formulario de login visible;
- manifest: HTTP 200;
- manifest status: `FASE_A_PRODUCT_R3_DURABLE_PACKAGE_CERTIFIED`;
- manifest sourceHead: exacto R3;
- manifest fileCount: `194`.

## Primer fallo terminal válido

El primer stage que falla es:

`auth-asset-validated`

Resultado del asset:

- recurso: `/core/auth.js`;
- HTTP status: `500`;
- SHA-256 publicado: no válido para comparación por respuesta 500;
- `sha256Matches=false`;
- elapsed total hasta clasificación: `2386 ms`.

Clasificación:

`ENVIRONMENT_FAILURE / R4_PUBLISHED_AUTH_ASSET_MISMATCH`

El browser se cerró correctamente en cleanup.

## Lo que esta evidencia descarta

La corrida no envió credenciales al endpoint de login:

- `authHttp.seen=false`;
- contraseña no evaluada;
- `emailVerified` no evaluado;
- membership browser-side no evaluada;
- runtime no evaluado;
- roles/rutas no evaluados.

Por tanto, esta corrida **no demuestra**:

- contraseña incorrecta;
- usuario Auth inválido;
- email no verificado;
- membership faltante/inactiva;
- tenant incorrecto;
- defecto funcional de Inicio/Cliente 360/Aseguradoras/Ops/Leads.

El resolver previo sí demuestra que existe exactamente un actor elegible read-only y que conserva los roles requeridos.

## Integridad y seguridad

Artifact:

`9252867826`

Digest:

`sha256:854906ce4618e24f1c1c7c004ecf608b5919849637fdac1c1a8104a4299951e5`

- Firestore writes: `0`;
- Auth writes: `0`;
- operational writes: `0`;
- contiene PII: no;
- contiene secretos: no;
- deploy: no;
- rebuild: no.

## Refreeze anti-bucle

Commit:

`6c15b7ccaee4a56be50912148470949e9a28317b`

Control run `31908033440`, job `95068778079`: **SUCCESS source-only**.

- canonical gate PASS;
- watchdog PASS;
- install skipped;
- secrets skipped;
- identity skipped;
- browser skipped.

No existe autorización operativa para otro browser hasta cerrar el diagnóstico HTTP del asset.

## Causa raíz actual

La causa raíz todavía no está reducida al sub-owner final del hosting, pero sí está clasificada por capa:

`ENVIRONMENT_FAILURE`

El bloqueo ocurre **antes de Auth**, en la entrega HTTP de `/core/auth.js` desde producción.

No se debe corregir contraseña, usuario, membership ni código Auth para resolver este hallazgo.

## Siguiente acción exacta

Mantener el workflow R4 congelado source-only y diagnosticar el HTTP 500 sin secretos ni browser login:

1. request directo no-store a `/core/auth.js`;
2. comparar status/headers/body sanitizado con otros assets estáticos hermanos bajo `/core`;
3. comparar archivo publicado contra source/paquete R3 certificado cuando el transporte permita leerlo;
4. determinar si el owner es regla/handler/security policy/permisos del hosting o integridad/entrega del archivo;
5. corregir únicamente el owner demostrado;
6. exigir evidencia HTTP/estática PASS antes de cualquier nueva frontera browser.

Prohibido por ahora: reset de contraseña, crear usuarios, editar memberships, modificar `core/auth.js`, rebuild del paquete, reimportación, main o merge.

## Avance

Permanece:

- readiness funcional: 100%;
- avance técnico: 75%;
- gates finales: 67% (2/3);
- R4: publicación completada / HTTP asset blocker clasificado / `POST_GO_LIVE_SMOKE_PASS` pendiente.
