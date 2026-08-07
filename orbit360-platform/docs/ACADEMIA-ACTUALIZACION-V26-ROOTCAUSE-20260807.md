# Academia Orbit 360 — actualización v26 causa raíz

Fecha: 2026-08-07

## Aprendizaje v26

Un identificador recibido desde una fuente no se convierte automáticamente en identidad global. En deduplicación se debe distinguir identidad legal, país, tipo de entidad, procedencia y código operativo de la fuente.

Si dos registros comparten código pero la evidencia no prueba que sean la misma entidad, ambos se conservan y pasan a `REQUIERE_VALIDACION`. Ajustar datos para alcanzar un conteo esperado es un error metodológico.

Para procedencia de clientes, un fingerprint sanitizado permite comparar evidencia sin revelar PII, pero un hash one-way no reemplaza un locator. Si las fuentes ya existentes no contienen el locator relacionado, debe declararse la limitación y diseñarse una lectura focal posterior en vez de releer todo el universo.

## Diferencia de fallos

- `VALIDATOR_STALE`: la regla de validación contradice la fuente/contrato vigente.
- `DATA_CONTRACT_FAILURE`: un dato demostrado contradice el contrato.
- `REQUIERE_VALIDACION`: la evidencia no permite decidir legítimamente.
- `PIPELINE_MECHANISM_FAILURE`: el mecanismo impide ejecutar/interpretar el gate correctamente.

## Roles

Dirección debe exigir causa raíz antes de autorizar correcciones de datos. Operativo trabaja calidad y procedencia sin alterar el maestro por conveniencia. Asesor solo gestiona sus clientes dentro de permisos; no resuelve deduplicación maestra.

Clasificación: `ACADEMIA_ACTUALIZAR`.
