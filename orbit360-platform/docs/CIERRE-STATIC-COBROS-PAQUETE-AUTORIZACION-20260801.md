# Cierre estático — Paquete sanitizado de autorización de Cobros

Fecha: 2026-08-01  
Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado

`AUTHORIZATION_PACKAGE_STATIC_READY`

La cola 10.5 contiene 70 casos. Solo cinco alcanzaron el umbral para presentarse a Dirección:

- cuatro pagos con evidencia directa y recibo canónico existente;
- un pago con evidencia directa que exige crear primero un recibo histórico exigible.

## Qué contiene el paquete

Cada tarjeta sanitizada incluye:

- referencia opaca;
- categoría de la operación;
- diff antes/después sin nombres, pólizas ni montos;
- llave de idempotencia;
- fuentes opacas;
- snapshot obligatorio antes de una futura escritura;
- rollback individual;
- estado de decisión pendiente.

El caso histórico aparece de último y separado de los cuatro directos. Exige confirmación reforzada y una futura operación atómica:

```text
crear recibo histórico exigible
+ aplicar pago exacto
+ conservar póliza vencida/no renovada
+ no reactivar póliza
```

## Qué no hace el paquete

- no concede autorización;
- no habilita `writeEligible`;
- no crea cobros;
- no aplica pagos;
- no crea `finmovs`;
- no consulta Firebase;
- no ejecuta navegador ni deploy;
- no almacena datos privados en el repositorio.

## Decisión parcial

Dirección podrá aprobar o rechazar cada tarjeta. La aprobación de los cuatro casos directos no implicará la aprobación automática del caso histórico. El caso histórico siempre exige decisión separada y reforzada.

## Casos excluidos

No ingresan al paquete:

- 24 casos de clearing temporal pendientes de revisión;
- 7 casos donde desaparece toda la póliza del snapshot;
- 34 casos HOLD por fuente, identidad o contrato de datos.

## Controles

```text
tarjetas: 5
directas: 4
histórica reforzada: 1
diffs presentes: sí
rollback presente: sí
idempotencia duplicada: 0
autorización concedida: no
writeEligible: false
```

## Seguridad

```text
identidades reales en repo: 0
números de póliza en repo: 0
montos reales en repo: 0
cobros writes: 0
finmovs writes: 0
Firestore writes: 0
operational writes: 0
production: untouched
```

## Siguiente acción exacta

Cerrar el gate 10.6 estático. Después podrá materializarse el paquete privado usando referencias opacas y las fuentes reales ya registradas. Esa materialización seguirá siendo read-only y no constituirá autorización de escritura.
