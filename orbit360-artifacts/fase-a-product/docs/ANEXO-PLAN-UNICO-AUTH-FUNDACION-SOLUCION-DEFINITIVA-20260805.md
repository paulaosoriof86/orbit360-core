# ANEXO AL PLAN ÚNICO — FUNDACIÓN AUTH, SOLUCIÓN DEFINITIVA

Fecha: 2026-08-05 12:24 GT  
RC: `RC-AYS-LAB-CANONICA-01`

Este anexo sustituye únicamente la próxima acción del carril Auth. No sustituye el Plan Único, no altera el orden de salida productiva y no bloquea el Bloque 4 read-only.

## Decisión

Se cancela el diseño anterior de runtime v7 basado en invocar `orbit360ProvisionTeamAccess` para crear la primera administración real.

Motivo:

```text
La callable normal requiere un actor con membership administrativa activa.
La primera administración real todavía no tiene Auth + membership.
Usar la callable como bootstrap inicial crea dependencia circular.
```

## Corrección de alcance

Los perfiles Dirección, Operativo y Asesor son cobertura funcional de permisos. No limitan el universo de usuarios.

El cierre vigente de A&S exige:

```text
7/7 usuarios actuales con identidad y membership
3/3 perfiles funcionales validados
usuarios futuros soportados desde Equipo
```

## Nueva unidad de trabajo

```text
AUTH_FOUNDATION_SINGLE_MACROBLOCK
```

### Carril B — Backend/seguridad/Auth

1. Bootstrap Admin SDK directo desde configuración aprobada del tenant.
2. Censo y reconciliación dinámica de los siete registros activos de Equipo.
3. Identidades faltantes creadas sin credenciales temporales expuestas.
4. Identidades existentes vinculadas por correo/UID cuando corresponda.
5. Siete memberships transaccionales e idempotentes.
6. Siete correos de establecimiento o recuperación.
7. Siete sesiones autenticables por membership.
8. Validación funcional de Dirección, Operativo y Asesor.
9. Deploy/readiness exclusivo de onboarding normal si la Function continúa ausente.
10. Equipo autoadministrable validado desde Dirección.
11. Recuperación visible de contraseña.
12. Rules sin demo hardcodeado antes de producción.

### Carril A — Frontend/UX/Academia

- estado de acceso durable y honesto;
- no mostrar Habilitado sin Auth + membership verificadas;
- acción visible “Olvidé mi contraseña”;
- feedback persistente de error y siguiente acción;
- Academia actualizada sobre bootstrap inicial vs onboarding normal.

### Carril C — Datos reales

- configuración vigente del tenant como fuente del universo de siete usuarios;
- owner genérico sin nombres hardcodeados;
- cero clientes, pólizas, cobros u otras colecciones CRM modificadas;
- snapshots antes/después y rollback exacto.

## Gate source-only cerrado

```text
gate: block-auth-foundation-all-team-source-only-v20260805
contrato: 13.6.0
resultado: AUTH_FOUNDATION_ALL_TEAM_SOURCE_ONLY_PASS
checks: 29/29
usuarios actuales cubiertos: 7/7
perfiles funcionales: 3/3
usuarios futuros: soportados
```

El request source-only quedó consumido e inmutable. No usó secretos, Firebase, Firestore, Auth, Functions, navegador, deploy, Rules, CRM, producción, main ni merge.

## Gates

No se autoriza una cadena de microgates por persona.

Se permite únicamente:

```text
1 gate source-only acumulativo de Fundación Auth — CERRADO PASS
→ 1 gate runtime acumulativo de cierre — PENDIENTE
```

## Criterio GO runtime

```text
7/7 Auth
7/7 memberships
7/7 registros Equipo vinculados
7/7 password emails
7/7 sesiones autenticables por membership
3/3 perfiles funcionales
Equipo autoadministrable PASS
password reset PASS
CRM VERIFIED_UNCHANGED
```

## Continuidad

El Bloque 4 permanece activo y read-only. Auth no reinicia módulos, no reimporta datos y no sustituye el plan financiero/cobros.
