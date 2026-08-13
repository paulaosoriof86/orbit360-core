# Cierre estático — Contrato de materialización privada de Cobros

Fecha: 2026-08-01  
Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Veredicto

`COBROS_PRIVATE_MATERIALIZATION_STATIC_READY`

Gate `block10.7-cobros-private-materialization-static-v20260801`:

```text
run: 30706859578
artifact: 8820592721
digest: sha256:f90c8f2da85be677cc0caf821e868a88490c241f8294f19072678738b7f10536
checks: 46/46 PASS
```

El contrato resuelve en memoria las cinco referencias opacas del paquete 10.6 contra un payload privado temporal:

- cuatro tarjetas sobre recibos canónicos existentes;
- una tarjeta histórica con confirmación reforzada.

## Protección del payload

Los datos privados no son enumerables, no aparecen al serializar la evidencia, no se almacenan en el repositorio ni artifacts y deben destruirse explícitamente al finalizar. La regresión confirmó `0` tarjetas privadas restantes después de la destrucción.

Cada tarjeta privada requiere al menos dos pruebas de fuente y conserva en memoria cliente, aseguradora, póliza, recibo, moneda, monto y fecha, además de idempotencia, diff, snapshot y rollback.

## Caso histórico

La tarjeta histórica se presenta separada y de último. Una futura decisión afirmativa deberá autorizar expresamente:

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
privateCardsEnumerable: false
serializedPayloadContainsPrivateValues: false
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

Resolver si las referencias privadas necesarias siguen disponibles en el runtime seguro. Si están disponibles, materializar las cinco tarjetas solo en memoria, presentar el diff real a Dirección y destruir el payload al finalizar. Si no están disponibles, identificar exactamente la referencia o fuente privada faltante sin volver a pedir archivos ya registrados.
