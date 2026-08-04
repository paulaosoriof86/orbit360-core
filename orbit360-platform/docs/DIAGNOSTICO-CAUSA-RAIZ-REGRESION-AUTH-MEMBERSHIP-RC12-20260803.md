# Diagnóstico de causa raíz — regresión de autenticación por identidad técnica

Fecha operativa: 2026-08-03  
Producto: Gravicentra Insurance / Orbit 360  
Tenant prioritario: `alianzas-soluciones`

## 1. Incidente

RC1.1 mostró datos reales, pero únicamente permitía el ingreso de una identidad técnica histórica. Los usuarios normales, incluida Dirección, eran rechazados aunque la arquitectura de membership ya existía.

## 2. Causa raíz de la regresión fuente

La candidata acumulativa combinó:

- el owner vigente de membership `tenants/{tenantId}/members/{uid}`;
- una versión histórica de `core/auth.js`;
- una versión histórica de `data/store-firestore-lab.local.js`;
- una versión histórica de `core/backend-lab-auth-guard.js`.

Los tres archivos históricos fijaban correo, UID, rol Dirección y asesor. No existía un gate negativo que impidiera reintroducirlos al reconstruir la candidata.

Clasificación:

```text
FUNCTIONAL_DEFECT
SECURITY_FAILURE
VALIDATOR_STALE
PIPELINE_MECHANISM_FAILURE
```

## 3. Root fix RC1.2

RC1.2 sustituyó los tres owners por versiones basadas en:

```text
Firebase Auth
+
membership activa del tenant
+
roles/scopes/advisorId de la membership
```

El gate permanente valida 14 controles y bloquea identidad técnica, UID fijo, rol/asesor forzado, fallback seed, pérdida de API o scripts fuera del contrato.

Candidata:

```text
release/gravicentra-insurance-rc1-2-membership-auth-20260803
b699ba329960cd830121b57452ce558399aa84fb
```

## 4. Resultado del macrobloque autorizado

### 4.1 Primera ejecución

```text
run: 30877460688
job: 91891705926
gate: PASS 14/14
fallo: ruta incorrecta del JSON de evidencia
clasificación: PIPELINE_MECHANISM_FAILURE
secretos leídos: no
Firebase leído: no
deploy: no
producción tocada: no
```

La ruta se corrigió y la misma autorización se reanudó desde la frontera pre-risk.

### 4.2 Reanudación

```text
run: 30877589549
job: 91892068434
artifact: 8880091323
digest: sha256:b45e69e3d256f075ca67c8a4eebacff3db03aa6eff1b152a02c6885701318268
gate: PASS 14/14
resultado: ACTIVE_NORMAL_MEMBERSHIP_NOT_FOUND_DIRECCION
decisión: RC12_NORMAL_IDENTITIES_NO_GO
```

El flujo se detuvo antes de snapshot y deploy.

## 5. Segunda causa raíz: contrato de datos de acceso

Los owners de código ya estaban correctos, pero no se pudo resolver una identidad normal de Dirección que cumpliera todos estos criterios:

1. documento de membership existente;
2. UID presente;
3. tenant `alianzas-soluciones`;
4. estado `active` o `activo`;
5. roles no vacíos;
6. `defaultRole` incluido en roles;
7. `activeRole` incluido en roles;
8. rol activo canónico `SuperAdmin` o `AdminTenant`;
9. usuario Firebase con el mismo UID;
10. usuario no deshabilitado;
11. correo presente;
12. proveedor de acceso presente;
13. identidad diferente de la identidad técnica excluida.

Clasificación de ejecución:

```text
SECURITY_FAILURE
```

Clasificación de remediación:

```text
DATA_CONTRACT_FAILURE
con impacto de seguridad
```

## 6. Owner exacto

```text
tenants/{tenantId}/members/{uid}
+
Firebase Auth user con el mismo uid
```

No son owners del fallo:

```text
core/auth.js
data/store-firestore-lab.local.js
core/backend-lab-auth-guard.js
```

Esos tres owners aprobaron el gate 14/14.

## 7. Por qué no se realizó deploy

El contrato autorizaba:

```text
membership/Auth read-only
→ snapshot
→ Hosting deploy
→ navegador 3 perfiles
```

Al fallar la primera etapa de identidad normal, el flujo no podía avanzar sin degradar seguridad. No se generaron tokens, no se tomó snapshot y no se desplegó.

## 8. Integridad

```text
Firestore reads: membership solamente
Auth reads: metadatos solamente
Firestore writes: 0
Auth writes: 0
usuarios creados: 0
usuarios modificados: 0
contraseñas leídas: 0
contraseñas modificadas: 0
tokens creados: 0
Hosting deploy: 0
rollback: no requerido
Rules: no
Functions: no
reimportación: no
main: no
merge: no
```

## 9. Diagnóstico exacto preparado

Archivo:

```text
tools/orbit360-diagnosticar-memberships-normales-v20260803.mjs
```

Produce un censo agregado y sanitizado por causa de rechazo, sin conservar correos ni UID. Distingue entre ausencia de membership, inconsistencia de roles, estado inactivo, UID sin Auth, usuario deshabilitado, proveedor ausente e identidad técnica excluida.

No se ejecutó porque la autorización original quedó consumida y prohibía abrir otra lectura o escritura fuera del macrobloque.

## 10. Solución correcta

1. Ejecutar una única lectura sanitizada del contrato membership/Auth.
2. Identificar el criterio exacto que impide resolver Dirección.
3. Preparar diff mínimo sobre la membership del usuario existente.
4. No crear usuarios paralelos ni cambiar contraseñas.
5. Ejecutar una operación idempotente con before/after y rollback si la corrección requiere escritura.
6. Solo después reintentar RC1.2 desde la misma candidata o una candidata incremental sellada.

## 11. Prevención permanente

- Gate estático antirregresión antes de secretos.
- Gate de contrato membership/Auth antes de snapshot/deploy.
- Smoke con identidades normales de Dirección, Operativo y Asesor.
- Evidencia agregada sin PII.
- Prohibición de cuentas técnicas como sustituto de usuarios reales.
- Source, workflow, documentación, Cloud/Claude y Academia deben actualizarse juntos.
