# Cierre técnico parcial — Materialización privada real de Cobros

Fecha: 2026-08-01  
Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado del producto

`PRIVATE_AUTHORIZATION_MATERIALIZATION_REAL_ATTESTED`

Las referencias privadas de las cinco tarjetas del paquete 10.6 sí continuaban disponibles en el runtime seguro. Se resolvieron contra las fuentes registradas y los paquetes canónicos privados, sin solicitar archivos adicionales.

## Estado del gate 10.8

`STOP_RETRY_VALIDATOR_STALE`

El cierre formal del gate permanece bloqueado después de dos ejecuciones. No existe una tercera ejecución autorizada.

```text
primer run: 30708592194
primer fallo: predecesor 10.7 / AUDIT_STATUS
clasificación: VALIDATOR_STALE
segunda ejecución: 30708670724
predecesor 10.7: 46/46 PASS
gate 10.8: 63/64 PASS
único fallo: OWNER_reactivatesPolicy:false
clasificación: VALIDATOR_STALE
```

La segunda falla no corresponde al producto. El validador busca literalmente `reactivatesPolicy:false`, mientras el owner canónico expresa la misma prohibición con `reactivatePolicy:false` y las pruebas conductuales confirman que ninguna tarjeta reactiva pólizas.

Conforme a la regla de dos fallos en la misma etapa:

- se activa `STOP_RETRY`;
- no se crea otro trigger;
- no se ejecuta una tercera corrida;
- no se toca el owner ni las tarjetas;
- no se abre Firebase, navegador, deploy ni producción;
- la corrección futura deberá comenzar por el contrato del validador y probarse fuera del gate cerrado antes de reabrirlo.

## Resultado real preservado

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

Mantener congelado el gate 10.8. En el siguiente bloque de recuperación metodológica se deberá:

```text
alinear el nombre contractual del control owner/validator
→ ejecutar prueba estática directa del validador fuera del workflow
→ demostrar 64/64 sin nuevo trigger
→ registrar la corrección conjunta de owner/validator/workflow/docs
→ decidir explícitamente si se reabre el mismo gate
```

Hasta completar ese diagnóstico no se presentan decisiones privadas ni se prepara un gate de escritura.

## Corte documentado

```text
HEAD del segundo y último trigger: 7689c9d1e00967fc3f4333365443b79282584406
run final ejecutado: 30708670724
resultado final del gate: 63/64 PASS · BLOCKED
tercer run: prohibido
```
