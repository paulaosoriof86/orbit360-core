# ACADEMIA — AUTH AUTOADMINISTRABLE

Fecha: 2026-08-05  
RC: `RC-AYS-LAB-CANONICA-01`  
Clasificación: `ACADEMIA_ACTUALIZAR`

## Estado comprobado

```text
AUTH_SELFMANAGED_CREDENTIALS_RUNTIME_PASS
7/7 identidades
7/7 memberships
7/7 vínculos con Equipo
7/7 contraseñas temporales asignadas
7/7 logins verificados
7/7 cambios obligatorios verificados
CRM VERIFIED_UNCHANGED
```

## Contenido que Academia debe enseñar por rol

### Dirección / administración

- Crear o completar un integrante desde Equipo con nombre, correo, país, roles y scopes.
- Entender que el registro de Equipo, la identidad de acceso y la membership son elementos vinculados, no equivalentes.
- Asignar o reemplazar una contraseña temporal sin visualizar la contraseña actual.
- Modificar nombre o correo y sincronizar el cambio con la identidad de acceso.
- Desactivar o reactivar acceso con motivo y trazabilidad.
- No abrir scope `todos` sin confirmación reforzada y motivo.

### Usuario activo

- Ingresar con la credencial temporal asignada.
- Cambiar obligatoriamente la contraseña en el primer ingreso.
- Cambiar posteriormente su propia contraseña.
- Comprender que la contraseña actual no puede ser consultada ni recuperada por administración.

### Operativo / soporte

- Diferenciar `FUNCTIONAL_DEFECT`, `DATA_CONTRACT_FAILURE`, `VALIDATOR_STALE`, `PIPELINE_MECHANISM_FAILURE` y `SECURITY_FAILURE`.
- No crear usuarios sintéticos ni hardcodear personas en módulos genéricos.
- Verificar identidad, membership, vínculo de Equipo, rol activo y scopes antes de diagnosticar un problema de acceso.
- Aplicar STOP_RETRY cuando reaparece la misma etapa o familia de fallo.

## Reglas de seguridad obligatorias

- No guardar contraseñas en repositorio, evidencia, logs o documentos.
- No mostrar ni intentar recuperar la contraseña actual.
- La contraseña temporal exige cambio en el primer ingreso.
- Los cambios administrativos dejan motivo, antes/después, fecha y actor.
- El flujo normal es autoadministrable desde Equipo; el bootstrap inicial es una operación separada.

## Evidencia vinculante

- `orbit360-platform/runtime-gate-crm-v20260716/auth-selfmanaged-credentials-runtime-final-sanitized-v20260805.json`
- `orbit360-platform/docs/CIERRE-AUTH-SELFMANAGED-CREDENTIALS-RUNTIME-20260805.md`
- Run `31051061883`

## Implementación pendiente en contenido visual

Incorporar esta lección al módulo Academia en un bloque posterior de contenido, sin volver a desplegar ni alterar el runtime Auth ya aprobado. No bloquea el cierre operacional de Auth.
