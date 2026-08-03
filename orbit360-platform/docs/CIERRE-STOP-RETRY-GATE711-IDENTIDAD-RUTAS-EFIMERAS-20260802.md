# CIERRE STOP_RETRY — GATE 7.11 · IDENTIDAD Y RUTAS EFÍMERAS

Fecha: 2026-08-02  
Módulo: pipeline runtime Gate 7.11 · identidad read-only  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producto congelado: `997fca628f95dd397dba347700a6bc644fe840f0`

## Necesidad

Ejecutar una sola sesión acumulativa read-only para CRM, Ops y Leads después de preflight, identidad existente y snapshot inicial, sin escrituras, reimportación, deploy ni producción.

## Resultado de la ejecución autorizada

```text
run: 30774123443
job: 91566222407
requestCommit: 5e9fce8c9d681b6a7eec9145d725107df9848b5e
artifact: 8841443031
artifactDigest: sha256:ce6ec1619c7b5e87dbc583c23e806a139ca823ca6ec25740c5867f6f42fc69a1
conclusion: FAILURE / STOP_RETRY
```

Etapas:

```text
checkout: PASS
autorización inmutable y product freeze: PASS
preflight contractual: 18/18 PASS
release-critical static: 38/38 PASS
dependencias: PASS
cuenta de servicio LAB: PASS
helper identidad existente: PASS
postcheck de ruta efímera: FAIL
snapshot inicial: NOT_EXECUTED
servidor local: NOT_EXECUTED
runtime CRM/Ops/Leads: NOT_EXECUTED
snapshot final: NOT_EXECUTED
```

## Clasificación

```text
PIPELINE_MECHANISM_FAILURE
```

No fue:

- defecto funcional del producto;
- error de Academia;
- fallo de autenticación;
- ausencia de membresía;
- contrato de datos incorrecto;
- escritura no autorizada;
- fallo de CRM, Ops o Leads.

## Evidencia de identidad

El helper produjo evidencia válida:

```text
status: CANONICAL_BROWSER_EXISTING_IDENTITY_READY
classification: GO_LAB_EXISTING_IDENTITY_READONLY
eligibleExistingIdentityCount: 1
uidMatched: true
emailMatched: true
activeRoleAssigned: true
customTokenCreatedEphemeral: true
authWrites: 0
firestoreWrites: 0
operationalWrites: 0
ok: true
```

Por lo tanto, la identidad no fue la causa del cierre.

## Causa raíz

Archivo:

`.github/workflows/orbit360-gate711-release-critical-runtime-v20260802.yml`

Paso:

`Preparar identidad existente read-only`

El workflow calculaba:

```bash
TOKEN_FILE="$RUNNER_TEMP/orbit360-gate711-browser-token.txt"
CONFIG_FILE="$GITHUB_WORKSPACE/orbit360-platform/core/auth-firebase.config.local.js"
```

pero no exportaba esas variables como:

```bash
ORBIT360_CUSTOM_TOKEN_FILE
ORBIT360_LOCAL_FIREBASE_CONFIG_FILE
```

antes de ejecutar:

```bash
node tools/orbit360-preparar-identidad-browser-canonica-readonly-v20260801.mjs
```

El helper utilizó correctamente su fallback canónico:

```text
$RUNNER_TEMP/orbit360-canonical-browser-token.txt
```

Después, el mismo step verificó la ruta distinta `orbit360-gate711-browser-token.txt`; el archivo esperado por esa comprobación no existía y el step terminó con exit code 1, aunque la identidad y el token efímero ya eran válidos.

## Correctivo

Se corrigió el workflow para exportar las rutas antes del helper:

```bash
export ORBIT360_CUSTOM_TOKEN_FILE="$TOKEN_FILE"
export ORBIT360_LOCAL_FIREBASE_CONFIG_FILE="$CONFIG_FILE"
```

Además, la evidencia ahora debe confirmar:

```text
explicitTokenPathHonored: true
explicitConfigPathHonored: true
```

Commits:

```text
workflow fix: cbd04a88cb6b0d4c59b0cf927401f68a8ba6bbb9
readiness coverage: 7ddc43c5d745d5ce4ba9a5d26a1321101cfe22b1
```

## Validación source-only

```text
run: 30774296503
job: 91566714386
requestCommit: 292a6411d32fd732993fab075fea0213a887bf1e
artifact: 8841489287
artifactDigest: sha256:ec4a75a9ec951306279c31b5d09d1545b11dae76b578c0dcd3d69bd11c26cc03
status: GATE711_RUNTIME_PACKAGE_READINESS_PASS
checks: 38/38
```

Capacidades utilizadas en el correctivo:

```text
secrets: no
Firestore read/write: 0/0
runtime/browser: no/no
deploy/production: no/no
product files changed: 0
```

## Impacto

- El preflight y el router canónico quedaron preservados.
- La identidad existente fue confirmada como válida.
- El package readiness ahora cubre la unión exacta entre workflow y helper.
- El producto permanece congelado.
- No se generó visualización ni aprobación automática.
- No hubo cambios en `main`, Hosting, Functions, Rules o producción.

## Seguridad y lifecycle

La autorización de las 18:15 fue consumida por el run `30774123443`.

```text
replayAllowed: false
additionalExecutionsAllowed: false
STOP_RETRY: active
```

No se reutiliza ese request ni se reejecuta el job.

## Clasificación para Cloud / Claude / Academia

| Elemento | Clasificación | Acción |
|---|---|---|
| Exportación explícita de rutas temporales antes de invocar helpers | `REPLICABLE_CLAUDE_ACUMULADO` | Añadir al próximo delta sanitizado como patrón CI/runtime |
| Service account, token, config local y rutas concretas | `BACKEND_PROTEGIDO_NO_CLAUDE` | No enviar |
| Explicación de diferencia entre identidad válida y postcheck de pipeline | `ACADEMIA_ACTUALIZAR` | Incluir en causa raíz y gates |
| Datos reales, UID, correo, secretos y artefactos con credenciales | `SECRETO_DATO_REAL` | Excluir de cualquier paquete externo |

## Estado

```text
causa raíz: CERRADA
correctivo: IMPLEMENTADO
readiness correctivo: 38/38 PASS
runtime CRM/Ops/Leads: PENDIENTE DE NUEVA AUTORIZACIÓN
Academia runtime: NO BLOQUEANTE
Cloud/Claude: DOCUMENTADO / NO ENVIADO
producción: NO EJECUTADA
```

## Siguiente acción exacta

Una futura ejecución runtime deberá utilizar un request y lifecycle nuevos, derivados del workflow corregido y del readiness 38/38 del run `30774296503`. La revisión visual continuará siendo única y acumulativa. El go-live permanecerá separado y requerirá autorización productiva explícita.
