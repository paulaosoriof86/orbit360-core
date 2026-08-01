# Acumulado Claude — Materialización privada efímera

Fecha: 2026-08-01  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

```text
referencias opacas
→ resolución privada en memoria
→ campos privados no enumerables
→ resumen sanitizado
→ destrucción explícita
```

El patrón reusable debe:

- impedir que los datos privados aparezcan en `JSON.stringify`;
- prohibir persistencia en repo y artifacts;
- exigir al menos dos pruebas de fuente por tarjeta;
- separar el caso histórico reforzado;
- mantener autorización y escritura en cero;
- destruir el payload al finalizar;
- conservar solo evidencia sanitizada.

## Owner local

`core/cobros-private-authorization-materializer-p0.js`

## Exclusiones

No compartir con Claude:

- identidades A&S;
- números de póliza o recibo;
- montos, fechas o fuentes reales;
- hashes privados;
- backend protegido;
- secretos o credenciales.

## Estado

Pendiente de incorporación en el siguiente paquete acumulado reusable.
