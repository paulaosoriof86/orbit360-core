# PLAN FUNDACIÓN AUTH ALL-TEAM — SOURCE-ONLY

Fecha: 2026-08-05 12:13 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Corrección de alcance

Los tres perfiles Dirección, Operativo y Asesor son cobertura funcional de permisos, no el universo completo de identidades.

El cierre definitivo exige dos métricas separadas:

```text
Identidades actuales: 7/7
Perfiles funcionales: 3/3
Usuarios futuros: flujo genérico desde Equipo
```

## Arquitectura definitiva

### Bootstrap inicial

El primer administrador se crea o vincula mediante Admin SDK y configuración aprobada del tenant. No depende de la callable normal ni de una membership administrativa previa.

### Reconciliación del equipo actual

Después del bootstrap, el reconciliador procesa dinámicamente todos los registros activos de Equipo:

- valida correo único;
- valida roles, rol predeterminado y rol activo;
- valida países y dataScopes;
- vincula una identidad Auth existente o crea únicamente la faltante;
- crea o reconcilia la membership correspondiente;
- vincula `authUid` y estado durable en Equipo;
- prepara un correo de establecimiento o recuperación de contraseña;
- no usa nombres hardcodeados en el owner genérico.

El conteo esperado para el tenant A&S en este cierre es siete. Si el censo encuentra seis, ocho, duplicados o registros incompletos, detiene antes de escribir y reporta el registro mediante digest sanitizado.

### Onboarding normal futuro

Una vez exista Dirección autenticada, `orbit360ProvisionTeamAccess` se usa para cualquier usuario nuevo creado desde Equipo. La callable deja de ser el mecanismo de bootstrap y pasa a ser el mecanismo normal autoadministrable.

## Criterio source-only

El gate 13.6.0 debe demostrar sin capacidades operativas:

- 7/7 registros actuales cubiertos por el plan dinámico;
- 3/3 perfiles funcionales cubiertos;
- mezcla de identidades existentes y faltantes;
- bloqueo ante conteo incorrecto;
- bloqueo ante correo duplicado;
- bloqueo si no existe administración bootstrap;
- soporte de un usuario futuro sin hardcode;
- separación explícita bootstrap inicial / onboarding normal;
- v7 anterior ausente y suspendido;
- cero secretos, Firebase, Firestore, Auth, Functions, navegador, deploy, Rules, CRM, producción, main o merge.

## Frontera runtime posterior

Solo con PASS source-only se podrá preparar una única ejecución runtime acumulativa. Esa ejecución deberá tomar el censo real y cerrar:

```text
7/7 identidades Auth
7/7 memberships activas
7/7 registros Equipo vinculados
7/7 correos de establecimiento/recuperación
7/7 sesiones autenticables por membership
3/3 perfiles funcionales
CRM VERIFIED_UNCHANGED
```

El establecimiento de contraseña sigue siendo personal y seguro mediante correo; no se expondrán contraseñas temporales.

## Continuidad

El Bloque 4 continúa en paralelo con `PASS_COBROS_FULL_REPLAY` y `ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL`.
