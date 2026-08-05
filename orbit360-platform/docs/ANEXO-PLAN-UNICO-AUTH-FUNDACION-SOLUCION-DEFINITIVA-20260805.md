# ANEXO AL PLAN ÚNICO — FUNDACIÓN AUTH, SOLUCIÓN DEFINITIVA

Fecha: 2026-08-05 11:51 GT  
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

## Nueva unidad de trabajo

```text
AUTH_FOUNDATION_SINGLE_MACROBLOCK
```

### Carril B — Backend/seguridad/Auth

1. Bootstrap Admin SDK directo desde roster aprobado.
2. Censo y reconciliación de tres perfiles.
3. Identidades faltantes creadas sin credenciales temporales expuestas.
4. Memberships transaccionales e idempotentes.
5. Correos de establecimiento/recuperación.
6. Login real de los tres perfiles.
7. Deploy/readiness exclusivo de onboarding normal.
8. Equipo autoadministrable validado desde Dirección.
9. Recuperación visible de contraseña.
10. Rules sin demo hardcodeado antes de producción.

### Carril A — Frontend/UX/Academia

- estado de acceso durable y honesto;
- no mostrar Habilitado sin Auth + membership verificadas;
- acción visible “Olvidé mi contraseña”;
- feedback persistente de error y siguiente acción;
- Academia actualizada sobre bootstrap inicial vs onboarding normal.

### Carril C — Datos reales

- roster sellado y configuración vigente del tenant como única fuente;
- máximo tres perfiles aprobados;
- cero clientes, pólizas, cobros u otras colecciones CRM modificadas;
- snapshots antes/después y rollback exacto.

## Gates

No se autoriza una cadena de microgates por persona.

Se permite únicamente:

```text
1 gate source-only acumulativo de Fundación Auth
→ 1 gate runtime acumulativo de cierre
```

El runtime no se solicita hasta que el source-only pruebe:

- bootstrap directo sin actor previo;
- idempotencia y rollback;
- correos sin contraseñas temporales;
- onboarding normal posterior;
- password reset visible;
- readiness de Function;
- evidencia condicional;
- integridad CRM;
- plan de retiro de demo/Rules.

## Criterio GO

```text
3/3 Auth
3/3 memberships
3/3 password emails
3/3 logins reales
roles/países/scopes PASS
Equipo autoadministrable PASS
password reset PASS
CRM VERIFIED_UNCHANGED
```

## Continuidad

El Bloque 4 permanece activo y read-only. Auth no reinicia módulos, no reimporta datos y no sustituye el plan financiero/cobros.
