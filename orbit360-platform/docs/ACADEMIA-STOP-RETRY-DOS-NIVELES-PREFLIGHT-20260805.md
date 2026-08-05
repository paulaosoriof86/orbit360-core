# Academia — STOP_RETRY y dos niveles de preflight

Fecha: 2026-08-05

## Aprendizaje

Un gate puede tener más de un nivel de validación:

```text
outer router canónico
→ lifecycle y capacidades
→ inner engine del módulo
→ secretos y ejecución
```

En el caso del Microbloque 2.1, el primer intento llegó al engine y detectó que este exigía contratos visuales retirados. Después de corregirlo, el segundo intento fue bloqueado antes por el outer router porque la revisión del lifecycle ya no coincidía con la composición canónica.

## Clasificación

```text
Primaria: VALIDATOR_STALE
Secundaria: PIPELINE_MECHANISM_FAILURE
```

No es `FUNCTIONAL_DEFECT` porque ninguna ruta del producto se ejecutó.

## Regla de modelado

No deben mezclarse estos conceptos:

```text
validatorLifecycleRevision
= composición estable del sistema de validación

visualHarnessRevision
= generación concreta del mecanismo de navegador
```

Cambiar la versión del arnés no debe cambiar la identidad de composición que exige el router.

## STOP_RETRY

Dos fallos en la misma etapa de preflight obligan a:

1. consumir y cerrar la autorización;
2. impedir un tercer run;
3. congelar producto, datos y secretos;
4. documentar owner y predicado exacto;
5. rediseñar source-only;
6. exigir un test estático integrado antes de solicitar otra autorización.

## Evidencia honesta

Un JSON generado no es autoridad absoluta. Cuando un campo fijo contradice los pasos observados del job, prevalece la evidencia de ejecución. En este caso, el JSON indicó cuatro Functions verificadas, pero el job se detuvo antes del deploy y registró cero de cuatro.

La Academia debe enseñar que los validadores también requieren control de calidad, trazabilidad y jerarquía de evidencia.
