# AUDITORÍA AUTH AUTOADMINISTRABLE — STOP ANTES DEL GATE

Fecha local: 2026-08-05 14:19 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`

## Resultado

```text
Request: auth-selfmanaged-credentials-runtime-v20260805
Estado: consumido / no replay
Etapa alcanzada: anterior al gate canónico
Preflight 13.9.0: NOT_EXECUTED
Clasificación: PIPELINE_MECHANISM_FAILURE
```

La evidencia final automática quedó en:

```text
STOP_RETRY_EVIDENCE_INCOMPLETE
```

## Frontera confirmada

```text
secretos leídos: no
Firebase/Firestore/Auth: no ejecutados
correcciones de identidad: 0
identidades creadas o modificadas: 0
memberships: 0
registros Equipo: 0
contraseñas asignadas: 0
logins verificados: 0
Function deploys: 0
Hosting LAB deploys: 0
Rules/reimportación/CRM: 0
producción/main/merge: 0
```

## Causa raíz

```text
PIPELINE_MECHANISM_FAILURE
SOURCE_ONLY_STAGE_ABORTED_BEFORE_CANONICAL_GATE
EARLY_STAGE_TRACE_NOT_PERSISTED
```

Owner exacto:

```text
.github/workflows/orbit360-auth-selfmanaged-credentials-runtime-v20260805.yml
pasos:
- Aplicar owners source-only en working tree
- Validar sintaxis y fixtures
- Registrar gate únicamente en working tree
- Gate canónico antes de secretos
- Sellar evidencia final y consumir autorización
```

El preflight persistido continúa en `NOT_EXECUTED`, por lo que el engine canónico no llegó a ejecutarse. El sellador final no conservó cuál de los pasos source-only anteriores falló y reutilizó el conteo `7` desde evidencia dinámica previa. Ese conteo no demuestra que el censo de esta ejecución haya ocurrido.

## Datos confirmados preservados

Configuración tenant-only:

```text
Fernando Arias → fernando.arias@aysseguros.com · GT
Nicole Castro → nicole.castro@aysseguros.com · CO
Braulio Hernández → braulio.hernandez@aysseguros.com · GT
Johanna Salgado → johanna.salgado@aysseguros.com · GT
```

Política aprobada:

```text
contraseña temporal: PrimerNombre123*
cambio obligatorio en primer ingreso: sí
contraseña actual visible: no
administración puede reemplazarla: sí
usuario puede cambiar la propia: sí
```

Ninguna contraseña está guardada en el repositorio o en evidencia.

## Root fix obligatorio antes de otro runtime

1. Invalidar todas las evidencias de etapas anteriores al iniciar el job.
2. Crear un ledger de pasos source-only con estado `started/pass/fail`, owner y errorCode sanitizado.
3. Ejecutar el source patch, `node --check`, fixtures, registrar y gate dentro de un único owner que siempre persista el error exacto.
4. Prohibir que el sellador final derive conteos desde evidencia de un request anterior.
5. Corregir los validadores que busquen la palabra `production` en todo el workflow; deben validar comandos y destinos, no menciones negativas como `production==false`.
6. Obtener PASS source-only completo antes de secretos.
7. Solo después ejecutar una única vez datos → Function → Hosting LAB → Auth N/N → contraseña temporal → login real → cambio obligatorio → integridad CRM.

## Estado funcional

Los owners de autoadministración están preparados en la rama, pero no fueron empalmados por el source patch ni desplegados. Por tanto, Equipo todavía no ofrece de forma activa la gestión de contraseña y los usuarios todavía no pueden ingresar con el patrón temporal.
