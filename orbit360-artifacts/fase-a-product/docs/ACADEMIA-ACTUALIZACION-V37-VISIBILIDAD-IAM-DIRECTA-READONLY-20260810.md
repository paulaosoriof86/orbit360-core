# ACADEMIA — V37 VISIBILIDAD IAM DIRECTA READ-ONLY

Fecha: 2026-08-10

Clasificación: `ACADEMIA_ACTUALIZAR`

## Aprendizaje

Un fallo de Policy Analyzer no demuestra que no existan administradores. Solo demuestra que la identidad diagnóstica no puede usar ese mecanismo de descubrimiento.

V37 enseña una alternativa de mínimo privilegio:

- probar primero `resourcemanager.projects.getIamPolicy`;
- leer la policy del proyecto solo si el permiso es efectivo;
- solicitar policy version 3 para conservar condiciones;
- no tratar grupo, dominio, binding condicional o custom role como identidad administradora inequívoca;
- no persistir principals reales;
- detenerse ante ambigüedad;
- separar diagnóstico read-only de cualquier futura remediación IAM.

## Resultado real v37

La prueba demostró que la cuenta LAB sí puede consultar la policy IAM del proyecto aunque no pueda usar Policy Analyzer.

Se observó exactamente un candidato administrativo directo source-verificado:

- tipo: `USER`;
- rol: `roles/owner`;
- identidad real: no persistida;
- fingerprint sanitizado: `c8c3e8ab1b4acf50a47c`;
- bindings ambiguos: 0;
- custom roles no verificables: 0.

No hubo modificaciones IAM ni lecturas de Firestore/Auth/Logging entries.

## Diferencia de causa

- `FUNCTIONAL_DEFECT`: comportamiento incorrecto del producto.
- `ENVIRONMENT_FAILURE`: el entorno no ofrece la capacidad necesaria para observar o ejecutar el diagnóstico autorizado.

V37 demuestra además que una brecha de observabilidad puede resolverse cambiando el mecanismo de lectura, no ampliando privilegios del principal bloqueado.

No justifica modificar Cliente 360, Aseguradoras, importadores ni datos.
