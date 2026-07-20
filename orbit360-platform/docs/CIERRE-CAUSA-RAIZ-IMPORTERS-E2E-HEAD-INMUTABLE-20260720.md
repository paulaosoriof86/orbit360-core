# Cierre de causa raíz — Gate E2E con HEAD inmutable

Fecha: 2026-07-20  
Bloque: 1 — Cliente 360 + Aseguradoras  
Gate: `importers-e2e-acceptance-lab-v20260720`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción/main/merge: no autorizados

## Clasificación

```txt
PIPELINE_MECHANISM_FAILURE
MUTABLE_BRANCH_CHECKOUT_DRIFT
```

## Evidencia y causa raíz

La revisión v4 incorporó correctamente la membresía canónica, la UI legal real, el proveedor seguro, la auditoría y el rollback. Sin embargo, los jobs `preflight` y `e2e` continuaban haciendo checkout mediante el nombre de la rama:

```txt
ref: ays/backend-tenant-lab-v99-20260703
```

Durante la preparación del gate, la rama recibió commits concurrentes de Academia, bootstrap, membresía y runner. En consecuencia, un job podía validar un HEAD y el siguiente desplegar otro. Además, la combinación de eventos `push` y `pull_request` podía iniciar más de una ejecución para el mismo cambio.

Por tanto, cualquier ejecución iniciada antes de esta corrección no es evidencia aceptable para cerrar M1, aunque sus checks lleguen a completarse. No se clasifica como defecto funcional, fallo del archivo, del parser, del proveedor ni de los datos.

## Corrección vinculante

El workflow válido debe cumplir simultáneamente:

1. un único trigger `push` restringido a la rama autorizada y al propio archivo del workflow;
2. ausencia de `pull_request` y `workflow_dispatch` en esta revisión;
3. `cancel-in-progress: true` en el mismo grupo v4, para cancelar cualquier ejecución mutable anterior todavía activa;
4. ambos jobs hacen checkout con el SHA inmutable del evento:

```txt
ref: ${{ github.sha }}
```

5. el preflight verifica que existan exactamente dos checkouts fijados al mismo SHA;
6. el preflight bloquea referencias de checkout por nombre de rama;
7. el coordinador conserva el `git rev-parse HEAD` realmente desplegado;
8. la evidencia sanitizada incluye membresía, aceptación legal, proveedor, referencia opaca, read-after-write, auditorías y rollback.

## Regla de ejecución

La siguiente actualización del workflow es la única que puede disparar la revisión v4 inmutable. Los cambios documentales anteriores no disparan el gate porque el trigger está limitado al archivo del workflow.

Aceptación exclusiva:

```txt
GO_GATE_CONTRACT
immutableCheckoutOk: true
sameHeadAcrossJobs: true
membership ok: true
legalGateSatisfied: true
providerInvoked: true
remoteConfirmationObserved: true
readAfterWriteObserved: true
auditSuccessObserved: true
auditFailureObserved: true
noPlaintextSecret: true
rollbackOk: true
ok: true
```

Si esta ejecución falla, no se repite. Se clasifica el primer check real fallido y se conserva el rollback.

## Alcance y seguridad

- No reimporta Clientes ni Aseguradoras.
- No carga fuentes reales de Guatemala o Colombia.
- No avanza a Pólizas, Vehículos, Cobros o Comisiones.
- No modifica `main`, producción, DNS ni despliegues productivos.
- No expone contraseñas, tokens o valores de credenciales.
- La membresía LAB queda auditada con antes/después y confirmación reforzada.

## Claude y Academia

```txt
REPLICABLE_CLAUDE_ACUMULADO
ACADEMIA_ACTUALIZAR
BACKEND_PROTEGIDO_NO_CLAUDE
```

Patrón reusable: un gate no puede validar una rama mutable entre etapas. Cada ejecución debe fijar un único commit y conservarlo desde preflight hasta rollback. La Academia debe distinguir un fallo funcional de una deriva del pipeline.

## Siguiente acción exacta

```txt
1. Actualizar el workflow v4 con trigger único e immutable checkout.
2. Ejecutar automáticamente el preflight antes de secretos.
3. Ejecutar el mismo gate una sola vez sobre el SHA del evento.
4. Aceptar exclusivamente evidencia sanitizada ok:true.
5. Cerrar M1 solo si también se preservan 414 clientes, 26 aseguradoras, 77 portales y 7 asesores.
```
