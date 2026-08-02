# Cierre — Diagnóstico de dependencias de padres HOLD 7.7

Fecha: 2026-08-01  
Gate: `block7-policies-hold-parent-dependency-diagnostic-readonly-v20260801`  
Contrato: `7.7.0`

## Resultado

```text
run: 30729179105
job: 91446254893
artifact: 8827379189
artifact digest: sha256:f1656d5f1a2a59468ba734e46574eb0536f1da19a640be3d5db535b5eeb794ec
HEAD ejecutado: ed5efd9a47f743dcef9d3c5fc252232213b3c9a1
preflight: 15/15
status: POLICIES_HOLD_PARENT_DEPENDENCY_DIAGNOSTIC_READONLY_PASS
classification: GO_LAB_HOLD_PARENT_DEPENDENCY_DIAGNOSED
```

El lifecycle quedó cerrado como `POLICIES_HOLD_PARENT_DEPENDENCY_DIAGNOSTIC_READONLY_CLOSED`. La autorización fue consumida y no habilita escrituras.

## Causa raíz confirmada

Los veinte padres excluidos del destino canónico no son residuos ni duplicados descartables. Todos mantienen `REQUIERE_VALIDACION`, están respaldados por trazabilidad, no tienen marcadores de seed y son utilizados por Pólizas operativas.

```text
Clientes HOLD: 16
Clientes HOLD referenciados: 16
Enlaces con Pólizas: 52

Aseguradoras HOLD: 4
Aseguradoras HOLD referenciadas: 4
Enlaces con Pólizas: 23

Intersección de Pólizas cliente + aseguradora HOLD: 0
Pólizas afectadas únicas: 75
```

La exclusión física del padre fue incompatible con la integridad referencial del read model. El estado pendiente de validación debe preservarse como atributo de calidad y acceso, no transformarse en inexistencia.

## Descendientes trazados

| Tipo | Dependientes de las 75 Pólizas | Paridad exacta en destino | Relaciones bloqueadas |
|---|---:|---:|---:|
| Vehículos | 47 | 47 | 0 |
| Recibos | 76 | 76 | 0 |
| Cartera | 38 | 38 | 0 |
| Cobros | 1 | 1 | 0 |
| **Total** | **162** | **162** | **0** |

Las 1,373 Pólizas migradas conservan paridad física exacta con la autoridad heredada. El problema no está en sus payloads, sino en la ausencia canónica de veinte padres necesarios.

## Clasificación de los padres

```text
MIGRATE_RESTRICTED_PRESERVE_REQUIRES_VALIDACION: 20
CREATE_CORRECTION_MANAGEMENT_BEFORE_PARENT_MIGRATION: 0
HOLD_NO_ACTIVE_POLICY_DEPENDENCY: 0
```

Los veinte padres son candidatos a una futura creación `create-only` en la ruta canónica, conservando íntegramente `REQUIERE_VALIDACION` y sin convertirlos en registros validados.

## Comparación de estrategias

### Incorporar padres restringidos

```text
CREATE propuestos: 20
Pólizas preservadas: 75
Vehículos preservados: 47
Recibos preservados: 76
Cartera preservada: 38
Cobros preservados: 1
```

### Retener dependientes fuera del read model

```text
Pólizas que deberían retenerse: 75
Vehículos: 47
Recibos: 76
Cartera: 38
Cobros: 1
```

Retener todos los dependientes amplificaría una validación pendiente de veinte padres hacia 237 documentos operativos. La recomendación no vinculante es incorporar los padres de forma restringida, preservando su estado pendiente.

```text
dryRunPlanDigest:
de72758f0f2097471bb9183879b8039154b0c063d79e7678393575a5a97f97c8
```

## Corrección estática previa

Antes de ejecutar se detectó que el acumulador de referencias trataba un `Map` como objeto plano. Se corrigió la función `add` en:

```text
tools/orbit360-diagnosticar-policies-hold-parent-dependencies-readonly-v20260801.mjs
```

Clasificación: `VALIDATOR_STALE` detectado antes de secrets y Firestore. No produjo corrida fallida ni evidencia de negocio inválida.

## Seguridad

```text
Firestore reads: sí
Firestore writes: 0
operational writes: 0
reimportación: no
frontend adaptado: no
navegador: no
preview: no
deploy: no
Rules: no
Functions: no
producción: no
main: no
merge: no
```

El gate 7.6 permanece congelado y no fue reabierto.

## Candidata acumulativa

```text
archivos rastreados: 308
pathDigest: 0c3dbf222646ea46b57e838359ac56fff3994268a97e0d682508bd747a29f3c4
contentDigest: 5b32b90815929acc341cfd4ae7c1e5f76d819e1a6a1b4091d13800508ab9b647
indexDigest: 54df4a1977573ccc6a0702bd0012f2835fcef4cb529e327d16918c4b420382a4
```

La futura visualización continúa obligada a usar la plataforma completa y un descendiente auditado.

## Aprobación humana

```text
Clientes: aprobado previamente
Pólizas: pendiente
Vehículos: pendiente
Recibos: pendiente
Cartera: pendiente
Resto CRM: pendiente
```

## Siguiente gate

La siguiente acción requiere autorización independiente para una escritura controlada `create-only` de exactamente dieciséis Clientes y cuatro Aseguradoras, con snapshot, idempotencia, preservación de `REQUIERE_VALIDACION`, post-verificación y rollback. No podrá adaptar frontend ni abrir visualización.
