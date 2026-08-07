# Academia Orbit 360 — actualización v24 · evidencia estructurada del gate

Fecha: 2026-08-07  
Clasificación: `ACADEMIA_ACTUALIZAR`

## Lección nueva

Un gate no debe tomar decisiones críticas interpretando texto pensado para lectura humana cuando ya existe una evidencia JSON estructurada y versionada.

Caso v24:
- el gate canónico había pasado;
- stdout se imprimía en JSON pretty/multilínea;
- el consumidor tomaba solo la última línea (`}`);
- el parse fallaba y producía un falso STOP.

La corrección adecuada no fue cambiar Cliente360, Aseguradoras, PWA ni el owner, sino cambiar el canal de evidencia del consumidor.

## Regla enseñable

Para decisiones machine-readable:
1. usar una fuente estructurada explícita;
2. verificar que corresponda a la ejecución actual y no sea stale;
3. validar identidad de gate, versión, fase, owner, artefacto y capacidades;
4. fallar cerrado ante ausencia o inconsistencia;
5. mantener stdout únicamente como observabilidad humana, nunca como autoridad decisoria.

## Diferenciación de causas

- `FUNCTIONAL_DEFECT`: producto incumple el contrato.
- `VALIDATOR_STALE`: validator exige un owner/arquitectura/estado obsoleto.
- `PIPELINE_MECHANISM_FAILURE`: el mecanismo que transporta/interpreta la evidencia falla aun cuando productor y producto están correctos.

v24 es el tercer caso.

## Ejercicio sugerido

Un comando imprime:
```
{
  "status": "PASS",
  "ok": true
}
```

Un wrapper toma solo la última línea y obtiene `}`. El alumno debe identificar que no corresponde modificar el producto ni convertir el stdout a una sola línea; corresponde consumir la evidencia estructurada canónica y validar frescura/identidad.

## Impacto por rol

- Dirección/Superadmin/IT: lectura de gates, causas raíz y evidencia.
- Operativo/Asesor: sin cambio funcional por v24.
- Academia técnica: agregar diferencia entre log humano y contrato machine-readable.

## Evaluación

Incluir preguntas sobre:
- por qué stdout no debe ser autoridad de un gate;
- cómo detectar evidencia stale;
- qué campos mínimos deben validarse;
- por qué un falso STOP de transporte no autoriza tocar producto.
