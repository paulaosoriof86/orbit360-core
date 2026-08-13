# Cierre de unificación de candidata acumulativa RC1.2

Fecha operativa: 2026-08-04  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5` draft/open  
Release inmutable: `b699ba329960cd830121b57452ce558399aa84fb`

## Decisión

```text
CANDIDATE_UNIFICATION_STATIC_PASS
GO_STATIC_CUMULATIVE_PRODUCT_DATA_BINDING
22/22 PASS
```

La candidata acumulativa única ya quedó definida y validada. No falta la migración aprobada, no falta el árbol de módulos y no corresponde reconstruir ni reimportar Clientes, Aseguradoras, Pólizas, Vehículos, Recibos, Cartera o Cobros.

## Causa raíz corregida

Clasificación:

```text
PIPELINE_MECHANISM_FAILURE
```

La candidata se estaba representando únicamente como un árbol de Hosting, mientras que el snapshot canónico aceptado y la condición de acceso por membership permanecían como evidencias separadas. Como `Orbit.store` solo adjunta snapshots después de una membership normal válida, la misma candidata podía verse vacía aunque el producto y los datos estuvieran preservados.

No era una pérdida de información ni un fallo de migración.

## Baseline única

```text
baseline: 27cb7dfcda8568280ebef15993a953364304f29b
releaseBranch: release/gravicentra-insurance-rc1-2-membership-auth-20260803
releaseCommit: b699ba329960cd830121b57452ce558399aa84fb
candidateId: gravicentra-insurance-rc1.2-unified
```

Fuentes vinculadas:

- árbol de producto y módulos de RC1.2;
- auditoría forense acumulativa;
- cierre inmutable de Gate 7.11;
- digest canónico de datos;
- rutas activas del store;
- condición de acceso por memberships;
- Hosting público `orbit360-platform`.

## Producto acumulativo

```text
rutas: 31
scripts de módulos cargados: 47
archivos de módulos: 62
módulos activos trabajados: 31
integrados directamente a Orbit.store: 30
fallos de módulos: 0
paridad contra baseline: PASS
paridad contra rama viva: PASS
cambios posteriores de módulos omitidos: 0
```

Módulos críticos vinculados expresamente:

- Cliente 360;
- Aseguradoras;
- Pólizas;
- Cobros;
- Ops;
- Leads.

El `index.html` de la candidata carga el store antes de los módulos y conserva todos los scripts activos auditados.

## Datos canónicos preservados

```text
snapshot fuente: 88b8e16b0d4531b2f5c0ce2b1a21068837853080943f7584f6f3fab0cc2ff18d
snapshot canónico: 19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b
documentos fuente: 4,837
documentos canónicos: 4,842
IDs operativos compartidos: 4,837
seeds target-only excluidos: 5
grupos de relaciones resueltos: 6,428
```

Conteos operativos aceptados:

```text
clientes: 430
aseguradoras: 30
pólizas: 1,373
vehículos: 1,032
recibos esperados: 1,294
cartera de primas: 673
cobros: 5
asesores: 7
```

Rutas canónicas vinculadas en la candidata:

```text
tenants/{tenantId}/data/clientes/items
tenants/{tenantId}/data/aseguradoras/items
tenants/{tenantId}/data/polizas/items
tenants/{tenantId}/data/vehiculos/items
tenants/{tenantId}/data/recibosEsperados/items
tenants/{tenantId}/data/carteraPrimas/items
tenants/{tenantId}/data/cobros/items
```

No existe fallback a seed para estas colecciones y el digest canónico está sellado en el store.

## Bloqueo vigente, separado de la candidata

Clasificación:

```text
DATA_CONTRACT_FAILURE
```

Estado:

```text
producto acumulativo: PASS
módulos acumulativos: PASS
datos canónicos vinculados: PASS
reimportación requerida: NO
pérdida de datos observada: NO
acceso normal: BLOQUEADO
```

El bloqueo es exclusivamente de identidades Auth/memberships normales. Sin una membership válida, el store queda en `waiting-membership` y no adjunta los snapshots; esto explica por qué la plataforma parecía no contener la información.

Padrón aprobado recuperado para el cierre:

```text
Dirección: Paula Osorio
Operativo: Carlos Castro
Asesor: Samuel Daza
```

Roles aprobados:

```text
Paula: SuperAdmin + AdminTenant + Asesor + Operativo
Carlos: Operativo + Asesor
Samuel: Asesor + Operativo
```

Los correos permanecen sanitizados por digest en el manifiesto. El `advisorId` de Samuel debe resolverse desde el registro canónico existente de asesores, nunca inferirse ni hardcodearse.

## Evidencia

```text
run: 30889281837
job: 91927354276
artifact: 8884346228
artifactDigest: sha256:ea054a38f29f1a7cb08b8b834b393e3b38eaf943ee7d90e47c66999a54d72b2f
checks: 22/22 PASS
```

Digests enlazados:

```text
moduleAuditDigest: fd26a8eefbb149f4240832e1b97eb3b9863e7af5e404561791eb5dfe982379fa
gate711LifecycleDigest: dd88841850f58869e28b55d22f253f0d26a8c713e175756c475f8a316148847a
unifiedManifestDigest: d2d619a9f4f10b0d6646e1730cdfc8338ffa4d73ee1b9ef9a9a7f0de621aa429
releaseStoreDigest: bbe4aa2f6e749c085d2bf57cceccfbf6d0c6d520b991bd1c9cce3d566aba22a1
releaseIndexDigest: aa40982bffd5a453c56dd07e2aa75745128890cb81fa940c2dac6e051fa2e9d6
```

## Integridad

```text
Firestore reads: 0
Firestore writes: 0
Auth reads: 0
Auth writes: 0
browser: no
deploy: no
reimportación: no
Rules: no
Functions: no
main: no
merge: no
Gate 7.11 repetido: no
```

## Carriles

### A — Frontend, UX y Academia

Avance visible: una sola candidata contiene el shell, navegación, módulos y bridges aprobados. La ausencia visual de datos quedó explicada por el gate de membership, no por pérdida de frontend o migración.

### B — Backend, seguridad y Auth

Avance visible: `Orbit.store` conserva autoridad única, rutas canónicas, digest sellado, cero fallback y snapshots condicionados a membership normal. El bloqueo restante es onboarding de identidades normales.

### C — Datos reales y migración

Avance visible: el snapshot canónico aceptado y sus conteos quedaron vinculados formalmente a RC1.2. No se reimporta ninguna fuente para resolver acceso o visualización.

## Cloud, Claude y Academia

```text
REPLICABLE_CLAUDE_ACUMULADO:
- manifiesto único producto + módulos + datos + acceso;
- separación entre candidata acumulativa y capacidad de visualización;
- digest canónico enlazado al store;
- validación sin repetir datos ni Gate 7.11.

BACKEND_PROTEGIDO_NO_CLAUDE:
- Firebase Auth;
- memberships;
- correos y UID;
- advisorId;
- credenciales temporales;
- writers y rollback.

ACADEMIA_ACTUALIZAR:
- diferencia entre información ausente e información inaccesible;
- release de código vs snapshot de datos;
- membership como precondición del store;
- PIPELINE_MECHANISM_FAILURE vs DATA_CONTRACT_FAILURE.
```

No se envió información externa a Cloud/Claude.

## Siguiente acción exacta

Un único macrobloque final debe:

1. reconciliar por digest el padrón aprobado contra Auth y los siete registros canónicos de asesores;
2. crear únicamente los usuarios Auth aprobados que falten, sin tocar usuarios existentes ni la identidad técnica;
3. usar credenciales temporales aleatorias no expuestas y no enviar invitaciones todavía;
4. crear o validar exactamente tres memberships normales con los roles aprobados;
5. resolver `advisorId` desde el registro canónico de Samuel;
6. ejecutar Gate 7.13;
7. tomar snapshot de datos y ancla de Hosting;
8. desplegar exclusivamente Hosting desde `b699ba329960cd830121b57452ce558399aa84fb`;
9. ejecutar smoke con Dirección, Operativo y Asesor y comprobar los 430 clientes y módulos reales;
10. ante cualquier fallo, restaurar Hosting, memberships y usuarios Auth creados en ese mismo macrobloque.

Prohibiciones vigentes: reimportación, Rules, Functions, main, merge y Gate 7.11.
