# Cierre de causa raíz — Rollback de Secret Manager no ejecutado por dependencia ausente

Fecha: 2026-07-20  
Bloque: 1 — Cliente 360 + Aseguradoras  
Gate: `importers-e2e-acceptance-lab-v20260720`  
Run: `29782834288`  
HEAD: `2f4be2e0dfb609229701f6e972b876335913c605`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción/main/merge: no autorizados

## Avance funcional confirmado

El gate alcanzó por primera vez toda la ruta funcional:

```txt
browserAuthReady: true
activeRoleResolved: true
tenantResolved: true
legalGateSatisfied: true
sourceParsed: true
dryRunProduced: true
targetIdsResolved: true
providerInvoked: true
providerStatus: 200
remoteConfirmation: true
opaqueReferenceObserved: true
readAfterWriteOk: true
auditSuccessObserved: true
auditFailureObserved: true
plaintextSecretsInOperationalStore: false
```

La limpieza operativa también restauró:

```txt
clientes: 414
aseguradoras: 26
asesores: 7
```

El único predicado fallido fue `rollbackOk`.

## Evidencia del fallo

El coordinador registró:

```txt
membershipCode: 0
browserCode: 0
rollbackCode: 1
cleanupCode: 0
finalCode: 61
```

No se produjo `importers-e2e-vault-rollback-sanitized.json`. El script de rollback importa `@google-cloud/secret-manager` en el nivel superior, pero el workflow solo instaló dependencias en la raíz sin incluir ese paquete. Al no existir `package.json` raíz ni una instalación explícita del cliente de Secret Manager, Node terminó antes de crear la evidencia y antes de ejecutar cualquier operación de bóveda.

## Clasificación

```txt
PIPELINE_MECHANISM_FAILURE
ROLLBACK_RUNTIME_DEPENDENCY_MISSING
```

No es un fallo del importador, proveedor, membresía, acuerdo legal, store, auditoría, datos ni Secret Manager.

## Residuo sintético controlado

La limpieza Firestore eliminó la aseguradora sintética y sus auditorías, pero la versión sintética de bóveda no pudo retirarse. Para el run `29782834288`, el identificador opaco se deriva determinísticamente del tenant, fixture y portal. La corrección debe retirarlo sin revelar ni registrar el valor secreto.

## Corrección vinculante

1. Instalar explícitamente en la raíz del runner:

```txt
@google-cloud/secret-manager@6.2.0
```

2. Ampliar el owner `tools/orbit360-importers-e2e-vault-rollback-v20260720.mjs` para:
   - comprobar permisos declarados sobre el secreto antes del fixture;
   - soportar limpieza determinística por `runId` sin depender del archivo de estado perdido;
   - crear una nueva versión limpia preservando los demás registros;
   - destruir la versión transitoria que contenía el fixture;
   - verificar directamente la versión limpia creada;
   - producir evidencia sanitizada en todos los casos.
3. Ejecutar antes del nuevo gate la limpieza del run `29782834288`.
4. Bloquear el gate si la dependencia, permisos o limpieza del residuo no quedan aprobados.
5. Ejecutar el mismo gate una sola vez después de esos prechecks.

## Regla de no repetición

No se vuelve a abrir ninguna etapa ya aprobada. El siguiente gate reutiliza:

- proveedor vigente;
- membresía canónica;
- acuerdo legal real;
- parser y target resueltos;
- auditorías verificadas.

Solo se corrige el owner de rollback y su mecanismo de ejecución.

## Alcance preservado

- No reimportación de Clientes ni Aseguradoras.
- No fuentes reales GT/CO.
- No cambios en módulos funcionales, `core/importa.js`, `data/store.js`, Auth o rules.
- No avance a Pólizas, Vehículos, Cobros o Comisiones.
- No producción, `main`, merge, DNS ni hosting productivo.
- Cero valores secretos en evidencia o almacenamiento operativo.

## Impacto Claude / prototipo reutilizable

```txt
BACKEND_PROTEGIDO_NO_CLAUDE
ACADEMIA_ACTUALIZAR
```

Academia debe explicar que una limpieza operativa y un rollback de bóveda son capas diferentes; ambas deben quedar confirmadas antes de declarar éxito.

## Siguiente acción exacta

1. corregir el owner de rollback;
2. versionar el contrato del gate;
3. instalar y validar la dependencia de Secret Manager;
4. verificar permisos antes de cualquier escritura;
5. retirar el residuo sintético de `29782834288`;
6. ejecutar el mismo gate una sola vez;
7. cerrar M1 exclusivamente con `rollbackOk:true`, `ok:true` y conteos preservados.
