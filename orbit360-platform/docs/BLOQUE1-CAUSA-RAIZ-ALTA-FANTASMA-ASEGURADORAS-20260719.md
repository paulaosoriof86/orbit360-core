# Bloque 1 · Causa raíz de alta fantasma en Aseguradoras · 2026-07-19

## Clasificación

`FUNCTIONAL_DEFECT` con consecuencia `DATA_CONTRACT_FAILURE`.

## Evidencia

- Baseline: 26 aseguradoras.
- Desviación observada: 27.
- La entidad adicional tenía identidad única, país GT, estado activo/no vinculado y fecha de creación durante la revisión visual.
- La huella correspondió al nombre genérico `Nueva aseguradora`.
- El código propietario insertaba ese registro al pulsar el botón, antes de guardar.
- El bridge seguro no intervenía porque buscaba atributos inexistentes en lugar de los IDs reales.

## Corrección

- Bridge conectado a `#asg-new` y `#asg-imp` además de los atributos reutilizables.
- Listeners legados retirados mediante reemplazo controlado del botón.
- Alta solo después de nombre, país y motivo.
- Cancelar no escribe.
- Owner gate valida selectores y orden de guards antes de la inserción.

## Saneamiento LAB

El placeholder exacto fue retirado mediante contrato idempotente, cero relaciones, auditoría y rollback. Verificación final: 26 aseguradoras y cero relaciones del placeholder.

## Preservado

Sin reimportación, sin cambios a las 26 entidades canónicas, sin producción, merge o main. Store, Auth, Router, reglas y datos de Clientes permanecen intactos.
