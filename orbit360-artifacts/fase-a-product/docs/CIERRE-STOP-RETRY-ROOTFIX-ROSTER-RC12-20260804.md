# Cierre STOP_RETRY — reconciliador de padrón aprobado RC1.2

Fecha: 2026-08-04  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5` draft/open  
Candidata inmutable: `b699ba329960cd830121b57452ce558399aa84fb`

## Estado rector

```text
candidata acumulativa producto + módulos + datos: PASS 22/22
Gate 7.15: PASS 16/16
Auth antirregresión: PASS 16/16
provisión Auth: NO EJECUTADA
memberships creadas: 0
Gate 7.13 post-membership: NO EJECUTADO
snapshot/deploy/browser: NO EJECUTADOS
producción modificada: NO
STOP_RETRY: ACTIVO
```

## Ejecución final autorizada

```text
run: 30908259200
job: 91988390027
artifact: 8891965039
artifactDigest: sha256:a840751f130ccfc614369307863a77f258583287e2c971e73401c06c3d686991
decision: RC12_APPROVED_ROSTER_RECONCILIATION_NO_GO_NO_WRITE
classification inicial: DATA_CONTRACT_FAILURE
```

El censo encontró los siete registros canónicos de asesores y resolvió por nombre a Paula Osorio, Carlos Castro y Samuel Daza, pero los tres registros carecen de correo. El reconciliador exigía que el mismo registro de asesor contuviera el correo, aunque el padrón aprobado ya conserva el correo mediante digest y existe una fuente histórica sellada con los valores aprobados.

Resultado:

```text
advisorStatus direction: missing_email
advisorStatus operations: missing_email
advisorStatus advisor: missing_email
Auth no evaluado
usuarios creados: 0
memberships escritas: 0
deploy intentado: no
```

## Reclasificación de causa raíz

```text
VALIDATOR_STALE
```

Owner funcional:

```text
tools/orbit360-provisionar-roster-aprobado-final-rc12-v20260804.mjs
```

Regla obsoleta:

```text
registro canónico de asesor sin correo => bloquear perfil
```

Regla correcta:

```text
persona canónica única por nombre
+
correo recuperado de source lock aprobado
+
SHA-256 del correo igual al digest vigente
=> identidad reconciliable sin persistir PII
```

La fuente aprobada está bloqueada por:

```text
commit: 34fa84a60ebc38b0035ed664da87ca78aaa73ff7
path: orbit360-platform/runtime-gate-crm-v20260716/rc12-cumulative-candidate-unified-manifest.json
```

El HEAD vigente mantiene únicamente los digests; el correo real no debe volver a versionarse.

## Primer intento de root fix source-only

```text
run: 30908742658
job: 91989947884
Firebase/secretos: no
```

Causa:

```text
PIPELINE_MECHANISM_FAILURE
ReferenceError: APPROVED_SOURCE_COMMIT is not defined
```

La constante real del patcher se llama `SOURCE_COMMIT`. No se modificó el repositorio porque el workflow falló antes del commit.

## Correctivo source-only único

```text
run: 30908887853
job: 91990409321
Firebase/secretos: no
```

La implementación del root fix obtuvo PASS en sus ocho controles:

```text
sourceLockReaderPresent: PASS
sourceLockDigestRequired: PASS
advisorEmailNoLongerRequired: PASS
approvedEmailPrivateOnly: PASS
existingUsersRemainImmutable: PASS
lifecycleResumeBound: PASS
engineResumeBound: PASS
centralRegistryUpdated: PASS
```

También aprobaron:

```text
sintaxis provisioner: PASS
sintaxis engine: PASS
sintaxis entrypoint: PASS
prueba sanitizada: PASS
correo real en archivos activos: 0
Firestore/Auth/browser/deploy: 0
```

## Segunda causa de pipeline

El root fix no llegó a persistirse porque el paso `Exigir delta exacto` ejecutó:

```bash
git diff --name-only
```

Ese comando solo enumeró los cinco archivos rastreados modificados y omitió el JSON nuevo no rastreado:

```text
orbit360-platform/runtime-gate-crm-v20260716/rc12-approved-roster-reconciler-rootfix-static.json
```

El workflow esperaba seis archivos y falló aunque la implementación ya había aprobado.

Clasificación:

```text
PIPELINE_MECHANISM_FAILURE
failureFamily: UNTRACKED_FILE_DELTA_ENUMERATION
```

Owner exacto:

```text
.github/workflows/orbit360-rootfix-approved-roster-reconciler-corrective-v20260804.yml
step: Exigir delta exacto
```

## STOP_RETRY

La etapa source-only falló dos veces. Conforme al contrato rector:

```text
no tercer reintento
no nuevo parche encadenado
no acceso a Firebase
no provisión Auth
no memberships
no Gate 7.13
no snapshot
no deploy
```

## Solución exacta pendiente

La siguiente ejecución no debe rediseñar el reconciliador. Debe hacer exclusivamente:

1. sustituir la enumeración del delta por una que incluya archivos rastreados y no rastreados, por ejemplo:

```bash
{
  git diff --name-only
  git ls-files --others --exclude-standard
} | sort -u
```

2. persistir los cinco archivos modificados y el JSON de prueba que ya obtuvieron PASS;
3. comprobar Gate 7.15.1 antes de secretos;
4. reanudar desde el censo aprobado por source lock y digest;
5. si el mismo censo vuelve a fallar, cerrar sin escritura con el nuevo campo exacto;
6. si pasa, continuar dentro de un solo macrobloque a usuarios faltantes, tres memberships, Gate 7.13, snapshot, Hosting y smoke.

## Integridad

```text
Auth reads: censo sanitizado de 2 usuarios en run 30908259200
Firestore reads: siete asesores + una membership
Auth writes: 0
Firestore writes: 0
usuarios creados: 0
memberships creadas: 0
contraseñas generadas: 0
custom tokens: 0
Hosting deploy: no
rollback: no requerido
reimportación: no
Rules/Functions: no
main/merge: no
Gate 7.11: no
```

## Candidata y datos

Este STOP no modifica la conclusión acumulativa:

```text
Clientes: 430
Aseguradoras: 30
Pólizas: 1,373
Vehículos: 1,032
Recibos esperados: 1,294
Cartera de primas: 673
Cobros: 5
Asesores: 7
pérdida de datos: NO
reimportación requerida: NO
```

## Cloud / Claude / Academia

```text
REPLICABLE_CLAUDE_ACUMULADO:
- source lock aprobado + digest vigente;
- separación entre identidad canónica y correo ausente en directorio;
- validación de delta incluyendo archivos untracked.

BACKEND_PROTEGIDO_NO_CLAUDE:
- correos reales;
- usuarios Auth;
- memberships;
- credenciales temporales;
- UID y advisorId.

ACADEMIA_ACTUALIZAR:
- VALIDATOR_STALE por exigir un campo en la fuente equivocada;
- diferencia entre root fix funcional PASS y mecanismo de persistencia FAIL;
- STOP_RETRY después de dos fallos de etapa.
```

No se envió información externa a Cloud/Claude.
