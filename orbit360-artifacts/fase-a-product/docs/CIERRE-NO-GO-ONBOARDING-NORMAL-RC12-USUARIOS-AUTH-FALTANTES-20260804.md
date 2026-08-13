# Cierre NO_GO — onboarding normal Gravicentra Insurance RC1.2

Fecha operativa: 2026-08-04  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5`, draft/open  
Candidata: `b699ba329960cd830121b57452ce558399aa84fb`  
Baseline acumulativa: `27cb7dfcda8568280ebef15993a953364304f29b`

## 1. Bloque

```text
Gate 7.14
block7.14-rc12-normal-onboarding-close-v20260804
```

Objetivo autorizado:

1. censar de forma sanitizada todos los usuarios Firebase Auth;
2. reconciliarlos con memberships y registros de asesores;
3. crear exactamente tres memberships únicamente si existían usuarios normales inequívocos para Dirección, Operativo y Asesor;
4. continuar a Gate 7.13, snapshot, Hosting y smoke solo después de validar los tres perfiles;
5. detener sin escritura ante cualquier perfil faltante o ambiguo.

## 2. Clasificación

### Resultado de producto y datos

```text
DATA_CONTRACT_FAILURE
```

### Incidencias del pipeline

```text
PIPELINE_MECHANISM_FAILURE — binding inicial de secreto
PIPELINE_MECHANISM_FAILURE — nombre de variable jq del escritor final
```

Ambas incidencias de pipeline fueron corregidas sin repetir el censo ni modificar producto o datos.

## 3. Ejecuciones

### 3.1 Registro contractual

```text
run: 30886891418
resultado: PASS
riesgo: cero secretos, cero Firebase, cero producción
```

### 3.2 Primera ejecución del cierre

```text
run: 30887232625
job: 91921021903
Gate 7.14: PASS 14/14
Auth estático: PASS 16/16
fallo: nombres de secretos no canónicos
clasificación: PIPELINE_MECHANISM_FAILURE
Firebase leído: no
escrituras: 0
deploy: no
```

Causa raíz exacta: el workflow enlazó aliases `SA_*`, pero los secretos vigentes se denominaban `FIREBASE_SERVICE_ACCOUNT_*`. El binding se corrigió y la autorización se reanudó desde la frontera previa a secretos.

### 3.3 Ejecución post-rootfix

```text
run: 30887559372
job: 91922023880
artifact: 8883701550
artifactDigest: sha256:c314685774559607509279374789172b72cb60d50a198dc8392a01ab42a46c57
Gate 7.14: PASS 14/14
Auth estático: PASS 16/16
decisión: RC12_NORMAL_USERS_MISSING_NO_WRITE
```

### 3.4 Root fix del escritor final

```text
run: 30887977077
resultado: PASS source-only
censo repetido: no
Firebase leído: no
producción tocada: no
```

El escritor declaraba `productionMaintained` como argumento jq, pero lo referenciaba como `$production`. El archivo final fue reconstruido únicamente desde el artefacto sanitizado inmutable y luego el owner fue corregido.

## 4. Censo Firebase Auth sanitizado

```text
usuarios Auth totales: 2
usuarios Auth normales válidos: 1
memberships existentes: 1
memberships técnicas: 1
registros de asesores: 7
```

No se expusieron correos, UID, nombres, contraseñas ni credenciales. La evidencia conserva únicamente conteos, estados, hashes vacíos para perfiles no resueltos y categorías contractuales.

## 5. Reconciliación por perfil

| Perfil | Estado | Candidatos inequívocos | Ambigüedad |
|---|---:|---:|---:|
| Dirección | FALTANTE | 0 | no |
| Operativo | FALTANTE | 0 | no |
| Asesor | FALTANTE | 0 | no |

Resultado:

```text
missingProfiles = [direccion, operativo, asesor]
ambiguousProfiles = []
allProfilesResolved = false
distinctUsers = false
advisorBindingResolved = false
```

El único usuario Auth normal válido no tenía evidencia canónica suficiente para asignarlo a ninguno de los tres perfiles. No era lícito inferir su rol por aproximación, reutilizarlo para varios perfiles ni alterar el usuario.

## 6. Causa raíz

```text
Firebase Auth no contiene tres usuarios normales existentes,
habilitados y canónicamente clasificables para los perfiles requeridos.
```

Owner exacto:

```text
Firebase Auth normal users
+
tenants/{tenantId}/members/{uid}
+
fuente canónica de rol/advisorId
```

La causa raíz ya no es el login fijo ni la membership técnica. Es la ausencia de un censo productivo suficiente de identidades normales con vínculos inequívocos de perfil.

## 7. Decisión de seguridad

El sistema actuó fail-closed:

- no creó ninguna membership;
- no reutilizó la identidad técnica;
- no convirtió al único usuario normal en tres perfiles;
- no modificó Auth;
- no modificó correos, proveedores, contraseñas o UID;
- no infirió `advisorId`;
- no ejecutó Gate 7.13;
- no tomó snapshot operativo;
- no desplegó Hosting;
- no abrió navegador;
- no tocó producción.

## 8. Integridad

```text
Firestore reads: sí, únicamente memberships y fuentes de asesores
Firebase Auth reads: sí, metadatos sanitizados de 2 usuarios
Firestore writes: 0
Auth writes: 0
usuarios creados: 0
usuarios actualizados: 0
membership creates: 0
contraseñas leídas: 0
contraseñas modificadas: 0
snapshot: no
Gate 7.13: no
Hosting deploy: no
browser smoke: no
reimportación: no
Rules: no
Functions: no
main: no
merge: no
Gate 7.11: no
```

Producción continúa sin RC1.2. La candidata permanece acumulativa e inmutable, pero el acceso normal no puede cerrarse hasta resolver las identidades.

## 9. Carriles

### Carril A — frontend / UX / Academia

```text
avance visible: ninguno nuevo en producto
estado: preservado
```

### Carril B — backend / seguridad / Auth / Orbit.store

```text
Gate 7.14: creado y PASS
censo Auth: ejecutado
fail-closed: PASS
onboarding: detenido antes de escritura
```

### Carril C — datos reales / migración A&S

```text
datos operativos: no modificados
memberships: no modificadas
reimportación: no ejecutada
```

## 10. Candidata acumulativa

La auditoría anterior continúa vigente:

```text
31 rutas
0 fallos de módulos
paridad completa baseline/candidata/rama viva
GO_STATIC_CUMULATIVE_MODULE_PARITY_WITH_MATURITY_GAPS
```

Este cierre no modifica esa conclusión. RC1.2 sigue siendo la candidata acumulativa de código, pero no es publicable con acceso normal por ausencia de identidades productivas.

## 11. Pendiente exacto

Se requiere resolver, con fuente explícita y sin inferencias:

1. un usuario Auth normal para Dirección;
2. un usuario Auth normal para Operativo;
3. un usuario Auth normal para Asesor, vinculado a `advisorId` canónico;
4. que los tres sean distintos, estén habilitados y tengan proveedor válido;
5. que sus roles se documenten antes de crear memberships.

El único usuario normal actualmente visible no puede asignarse automáticamente a ningún perfil.

## 12. Siguiente acción exacta

La siguiente frontera ya no es crear memberships. Primero debe autorizarse un bloque de **provisión y clasificación de identidades Auth normales** que:

- identifique quiénes deben representar Dirección, Operativo y Asesor;
- utilice correos y roles aprobados por A&S;
- active o cree únicamente los usuarios faltantes;
- no cambie la identidad técnica;
- deje auditoría y rollback;
- después retome la creación de memberships y el cierre de RC1.2.

No debe reintentarse Gate 7.14 con el estado actual, porque la misma causa de datos volvería a fallar.
