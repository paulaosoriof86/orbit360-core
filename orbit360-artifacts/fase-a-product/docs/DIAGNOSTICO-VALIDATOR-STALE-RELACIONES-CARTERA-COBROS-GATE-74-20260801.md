# Diagnóstico de causa raíz — Gate 7.4

Fecha: 2026-08-01  
Clasificación: `VALIDATOR_STALE`

## Evidencia observada

La primera ejecución read-only del gate 7.4 produjo:

- 673 registros de `carteraPrimas` en HOLD.
- 5 registros de `cobros` en HOLD.
- Motivo agregado: `poliza_o_recibo:AMBIGUOUS`.

## Causa raíz

El validador combinó en un solo conjunto dos relaciones distintas y válidas:

1. vínculo con Póliza;
2. vínculo con Recibo.

Al encontrar un identificador exacto de cada tipo, contó dos coincidencias dentro del mismo grupo y las clasificó como ambigüedad. En el contrato de negocio, tener ambas relaciones es correcto y fortalece la trazabilidad; no es una colisión entre candidatos del mismo tipo.

## Corrección requerida

- Validar `poliza` y `recibo` como grupos independientes.
- Considerar ambigüedad únicamente cuando existan varios candidatos dentro del mismo tipo de relación.
- Exigir relación exacta con ambos grupos para Cartera y Cobros.
- Recalcular el plan completo y su digest.

## Controles

La ejecución observada fue read-only:

```text
Firestore writes: 0
operational writes: 0
seed deletion: 0
frontend: sin cambios
browser/preview/deploy/production: 0
```

El resultado de 678 HOLD queda invalidado como evidencia de negocio. La autoridad operativa documental permanece vigente. La reanudación conserva exactamente el alcance autorizado y no añade capacidades.
