# Academia — transporte inmutable por base SHA v10 — 2026-08-06

## Aprendizaje

Una rama identifica un nombre mutable. Un SHA identifica una procedencia inmutable.

El transporte runtime debe comprobar simultáneamente:

- rama head canónica;
- request exclusivo de un solo archivo;
- base SHA igual a `request.parentHead`;
- una sola ejecución;
- replay deshabilitado.

## Caso v10

El PR temporal usó correctamente la rama de activación como base para conservar un diff de un commit y un archivo. El runner comparó el nombre de esa base con la rama canónica y produjo un falso STOP.

```text
GO_GATE_CONTRACT: 28/28 PASS
backup v6 restaurado: PASS
nuevo backup/deploy/navegador: no ejecutados
clasificación: PIPELINE_MECHANISM_FAILURE
```

## Regla incorporada

```text
transportBaseSha == request.parentHead
```

La regla no permite cualquier rama base: exige que su commit exacto sea el padre autorizado del request.

## Diferencia metodológica

- `FUNCTIONAL_DEFECT`: falla el comportamiento visible del producto.
- `VALIDATOR_STALE`: la prueba conserva una expectativa de una fase anterior.
- `PIPELINE_MECHANISM_FAILURE`: el mecanismo de transporte impide ejecutar un contrato válido.

V10 pertenece a la tercera categoría.

## Roles

- Dirección: puede distinguir que el sistema no fue probado visualmente todavía.
- Operativo: no repite el run; corrige el transporte source-only.
- Equipo técnico: conserva request consumido, cero replay y evidencia exacta del estado de Hosting.
