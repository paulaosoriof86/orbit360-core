# Cierre NO_GO — Gravicentra Insurance RC1.2 / membership Dirección

Fecha operativa: 2026-08-03  
Tenant: `alianzas-soluciones`  
Proyecto: `ays-orbit-360-lab`  
Candidata: `b699ba329960cd830121b57452ce558399aa84fb`  
Rama release: `release/gravicentra-insurance-rc1-2-membership-auth-20260803`

## Decisión

```text
RC12_NORMAL_IDENTITIES_NO_GO
```

RC1.2 no fue desplegada. La versión pública anterior permaneció intacta.

## Evidencia observable

```text
primer run: 30877460688
primer job: 91891705926
clasificación: PIPELINE_MECHANISM_FAILURE
etapa: antes de secretos
causa: resolución incorrecta de la ruta del JSON del gate
resultado del gate: PASS 14/14
secretos leídos: no
Firebase leído: no
deploy: no
```

La misma autorización se reanudó desde la frontera pre-risk, sin repetir producto ni desplegar:

```text
run: 30877589549
job: 91892068434
artifact: 8880091323
artifact digest: sha256:b45e69e3d256f075ca67c8a4eebacff3db03aa6eff1b152a02c6885701318268
gate antirregresión: PASS 14/14
resultado: ACTIVE_NORMAL_MEMBERSHIP_NOT_FOUND_DIRECCION
```

## Clasificación correcta

La ejecución emitió `SECURITY_FAILURE` porque no permitió sustituir una identidad normal por una identidad técnica. Para la remediación, el hallazgo también debe registrarse como:

```text
DATA_CONTRACT_FAILURE
con impacto de seguridad
```

No es un defecto del frontend RC1.2: Auth, Store y Guard aprobaron el gate estático y ya validan por membership.

## Causa raíz comprobada

Dentro de `tenants/alianzas-soluciones/members`, combinada con Firebase Auth, no se pudo resolver una identidad normal de perfil Dirección que cumpliera simultáneamente:

1. membership existente;
2. tenant correcto;
3. estado `active` o `activo`;
4. roles no vacíos;
5. `defaultRole` y `activeRole` incluidos en `roles`;
6. rol activo canónico `SuperAdmin` o `AdminTenant`;
7. usuario Firebase existente y no deshabilitado;
8. correo presente;
9. al menos un proveedor de acceso válido;
10. identidad distinta de la identidad técnica excluida.

La evidencia sanitizada conserva solamente el resultado agregado y, deliberadamente, no almacena UID, correo ni valores de las memberships. Por ello todavía no distingue cuál de los diez criterios específicos es el que falta en el documento de Dirección.

## Owner exacto

```text
tenants/{tenantId}/members/{uid}
+
Firebase Auth user con el mismo uid
```

No corresponde modificar `core/auth.js`, `data/store-firestore-lab.local.js` ni `core/backend-lab-auth-guard.js` para ocultar el problema. Tampoco corresponde crear una cuenta paralela, volver a aceptar la identidad técnica o reducir el gate.

## Seguridad y datos

```text
Firestore reads: sí, únicamente memberships
Auth reads: sí, únicamente metadatos de usuarios
Firestore writes: 0
Auth writes: 0
usuarios creados: 0
usuarios modificados: 0
contraseñas leídas: 0
contraseñas modificadas: 0
tokens creados: 0
snapshot de cartera: no ejecutado
deploy Hosting: no ejecutado
rollback: no requerido
Rules: no
Functions: no
reimportación: no
main: no
merge: no
```

## Correctivo preparado, no ejecutado

Se agregó el diagnóstico read-only sanitizado:

```text
tools/orbit360-diagnosticar-memberships-normales-v20260803.mjs
```

Su única función será contar, sin exponer identidades, las causas de rechazo:

- membership sin UID;
- tenant inconsistente;
- estado ausente o inactivo;
- roles ausentes;
- rol default o activo inválido;
- alias no canónico;
- asesor sin `advisorId`;
- usuario Auth inexistente;
- usuario deshabilitado;
- correo ausente;
- proveedor ausente;
- identidad técnica excluida.

Este diagnóstico no escribe Firebase, no crea usuarios, no toca contraseñas y no despliega.

## Cloud / Claude / Academia

Nuevo patrón reusable:

```text
CL-128 — Un gate de Auth no sustituye el contrato de membership.
CL-129 — El smoke productivo debe usar identidades normales de cada perfil.
CL-130 — El diagnóstico de acceso debe separar frontend, membership y proveedor Auth.
CL-131 — Un NO_GO de identidad se corrige en el owner del contrato, no debilitando Auth/Store/Guard.
CL-132 — La evidencia de identidades se conserva agregada y sanitizada.
```

Estado externo:

```text
documentado en core: sí
enviado a Cloud/Claude: no
incorporado al prototipo comercializable: pendiente
Academia actualizada conceptualmente: sí
```

## Siguiente acción exacta

Ejecutar una sola vez el diagnóstico sanitizado read-only. Con su resultado se podrá preparar un único diff sobre la membership del usuario existente de Dirección, sin crear usuarios ni tocar contraseñas. Esa eventual escritura requiere autorización expresa separada porque el macrobloque RC1.2 prohibía escrituras y ya quedó consumido.
