# Cierre rootfix Auth pipeline — source-only

Fecha local: 2026-08-05 15:28 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Clasificación previa

```text
PIPELINE_MECHANISM_FAILURE
VALIDATOR_STALE
```

El runtime autorizado anterior se detuvo antes del gate canónico. El validador inspeccionaba la presencia textual de `production` en todo el workflow, por lo que expresiones negativas como `production==false` podían producir un falso STOP. El cierre reutilizaba además evidencia anterior cuando una etapa source-only terminaba sin persistir el error exacto.

## Rootfix implementado

1. El validador inspecciona exclusivamente comandos reales `firebase deploy` y sus destinos.
2. Solo admite dos despliegues potenciales, posteriores al gate y dentro de LAB:
   - `functions:orbit360ProvisionTeamAccess`;
   - Hosting del proyecto `ays-orbit-360-lab`.
3. Se invalidan evidencias runtime anteriores al iniciar un request nuevo.
4. Se crea un ledger por etapa con `started`, `pass`, `fail`, `owner` y `errorCode`.
5. Patch, sintaxis, fixtures, registro y gate quedan bajo un único owner source-only.
6. El sellador final solo acepta evidencia vinculada al `GITHUB_RUN_ID` actual.
7. Los conteos de usuarios de ejecuciones anteriores se rechazan y no pueden reaparecer en un cierre nuevo.
8. No se permiten secretos, Firebase ni despliegues antes de completar el PASS source-only y el gate canónico.
9. El workflow acepta únicamente un request nuevo, inmutable y de una sola ejecución; no reutiliza el request consumido.

## Archivos

- `tools/orbit360-validar-gate-contracts-engine-auth-selfmanaged-credentials-runtime-v20260805.mjs`
- `tools/orbit360-auth-selfmanaged-source-stage-owner-v20260805.mjs`
- `tools/orbit360-auth-selfmanaged-final-sealer-v20260805.mjs`
- `tools/orbit360-test-auth-selfmanaged-pipeline-rootfix-source-v20260805.mjs`
- `.github/workflows/orbit360-auth-selfmanaged-credentials-runtime-v20260805.yml`
- `.github/workflows/orbit360-auth-selfmanaged-pipeline-rootfix-source-v20260805.yml`

## Evidencia

```text
PASS_AUTH_PIPELINE_ROOTFIX_SOURCE_ONLY
SOURCE_ONLY_ROOTFIX_VERIFIED
13 PASS
0 FAIL
```

Fuente:

`orbit360-platform/runtime-gate-crm-v20260716/auth-selfmanaged-pipeline-rootfix-source-sanitized-v20260805.json`

Commit de evidencia:

`6612d308489eb133433fbe57cf221d040108ce43`

## Frontera confirmada

```text
secretos leídos: no
Firebase ejecutado: no
Firestore reads: 0
Firestore writes: 0
Auth reads: 0
Auth writes: 0
Function deploys: 0
Hosting deploys: 0
Rules deploys: 0
reimportación: 0
producción/main/merge: 0
contraseñas persistidas: 0
```

## Estado de Auth

La arquitectura, los cuatro datos de identidad faltantes, la política `PrimerNombre123*`, el cambio obligatorio y la autoadministración están preparados. El pipeline source-only que bloqueaba la ejecución quedó corregido y probado.

Todavía no se afirma que las identidades, memberships, contraseñas o logins estén materializados. Esa comprobación corresponde al siguiente runtime autorizado.

## Siguiente acción exacta

Crear un request nuevo de una sola ejecución, vinculado al HEAD vigente y autorizado explícitamente, para ejecutar en LAB:

```text
preflight canónico
→ aplicar cuatro datos de identidad
→ desplegar únicamente onboarding
→ desplegar únicamente Hosting LAB
→ censo dinámico N/N
→ crear o vincular identidades
→ reconciliar memberships y Equipo
→ asignar PrimerNombre123*
→ verificar login N/N
→ verificar cambio obligatorio
→ verificar autoadministración
→ CRM VERIFIED_UNCHANGED
```

No se ejecutará ese runtime mediante una autorización ya consumida.
