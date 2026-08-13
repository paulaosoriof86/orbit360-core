# CIERRE AUTH ACCESS v5 — STOP_RETRY

Fecha local: 2026-08-05 10:58 GT  
RC: `RC-AYS-LAB-CANONICA-01`

```text
Gate: block-auth-access-recovery-lab-v5-20260805
Request: 0938e4e696af22b6323d67e9da01a8adb40c0cb7
Stage: STOP_RETRY_AUTH_ACCESS_RECOVERY
Primary classification: FUNCTIONAL_DEFECT
Primary family: ONBOARDING_CALL_FAILED_STATUS_UNAVAILABLE
```

## Etapas comprobadas

El run alcanzó y superó:

1. preflight canónico antes de secretos;
2. plan de configuración de acceso;
3. aplicación de la configuración aprobada;
4. censo Auth/memberships y snapshot CRM;
5. disponibilidad de `orbit360ProvisionTeamAccess`.

Se detuvo al invocar la Function para crear o vincular identidades y memberships. La postverificación de scopes no se alcanzó.

## Causa primaria

Owner:

```text
tools/orbit360-auth-access-recovery-lab-v20260805.mjs::callOnboarding
functions/user-onboarding.js::executeProvision
```

El recovery owner clasifica como `FUNCTIONAL_DEFECT` una respuesta callable no exitosa o que no devuelve `result.ok=true`. El status remoto exacto quedó solo en la evidencia local del runner y no llegó al repositorio.

Riesgo contractual más fuerte identificado por inspección source-only: el censo seleccionaba un actor privilegiado sin demostrar previamente todos los requisitos que la Function vuelve a exigir —`tenantId`, estado activo, rol activo asignado y rol/permiso de gestión—. Esto es una inferencia que deberá comprobarse antes de otro runtime.

## Causa secundaria

```text
PIPELINE_MECHANISM_FAILURE
MISSING_OPTIONAL_SCOPE_EVIDENCE_BREAKS_RESULT_PERSISTENCE
```

Owner:

```text
.github/workflows/orbit360-auth-access-recovery-lab-v3-20260805.yml
Persistir evidencia y cierre sin tocar request
```

Cuando `recover` falló, la etapa de scopes fue omitida. El workflow intentó ejecutar `git add` sobre la evidencia de scopes inexistente y abortó la persistencia del error detallado, rollback y lifecycle.

## Frontera honesta

```text
Identidades creadas confirmadas: 0
Memberships creadas confirmadas: 0
Correos enviados: 0
Rollback intentado por recovery owner: sí
Rollback readback persistido: no
Integridad CRM postverificada: no
Cambio CRM observado: no
```

`CRM protegido: false` en el comentario automático significaba “postverificación no alcanzada”; no prueba que el CRM haya cambiado.

## Soluciones source-only aplicadas

- lifecycle v5 consumido y replay deshabilitado;
- evidencia final reconstruida sin PII ni secretos;
- evidencia dual de causa raíz;
- owner de paridad del actor: `tools/orbit360-auth-access-actor-parity-precheck-v6-20260805.mjs`;
- sellador condicional: `tools/orbit360-auth-access-evidence-safe-persist-v6-20260805.mjs`;
- workflow v5 congelado y reutilizado como diagnóstico source-only v6 inerte;
- futuro request v6 ausente.

## Autorización

La autorización v5 quedó consumida. No se ejecutó rerun. La siguiente ejecución runtime requiere diagnóstico source-only v6 PASS, request nuevo y autorización explícita distinta.

## Continuidad

Bloque 4 de Cobros continúa read-only en paralelo.
