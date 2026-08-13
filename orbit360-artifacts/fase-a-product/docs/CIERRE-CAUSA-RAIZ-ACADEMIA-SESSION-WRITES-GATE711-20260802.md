# Cierre de causa raíz — Gate 7.11 · escrituras de Academia por cambio de rol

Fecha: 2026-08-02  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block7-canonical-runtime-cumulative-visual-lab-v20260801`

## Resultado ejecutivo

La causa raíz funcional fue identificada y corregida en una sola capa.

```text
Clasificación: FUNCTIONAL_DEFECT
Owner: orbit360-platform/data/academia-v1230-operational-directory-v20260722.js
Función: apply
Trigger inválido: orbit:session
```

Cada cambio entre Dirección, Operativo y Asesor reejecutaba la siembra de contenido operativo de Academia.

La ejecución diagnóstica capturó 15 intentos bloqueados:

```text
9 insert → lecciones
3 insert → evaluaciones
3 update → config
```

Equivalían a cinco mutaciones automáticas por cada uno de los tres roles.

Ninguna llegó al backend:

```text
Firestore writes: 0
Operational writes: 0
Reimportación: no
Deploy: no
Producción: no
```

## Evidencia diagnóstica

```text
Run: 30762248796
Job: 91534760313
Artifact: 8837830086
Digest: sha256:19f98b4fe75ecfeacde2c76a1feca573980a595ac8e99c5926479ad23370c4b1
Status: GATE711_BROWSER_WRITE_OWNER_DIAGNOSTIC_CAPTURED
```

La traza sanitizada identificó owner, función, colección, operación, rol, ruta y stack sin valores, PII ni secretos.

## Root fix

```text
Commit: fd49e1b15e69d1f023727b4ff92190852bcae1e0
Versión: 20260802.1
```

Cambios:

1. Se eliminó el listener `orbit:session`.
2. Academia ya no vuelve a sembrar contenido al cambiar el rol activo.
3. Se conservó `orbit:store` únicamente para detectar un store realmente nuevo.
4. Las tres lecciones, la evaluación y la versión de configuración se comparan antes de escribir.
5. El upsert afecta solo los cinco IDs objetivo.
6. Se conserva el contenido académico 1.232.
7. No se toca `Orbit.store`, Auth, Firestore adapter ni módulos CRM.

## Prueba sintética del owner

```text
Run: 30762515438
Job: 91535476809
Artifact: 8837895052
Digest: sha256:4a525ec13020f7d3cfaa3698eda2ec3b572dbaa7b4930088fea6030af8a37491
Status: GATE711_ACADEMIA_OPERATIONAL_IDEMPOTENCE_STATIC_PASS
Checks: 16/16
```

Resultado:

```text
Primera carga: 5 llamadas objetivo
Segundo apply: 0 llamadas adicionales
Dirección → Operativo → Asesor: 0 llamadas adicionales
Evento del mismo store: 0 llamadas adicionales
Store realmente nuevo: una aplicación, luego 0 adicionales
```

## Correcciones de mecanismo asociadas

Durante el diagnóstico se corrigieron dos mecanismos que producían vueltas sin aportar evidencia de producto:

### Rutas efímeras de identidad

El preparador de identidad ahora respeta las rutas explícitas del mismo step, limita token a `RUNNER_TEMP`, limita config a `orbit360-platform/core` y usa permisos `0600`.

El contrato ya no depende de un workflow histórico. Utiliza:

```text
tools/orbit360-identity-ephemeral-path-workflow-contract-v20260802.yml
```

Resultado estático actual:

```text
GATE711_IDENTITY_EPHEMERAL_PATH_STATIC_PASS
14/14
```

### Ledger acumulativo

El root fix cambió legítimamente un archivo visual. El manifiesto fue recalculado y auditado:

```text
Run: 30762785016
Job: 91536205495
Artifact: 8837976901
Digest: sha256:33f00fa4239bc42acaef8facb68a4aadadc1a05699805192a96cb4834175c783
Status: GATE711_CUMULATIVE_VISUAL_MANIFEST_ROOTFIX_PASS
Checks: 10/10
```

Solo cambió:

```text
orbit360-platform/data/academia-v1230-operational-directory-v20260722.js
```

Se conservaron:

```text
tracked files: 309
path digest: 517056dee1200503b2e7295a333cb804bc71271bbaa87847fa762da025f276f1
index digest: b57b6581ee02d2dde42a8a2c1272d57f19b7ad6809d13a1d25111f3d71a96074
```

Nuevo content digest:

```text
9e737a2e20ee868ec804a66d249957260164ea393ed4576d4a67b3508a00f762
```

## Readiness estático integral

```text
Run: 30763065758
Job: 91536947955
Artifact: 8838060757
Digest: sha256:67b3704b69a801976232109f82a0a35995e6beed292063e00cadcaef19c59f2f
Status: GATE711_ROOTFIX_STATIC_READINESS_PASS
```

Resultados integrados:

```text
Academia idempotente: 16/16
Identidad efímera: 14/14
Manifiesto acumulativo: 10/10
Readiness integral: 12/12
```

Capacidades usadas en este cierre:

```text
Secrets: no
Firestore read: no
Runtime: no
Browser: no
Writes: 0
Deploy: no
Producción: no
```

## Estado runtime

El root fix no ha fallado en runtime. La verificación focalizada no alcanzó el navegador porque el validador de identidad todavía leía un workflow histórico ya cerrado.

```text
Run: 30762972087
Job: 91536699461
Clasificación: VALIDATOR_STALE
Stage: preflight_before_secrets
```

Este validador fue corregido y el readiness integral pasó. Sin embargo, conforme a STOP_RETRY no se ejecutó otro runtime bajo la misma autorización.

## Cierre y seguridad

```text
Autorización consumida: sí
Runtime retry: bloqueado
Request replay: bloqueado
Workflows usados: cerrados
Secrets/Firestore/browser: deshabilitados
Main/merge: no
Deploy/producción: no
```

## Siguiente acción única

No se solicitarán autorizaciones paso a paso.

La próxima autorización deberá ser un solo macro-bloque secuencial:

1. una verificación runtime focalizada del root fix;
2. solamente si pasa, una ejecución completa read-only del Gate 7.11;
3. STOP_RETRY automático si se repite cualquier etapa o familia de fallo;
4. cero escrituras, reimportación, deploy o producción.

La aprobación visual humana seguirá separada y no será inferida por el gate automático.
