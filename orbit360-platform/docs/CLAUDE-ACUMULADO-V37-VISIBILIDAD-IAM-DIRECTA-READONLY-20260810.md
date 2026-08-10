# CLAUDE ACUMULADO — V37 VISIBILIDAD IAM DIRECTA READ-ONLY

Fecha: 2026-08-10

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Cuando una identidad diagnóstica no puede usar un analizador IAM global:

1. no elevar privilegios ni repetir el mismo analizador;
2. probar primero una capacidad de lectura puntual mediante `testIamPermissions`;
3. ejecutar la lectura directa solo si el permiso es efectivo;
4. pedir la versión de policy que preserve condiciones;
5. procesar la policy únicamente en memoria;
6. convertir principals a fingerprints antes de persistir evidencia;
7. distinguir candidatos directos de grupos, dominios, bindings condicionales y roles custom no verificados;
8. ante ambigüedad, detener sin inferir ausencia de administrador;
9. mantener cero writes y request de una sola ejecución.

## No replicar

- identidades reales;
- principals/correos;
- policies raw;
- secretos;
- IDs de service accounts;
- datos del tenant.
