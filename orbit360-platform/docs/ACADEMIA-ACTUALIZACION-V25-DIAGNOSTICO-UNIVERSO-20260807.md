# Academia Orbit 360 — actualización v25

Fecha: 2026-08-07

## Objetivo pedagógico

Distinguir entre conteo contractual, dato fuera de contrato y validador obsoleto sin forzar cifras ni tocar datos.

## Caso v25

El gate Block1 esperaba 414 clientes / 26 aseguradoras / 7 asesores. La lectura única v25 observó 430 / 30 / 7 raw; 414 clientes y 26 aseguradoras conservan tag del batch baseline. El clasificador genérico bajó Aseguradoras a 25 porque interpretó un código compartido como duplicado.

La fuente rectora de reconciliación demuestra que dos aseguradoras distintas pueden compartir ese código y deben quedar en `REQUIERE_VALIDACION`, no fusionarse. Por ello, el diagnóstico runtime inicial `DATA_CONTRACT_FAILURE` debe ser adjudicado como `VALIDATOR_STALE` para Aseguradoras. El contrato 26 permanece.

En Clientes, los 16 no-baseline carecen de señales objetivas de batch, timestamp, source o auditoría. Aunque están efectivos, no se puede decidir legítimamente si son altas posteriores o contaminación. Resultado: `REQUIERE_VALIDACION`.

## Regla reusable

1. Recuperar el baseline de procedencia.
2. Probar pertenencia por batch/manifest, no por posición.
3. Separar miembros baseline de registros posteriores.
4. Una clave de fuente solo es clave fuerte si el contrato de fuente garantiza unicidad.
5. Una colisión conocida y documentada debe conservarse como `REQUIERE_VALIDACION`, no convertirse automáticamente en duplicado.
6. Adjudicar el output del validator contra la fuente rectora antes de autorizar correcciones de datos.
7. Si falta evidencia para decidir, mantener `REQUIERE_VALIDACION`; no excluir hasta alcanzar un número esperado.
8. Emitir solo fingerprints y señales no PII en artifacts diagnósticos.

## Diferencia de causas

- `FUNCTIONAL_DEFECT`: producto se comporta incorrectamente.
- `VALIDATOR_STALE`: validator contradice un contrato/fuente rectora vigente.
- `DATA_CONTRACT_FAILURE`: el dato contradice un contrato demostrado.
- `REQUIERE_VALIDACION`: evidencia insuficiente para adjudicar legítimamente.

v25 terminó con causa compuesta: `VALIDATOR_STALE_IN_INSURER_DEDUPE_PLUS_UNRESOLVED_CLIENT_PROVENANCE` y decisión global `REQUIERE_VALIDACION`.

## Seguridad

La adjudicación LAB se ejecutó una sola vez, exactamente tres lecturas, cero writes, cero Auth reads, cero Hosting/browser. La adjudicación posterior de la causa fue source-only y no volvió a consultar LAB. La autorización quedó consumida/frozen.

## Roles

Dirección: entiende por qué no se toca un dato solo para hacer pasar un KPI.  
Operativo: distingue corrección de validator, corrección de dato y requerimiento de procedencia.  
Asesor: no participa en reconciliación maestra ni decide fusiones/exclusiones.

Clasificación: `ACADEMIA_ACTUALIZAR`.
