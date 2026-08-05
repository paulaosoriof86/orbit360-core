# CAUSA RAÍZ — ACCESO REAL A&S EN LAB

Fecha: 2026-08-05 07:46 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5` draft/open

## Clasificación

```text
DATA_CONTRACT_FAILURE
PIPELINE_MECHANISM_FAILURE
FUNCTIONAL_DEFECT
```

## Evidencia observada

La consola de Firebase Authentication compartida por la dueña del producto muestra únicamente dos identidades:

```text
orbit.lab@demo.com
qa.orbit360+...
```

No aparecen identidades Auth para las personas reales configuradas recientemente en el módulo Equipo.

El correo histórico recordado por la usuaria fue `adminlab@demo`, pero la identidad observada es `orbit.lab@demo.com`; no son la misma cuenta.

## Causa raíz

### 1. Configuración de Equipo no equivale a identidad de acceso

El módulo Equipo conserva la configuración operativa en `Orbit.store`/tenant. El login Firestore exige dos contratos simultáneos:

1. identidad Firebase Auth activa;
2. membership activa en `tenants/{tenantId}/members/{uid}`.

Un registro de asesor sin ambos contratos no puede iniciar sesión.

### 2. El onboarding existe en source, pero no quedó desplegado en la candidata

Owners:

```text
functions/user-onboarding.js
functions/bootstrap.js
orbit360-platform/core/user-onboarding.js
orbit360-platform/modules/equipo-onboarding-v20260804-bridge.js
```

`functions/bootstrap.js` exporta `user-onboarding`. El bridge de Equipo puede crear o vincular Auth, membership, roles, países y scopes, y enviar el establecimiento de contraseña mediante Firebase Auth.

Sin embargo, el workflow que construyó la candidata desplegó únicamente estas cuatro Functions:

```text
orbit360OpsLeadsCommandLabV20260804
orbit360GetAdvisorOpsInboxLabV20260804
orbit360CobrosReconciliationCommandLabV20260804
orbit360RecurringInsuranceImportLabV20260804
```

La Function `orbit360ProvisionTeamAccess` quedó fuera de la allowlist. Por eso crear usuarios en Equipo no pudo completar el alta real de acceso.

### 3. No existe recuperación de contraseña operativa en el login

La pantalla actual ofrece `Limpiar sesión`, pero no un flujo visible para recuperar contraseña. El onboarding sí puede enviar el correo de establecimiento al provisionar, pero una identidad existente cuya contraseña se olvidó no tiene un camino claro desde el login.

## Impacto

- Paula no puede realizar la revisión visual manual.
- Las contraseñas recordadas de Carlos y Samuel no pueden funcionar mientras sus identidades Auth no existan o no estén vinculadas a memberships.
- El runtime visual automático no demuestra acceso manual porque utilizó un custom token efímero sobre una identidad elegible.
- No hay evidencia de defecto funcional en Cliente 360, Pólizas, Cobros, Ops o Leads causada por este incidente.

## Solución correcta

Ejecutar un único gate de recuperación de acceso LAB, sin hardcodear personas en módulos genéricos:

1. validar contrato antes de secretos;
2. censar read-only Auth, asesores y memberships;
3. desplegar únicamente `orbit360ProvisionTeamAccess` si está ausente;
4. resolver desde la configuración del tenant las tres identidades explícitamente autorizadas;
5. crear o vincular Auth y membership mediante el owner protegido;
6. preservar roles, rol default, países y scopes configurados;
7. enviar establecimiento o recuperación de contraseña mediante Firebase Auth;
8. verificar login manual-compatible y scopes sin utilizar contraseñas en logs;
9. mantener `orbit.lab@demo.com` solo como identidad histórica temporal y retirarla después de confirmar accesos reales;
10. cero Rules, reimportación, producción, main o merge.

## Lo que no se hará

- no fijar usuarios o contraseñas en código;
- no restaurar una cuenta demo como dependencia permanente;
- no crear usuarios sintéticos;
- no exponer enlaces de acción, contraseñas o correos completos en evidencia;
- no tocar datos de clientes, pólizas, recibos o cobros;
- no redeplegar las cuatro Functions ya aprobadas;
- no repetir el runtime funcional 18/18.

## Continuidad paralela

El Bloque 4 de Cobros continúa read-only. El incidente de acceso no invalida la candidata técnica ni detiene la clasificación de los 365 pagos, la ingesta mensual asistida o el root fix del importador inteligente.
