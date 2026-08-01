# Cierre estático — Contrato de materialización privada de Cobros

Fecha: 2026-08-01  
Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado preparado

`PRIVATE_AUTHORIZATION_MATERIALIZATION_CONTRACT_READY`

El contrato resuelve en memoria las cinco referencias opacas del paquete 10.6 contra un payload privado temporal:

- cuatro tarjetas sobre recibos canónicos existentes;
- una tarjeta histórica con confirmación reforzada.

## Protección del payload

Los datos privados:

- no son enumerables dentro del resultado;
- no aparecen al serializar la evidencia;
- no se almacenan en el repositorio;
- no se incluyen en artifacts;
- deben destruirse explícitamente al finalizar la revisión;
- dejan un resumen sanitizado con conteos y controles, no identidades.

Cada tarjeta privada requiere al menos dos pruebas de fuente y conserva:

- cliente, aseguradora, póliza, recibo, moneda, monto y fecha únicamente en memoria;
- llave de idempotencia;
- diff antes/después;
- snapshot pre-write obligatorio;
- rollback;
- bloqueo de autorización y escritura.

## Caso histórico

La tarjeta histórica se presenta separada y debe ser la última del paquete. Una futura decisión afirmativa deberá autorizar expresamente la operación atómica:

```text
crear recibo histórico exigible
+ aplicar el pago exacto
+ no reactivar la póliza
```

## Límites

```text
packageGrantsAuthorization: false
authorizationGranted: 0
writeEligible: 0
persistAllowed: false
privateValuesPersisted: false
```

No se solicitaron archivos adicionales. La futura materialización usará únicamente las fuentes ya registradas y sus referencias privadas vigentes.

## Seguridad

```text
datos reales persistidos: 0
cobros writes: 0
finmovs writes: 0
Firestore writes: 0
operational writes: 0
browser: 0
deploy: 0
production: untouched
```

## Siguiente acción exacta

Cerrar el gate 10.7 estático. Después deberá resolverse si las referencias privadas necesarias siguen disponibles en el runtime seguro. Si están disponibles, se materializarán en memoria y se presentarán a Dirección; si no, se identificará exactamente la fuente privada faltante sin volver a pedir archivos ya registrados.
