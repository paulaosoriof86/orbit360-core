# ANEXO PLAN ÚNICO — FUNDACIÓN AUTH ALL-TEAM SOURCE-ONLY PASS

Fecha: 2026-08-05 12:24 GT  
RC: `RC-AYS-LAB-CANONICA-01`

## Corrección vinculante

Las pruebas por Dirección, Operativo y Asesor son cobertura funcional de roles. No limitan el universo de usuarios.

El cierre de acceso A&S queda definido así:

```text
usuarios actuales del tenant: 7/7
perfiles funcionales: 3/3
usuarios futuros: onboarding genérico desde Equipo
```

## Evidencia source-only

```text
gate: block-auth-foundation-all-team-source-only-v20260805
contract: 13.6.0
resultado: AUTH_FOUNDATION_ALL_TEAM_SOURCE_ONLY_PASS
checks: 29/29
request: 20324d20b4c29ab27b8147e13e51e6fa3e0d75ce
runtime anterior v7: no ejecutado
```

El owner genérico:

- toma todos los registros activos desde la configuración del tenant;
- exige siete para el cierre vigente de A&S;
- bloquea conteos distintos, correos duplicados y registros incompletos;
- valida roles, defaultRole, activeRole, países y dataScopes;
- vincula identidades existentes o planifica crear únicamente las faltantes;
- cubre siete memberships y siete correos de establecimiento/recuperación;
- no contiene nombres de personas hardcodeados;
- conserva el onboarding normal para usuarios futuros después del bootstrap administrativo.

## Frontera siguiente

Solo queda permitida una ejecución runtime acumulativa. Debe cerrar en una sola evidencia:

```text
7/7 identidades Auth
7/7 memberships activas
7/7 registros Equipo vinculados
7/7 correos de establecimiento/recuperación
7/7 sesiones autenticables por membership
3/3 perfiles funcionales
CRM VERIFIED_UNCHANGED
```

No se permiten gates por persona, cadenas v8/v9/v10, usuarios sintéticos ni recuperación basada nuevamente en la callable como mecanismo de bootstrap.

## Continuidad

Bloque 4 conserva `PASS_COBROS_FULL_REPLAY` y `ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL`.
