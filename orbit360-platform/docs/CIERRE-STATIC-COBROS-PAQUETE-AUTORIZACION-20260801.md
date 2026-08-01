# Cierre estático — Paquete sanitizado de autorización de Cobros

Fecha: 2026-08-01  
Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Veredicto

`COBROS_AUTHORIZATION_PACKAGE_STATIC_READY`

Gate `block10.6-cobros-authorization-package-static-v20260801`:

```text
run: 30706617835
artifact: 8820517805
digest: sha256:9ce3e47aea62840e4debb40faad6e12cda29f480e9b0daec929176af60e5b05b
checks: 58/58 PASS
```

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
autorización concedida: 0
writeEligible: 0
```

## Causa raíz del primer intento

El primer run `30706550799` se detuvo antes de ejecutar el paquete. El validador predecesor 10.5 exigía de forma literal el bootstrap `20260801.4`; la incorporación legítima del owner del paquete elevó el bootstrap a `20260801.5`.

Clasificación: `VALIDATOR_STALE_PREDECESSOR_BOOTSTRAP_EXACT_VERSION`.

Se congeló el producto y se corrigió únicamente el validador 10.5 para comprobar:

```text
owner de cola presente
+ capacidad requerida
+ bootstrap mínimo >= 4
```

La segunda y última ejecución del gate 10.6 pasó 58/58. No hubo un tercer intento ni modificación del owner del paquete después del fallo.

## Seguridad

```text
identidades reales en repo: 0
números de póliza en repo: 0
montos reales en repo: 0
cobros writes: 0
finmovs writes: 0
Firestore writes: 0
operational writes: 0
browser: 0
deploy: 0
production: untouched
```

## Continuidad

El contrato de materialización privada fue cerrado posteriormente por el gate 10.7. Los datos reales de las cinco tarjetas todavía no han sido materializados; solo quedó preparado y validado el mecanismo efímero.
