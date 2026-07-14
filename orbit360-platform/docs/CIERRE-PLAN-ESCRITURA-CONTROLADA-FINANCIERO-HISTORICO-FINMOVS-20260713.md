# Cierre del plan controlado de escritura financiero histórico → finmovs

Fecha: 2026-07-13  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Carriles: B y C  
Estado: planificador implementado; ejecutor no conectado; cero escrituras

## Objetivo

Preparar el contrato que podrá utilizar el backend productivo para registrar movimientos operativos provenientes del histórico, sin implementar todavía el ejecutor ni modificar `Orbit.store`.

## Archivos

Contrato:

`core/financiero-historico-finmovs-write-plan-p0.js`

Validador:

`tools/orbit360-validar-financiero-historico-finmovs-write-plan-p0.mjs`

CI:

`.github/workflows/orbit360-financiero-historico-finmovs-write-plan-p0-smoke.yml`

## Requisitos de la propuesta

El planificador rechaza propuestas que:

- no apunten exclusivamente a `finmovs`;
- no sean dry-run;
- tengan validaciones pendientes;
- mezclen tenants;
- contengan acciones distintas de crear u omitir;
- declaren recaudo de prima;
- no provengan de `financiero_historico`;
- no conserven identidad de origen y destino.

## Confirmación reforzada

Se exige:

```txt
approved = true
phrase = CONFIRMO REGISTRO DE MOVIMIENTOS
userId presente
tenant coincidente
rol activo asignado
scope distinto de ninguno
motivo de al menos 8 caracteres
MFA cuando la política del tenant lo exija
```

Roles aprobadores predeterminados:

- Dirección;
- SuperAdmin;
- AdminTenant.

Operativo solo puede aprobar si la configuración del tenant habilita expresamente:

```txt
allowOperativoFinancialPosting = true
```

Asesor no puede aprobar por defecto.

## Resultado

Cuando todas las puertas pasan, se genera:

- `planId` determinista;
- operaciones de inserción preparadas;
- omisiones por duplicado conservadas;
- registros de auditoría `planned_not_executed`;
- plan de rollback `remove_inserted`;
- identidad de aprobador, rol, motivo y fecha;
- requisitos del futuro ejecutor.

El resultado declara:

```txt
readyForExecutor = true
writeExecuted = false
```

Por tanto, no equivale a una escritura realizada.

## Requisitos del ejecutor futuro

El backend productivo deberá garantizar:

1. ejecución únicamente mediante `Orbit.store`;
2. idempotencia por `planId`, ID destino y referencia fuente;
3. auditoría antes/después;
4. transacción o compensación segura;
5. rollback verificable;
6. membresía activa del tenant;
7. rol activo y scope vigentes al momento de ejecutar;
8. rechazo de planes expirados o ya ejecutados;
9. cero fallback demo/localStorage;
10. estado visible honesto para el usuario.

## Archivos protegidos

No fueron modificados:

- `data/store.js`;
- `data/store-firestore-lab.local.js`;
- `core/backend-lab-*`;
- `core/auth.js`;
- `core/importa.js`;
- `firestore.rules`;
- herramientas backend existentes.

## Estado por carril

### Carril A

Claude continúa con la candidata incremental. El patrón visual y de Academia quedó documentado en un delta separado para el siguiente empalme; no se abrió una candidata paralela.

### Carril B

Quedan implementados:

- contrato de normalización financiera;
- contrato de promoción a `finmovs`;
- plan de ejecución controlada;
- validadores y workflows de CI.

Pendiente productivo:

- adapter productivo sin fallback;
- membresías multirol reales;
- reglas por tenant;
- ejecutor transaccional;
- configuración segura de infraestructura.

### Carril C

La fuente real permanece solo en dry-run. No se escribió ninguna de las 841 filas.

## Siguiente acción segura

Mientras Claude continúa, puede avanzarse en uno de estos bloques sin interferencia:

1. contrato productivo de membresías multirol y scopes;
2. catálogo de colecciones productivas y rutas canónicas por tenant;
3. contrato del importador de calendario de marketing;
4. matriz de carga inicial ordenada por dependencias.

La prioridad recomendada es membresías multirol y scopes, porque desbloquea Auth, reglas y aprobación de importaciones.

Acción manual requerida: ninguna.
