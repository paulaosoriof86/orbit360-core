# Academia Orbit 360 — Censo real vs contrato de acceso

Fecha: 2026-08-05

## Caso

El contrato operativo esperaba siete usuarios activos, pero el censo real encontró nueve registros que cumplían el criterio de actividad.

```text
contrato esperado: 7
estado runtime: 9
resultado: STOP_RETRY antes de escribir
```

## Lección principal

Un conteo visible o declarado no sustituye el censo de la fuente durable. Antes de crear identidades deben distinguirse:

- usuarios reales;
- registros duplicados entre rutas legacy y canónica;
- perfiles técnicos o demo;
- registros que debían estar inactivos;
- nuevas altas reales todavía no incluidas en el contrato.

## Evidencia segura

Ante un mismatch, el censo debe conservar sin PII:

```text
teamIdHash
emailHash
sourcePathClass
activeComputed
contractErrors
aliasGroup
resolutionCandidate
```

## Decisión correcta

No crear acceso para los nueve por defecto y no eliminar dos para forzar el conteo. Primero se determina si el contrato debe cambiar a nueve o si dos registros deben retirarse con motivo y auditoría.

## Diferencia de fallos

- `DATA_CONTRACT_FAILURE`: el estado real no coincide con el contrato aprobado.
- `PIPELINE_MECHANISM_FAILURE`: la evidencia de fallo no conserva suficiente detalle para identificar los registros fuera de contrato.
- `FUNCTIONAL_DEFECT`: la plataforma permite divergencia durable entre Equipo, Auth y memberships.

## Por rol

- Dirección: aprueba quién forma parte del equipo operativo real.
- Operativo: corrige registros duplicados o inactivos con trazabilidad.
- Asesor: recibe acceso únicamente cuando su registro, identidad y membership coinciden.
- Academia técnica: enseña por qué el STOP previo a escrituras protege el tenant.
