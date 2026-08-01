# Recuperación controlada — Materialización privada real de Cobros

Fecha: 2026-08-01  
Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado del producto

`PRIVATE_AUTHORIZATION_MATERIALIZATION_REAL_ATTESTED`

Las cinco referencias privadas continúan correctamente identificadas. El owner, las tarjetas y las fuentes no fueron modificados durante la recuperación.

```text
tarjetas materializadas en memoria: 5
recibos canónicos existentes: 4
recibo histórico reforzado: 1
pruebas privadas por tarjeta: 3
hashes registrados verificados: 3
referencias duplicadas: 0
idempotencias duplicadas: 0
```

## Historial del STOP_RETRY

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

La segunda falla no correspondía al producto. El validador buscaba el token plural `reactivatesPolicy:false`, mientras el owner canónico utiliza el campo `reactivatePolicy:false`. Las pruebas conductuales y la auditoría siempre confirmaron que ninguna tarjeta reactiva pólizas.

## Recuperación directa obligatoria

La usuaria autorizó proceder el 01/08/2026. Antes de reabrir el workflow se ejecutó el validador directamente fuera de GitHub Actions, usando una réplica temporal mínima de los archivos exactos de la rama y la evidencia cerrada del gate 10.7.

```text
modo: DIRECT_OUTSIDE_WORKFLOW
resultado: 64/64 PASS
fallos: 0
nuevo trigger utilizado: no
nuevo gateId utilizado: no
fuentes privadas abiertas: no
```

Evidencia sanitizada:

`orbit360-platform/docs/AUDITORIA-DIRECTA-RECUPERACION-GATE10.8-20260801.json`

La regla contractual quedó explícita:

```text
owner: reactivatePolicy = false
auditoría: reactivatesPolicy = false
prueba conductual: PASS
```

## Decisión de reapertura

`REOPEN_AUTHORIZED_AFTER_DIRECT_PASS`

Se permite una reapertura controlada del **mismo gate 10.8**, no la creación de otro gate. El workflow debe verificar primero la evidencia directa 64/64 y el SHA-256 del validador corregido.

Esta reapertura no elimina el historial de los dos fallos anteriores y no constituye autorización de escritura, deploy o producción.

## Privacidad y destrucción

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

## Caso histórico

La futura decisión afirmativa del quinto caso deberá autorizar expresamente una operación atómica:

```text
crear recibo histórico exigible
+ aplicar pago exacto
+ mantener póliza no renovada
+ no reactivar póliza
+ no crear finmov
```

## Siguiente acción exacta

Actualizar el mismo trigger 10.8 con la reapertura autorizada y ejecutar una sola corrida de cierre. Si pasa, registrar artifact y digest. Si falla por una causa distinta, congelar de nuevo sin abrir otro frente.

Producción y deploy continúan bloqueados hasta autorización explícita separada.
