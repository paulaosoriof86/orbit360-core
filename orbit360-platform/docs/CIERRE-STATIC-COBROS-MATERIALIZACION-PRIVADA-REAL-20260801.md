# Cierre estático — Materialización privada real de Cobros

Fecha: 2026-08-01  
Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado

`PRIVATE_AUTHORIZATION_MATERIALIZATION_REAL_ATTESTED`

Las referencias privadas de las cinco tarjetas del paquete 10.6 sí continuaban disponibles en el runtime seguro. Se resolvieron contra las fuentes registradas y los paquetes canónicos privados, sin solicitar archivos adicionales.

## Resultado real

```text
tarjetas materializadas en memoria: 5
recibos canónicos existentes: 4
recibo histórico reforzado: 1
pruebas privadas por tarjeta: 3
hashes registrados verificados: 3
referencias duplicadas: 0
idempotencias duplicadas: 0
```

La identificación coincide exactamente con el contrato del replay 10.2:

- cuatro casos enlazan un recibo canónico existente;
- un caso pertenece a una vigencia reciente no renovada y requiere crear primero un recibo histórico exigible;
- el caso histórico quedó de último y separado;
- los cuatro HOLD del replay no ingresaron al paquete.

## Fuentes verificadas

Se comprobaron por hash exacto:

1. pagos reportados del CRM;
2. reporte de pagos de Aseguradora General;
3. reporte de pagos de Mapfre.

También se confirmó la disponibilidad de los paquetes canónicos privados de Pólizas y Recibos/Cartera.

No se usaron como autoridad de pago:

- estados bancarios;
- planillas de comisiones;
- movimientos financieros;
- archivos históricos desactualizados.

## Privacidad y destrucción

Los valores reales vivieron únicamente durante la sesión efímera. El resultado persistido contiene solo referencias opacas, categorías y controles.

```text
campos privados enumerables: no
valores privados serializados: no
payload privado del owner destruido: sí
input privado del llamador destruido: sí
tarjetas privadas restantes: 0
inputs privados restantes: 0
filas reales almacenadas en repo: 0
```

## Límites vigentes

```text
autorizaciones concedidas: 0
writeEligible: 0
packageGrantsAuthorization: false
cobros writes: 0
finmovs writes: 0
Firestore writes: 0
operational writes: 0
browser: 0
deploy: 0
production: untouched
```

La materialización no concede autorización y no constituye una escritura.

## Caso histórico

La futura decisión afirmativa del quinto caso deberá autorizar expresamente una operación atómica:

```text
crear recibo histórico exigible
+ aplicar pago exacto
+ mantener póliza no renovada
+ no reactivar póliza
+ no crear finmov
```

Su autorización permanece separada de los cuatro casos directos.

## Siguiente acción exacta

Cerrar el gate 10.8 estático. Después, la siguiente frontera será presentar las decisiones a Dirección mediante un canal privado autorizado. Cualquier ejecución posterior requerirá un gate independiente de escritura con snapshot, idempotencia, operación atómica y rollback.
