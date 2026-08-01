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

Los datos privados:

- no son enumerables dentro del resultado;
- no aparecen al serializar la evidencia;
- no se almacenan en el repositorio;
- no se incluyen en artifacts;
- deben destruirse explícitamente al finalizar la revisión;
- dejan un resumen sanitizado con conteos y controles, no identidades.

La regresión confirmó que, después de la destrucción, quedan `0` tarjetas privadas en memoria.

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

## Nota de consistencia documental

La evidencia principal de cierre está en este documento y en `AUDITORIA-READONLY-COBROS-MATERIALIZACION-PRIVADA-SANITIZADA-20260801.json`. Un intento posterior de enriquecer un registro secundario encontró conflicto de versión y fue descartado para evitar un cambio redundante; no se repitieron gates ni pruebas.
