# AUDITORÍA FORENSE AUTH — CENSO REAL 9 VS 7

Fecha local: 2026-08-05 12:47 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Resultado del único runtime autorizado

```text
Gate: block-auth-foundation-all-team-runtime-v20260805
Preflight: 32/32 PASS
Etapa de cierre: AUTH_FOUNDATION_ALL_TEAM_CENSUS_STOP
Clasificación: DATA_CONTRACT_FAILURE
Código: TEAM_ROSTER_NOT_READY
Registros activos observados: 9
Registros activos esperados: 7
```

El censo terminó antes de cualquier escritura o despliegue.

```text
Auth creates/updates: 0
Membership writes: 0
Team writes: 0
Password emails: 0
Sessions: 0
Functions deploy: 0
Hosting/Rules/reimportación: 0
CRM writes: 0
producción/main/merge: 0
```

No fue necesario rollback porque no hubo escrituras.

## Causa raíz inmediata

```text
DATA_CONTRACT_FAILURE
ACTIVE_TEAM_RUNTIME_COUNT_9_DOES_NOT_MATCH_APPROVED_COUNT_7
```

Owner exacto:

```text
tools/orbit360-auth-foundation-all-team-runtime-v20260805.mjs
readTeam → buildFoundationPlan → census
```

El owner leyó las rutas configuradas de Equipo, deduplicó por ID y aplicó el mismo criterio de actividad de la plataforma:

```text
no inactivo
activo no es false
estado no es inactivo
```

Después de esa composición quedaron nueve registros activos.

## Qué no puede afirmarse todavía

La evidencia sanitizada de este run preservó el conteo, pero no guardó la clasificación hash por registro cuando el plan falló. Por tanto, todavía no se puede afirmar responsablemente si los dos registros adicionales son:

1. usuarios reales que también deben recibir acceso;
2. duplicados entre rutas legacy y canónica con IDs distintos;
3. perfiles demo/técnicos no retirados;
4. registros operativos que debían estar marcados como inactivos;
5. dos altas adicionales que la interfaz actual no estaba mostrando en el conteo esperado.

Eliminar, desactivar o provisionar esos dos registros sin esa discriminación sería una inferencia insegura.

## Causa contribuyente del pipeline

```text
PIPELINE_MECHANISM_FAILURE
FAILED_CENSUS_DID_NOT_PERSIST_HASHED_PER_RECORD_DIAGNOSTICS
```

El censo debe conservar, incluso ante STOP y sin PII:

- `teamIdHash`;
- `emailHash`;
- ruta fuente;
- estado activo/inactivo calculado;
- campos contractuales faltantes;
- grupos por correo duplicado;
- aliases con mismo ID;
- clasificación candidato real / legacy / técnico / requiere validación.

## Solución definitiva siguiente

No repetir el runtime de creación.

Ejecutar una única auditoría read-only focalizada que:

1. valide el gate antes de secretos;
2. lea las mismas rutas de Equipo;
3. produzca el diagnóstico hash de los nueve registros;
4. compare con la configuración y roster aprobados del tenant;
5. identifique exactamente los dos registros fuera del conjunto esperado;
6. proponga una de dos decisiones, sin escribir:
   - `KEEP_9_AND_REBASE_CONTRACT`, si los nueve son usuarios reales;
   - `KEEP_7_AND_RETIRE_2`, si los dos son duplicados/obsoletos, indicando owner y motivo de retiro.

Solo después de esa decisión se prepara una única escritura final de Fundación Auth. No se vuelve a crear un gate por persona ni se reutiliza el request consumido.

## Estado del plan principal

El Bloque 4 continúa:

```text
PASS_COBROS_FULL_REPLAY
ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL
```

No se reinicia Cobros, no se reimporta y no se pierde el contrato financiero de planillas de comisiones.
