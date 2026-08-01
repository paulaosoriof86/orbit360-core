# Claude acumulado — Materialización privada real de Cobros

Fecha: 2026-08-01  
Clasificación de datos: `SECRETO_DATO_REAL`  
Clasificación del patrón: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

```text
cola sanitizada
→ referencias opacas
→ resolución privada efímera
→ validación multifuente
→ resumen no sensible
→ destrucción del payload
→ decisión humana separada
→ gate de escritura independiente
```

## Reglas UX reutilizables

- mostrar categoría y nivel de confirmación sin exponer datos en evidencia técnica;
- separar visualmente casos directos e históricos;
- presentar el histórico al final;
- permitir aprobación o rechazo individual;
- advertir que preparar o revisar no equivale a aplicar;
- mostrar snapshot y rollback antes de una futura escritura;
- conservar estados honestos: pendiente, aprobado, rechazado, aplicado y revertido.

## Controles reutilizables

- mínimo dos fuentes por tarjeta;
- referencias e idempotencias únicas;
- datos privados no enumerables;
- serialización sanitizada;
- destrucción del payload del owner y del llamador;
- cero valores privados en repositorio y artifacts;
- autorización y escritura como fronteras distintas;
- operación histórica reforzada y atómica;
- prohibición de reactivar póliza;
- prohibición de crear `finmov` desde cobro.

## No transferir a Claude

- nombres reales;
- números de póliza o recibo;
- montos y fechas reales;
- hashes o filas de fuentes privadas;
- identificadores internos A&S;
- archivos de aseguradora;
- ejecutor backend;
- secretos o credenciales;
- decisiones de autorización.

## Impacto Academia

La candidata debe enseñar por rol la diferencia entre evidencia, materialización, autorización y escritura, incluyendo el tratamiento especial de obligaciones históricas exigibles.
