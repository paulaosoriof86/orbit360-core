# Cierre de causa raíz — Falso negativo posterior al despliegue del proveedor M1

Fecha: 2026-07-20  
Bloque: 1 — Cliente 360 + Aseguradoras  
Gate: `importers-e2e-acceptance-lab-v20260720`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción/main/merge: no autorizados

## Evidencia vinculante

El run `29781660851`, sobre `23d6166e6237ac0af8211e126eb43240c3c0eac8`, devolvió código `1` en Firebase CLI y el gate lo interpretó como despliegue fallido.

El diagnóstico posterior, ejecutado en modo estrictamente read-only mediante el run `29782505370`, comprobó sobre las cuatro Functions:

- descritas: 4/4;
- activas: 4/4;
- entry points correctos: 4/4;
- cuentas ejecutoras correctas: 4/4;
- revisiones creadas y listas: 4/4;
- IAM legible: 4/4;
- ingreso callable disponible: 4/4;
- actualizadas dentro de la ventana temporal del run de despliegue: 4/4;
- membresía autorizada: true.

Clasificación read-only:

```txt
DEPLOYMENT_CONFIRMED_CURRENT
PROVIDER_AUTHORIZATION_LAYER_READY
```

Por tanto, el código corregido del proveedor sí fue publicado. El código de salida no representa el estado final real del despliegue.

## Clasificación de causa raíz

```txt
PIPELINE_MECHANISM_FAILURE
POST_DEPLOY_EXIT_FALSE_NEGATIVE
```

## Causa raíz

El gate utilizaba el código de salida del CLI como única condición de éxito y bloqueaba el importador antes de verificar el estado remoto. Esto produjo un falso negativo: las revisiones quedaron desplegadas y sirviendo tráfico, pero la etapa posterior exigió `deploy.ok === true` y detuvo el E2E.

La causa estructural es:

> La finalización de un despliegue remoto no puede decidirse únicamente por el exit code de la herramienta cliente. Debe confirmarse con el estado autoritativo del proveedor: revisión creada, revisión lista, tráfico efectivo, cuenta ejecutora e IAM.

## Corrección vinculante

El gate M1 se reestructura sin redeploy de Functions:

```txt
preflight contractual
→ verificación read-only de las cuatro revisiones vigentes
→ confirmación DEPLOYMENT_CONFIRMED_CURRENT
→ confirmación PROVIDER_AUTHORIZATION_LAYER_READY
→ gate integral del importador
→ read-after-write
→ auditoría de éxito y rechazo
→ rollback
→ evidencia sanitizada ok:true
```

El workflow queda obligado a:

1. no ejecutar `firebase deploy --only functions:*`;
2. no volver a publicar las cuatro Functions ya confirmadas;
3. utilizar el diagnóstico read-only v3 como precondición;
4. conservar SHA inmutable entre preflight y E2E;
5. ejecutar el mismo gate una sola vez;
6. detenerse en el primer check real fallido;
7. preservar 414 clientes, 26 aseguradoras, 77 portales y 7 asesores.

## Regla de no repetición

No se vuelve a diagnosticar ni desplegar el proveedor mientras:

```txt
DEPLOYMENT_CONFIRMED_CURRENT
PROVIDER_AUTHORIZATION_LAYER_READY
```

sigan vigentes. Un fallo posterior se clasifica en la etapa exacta del navegador, acuerdo legal, invocación, confirmación remota, store, auditoría o rollback. No puede regresar al deploy sin evidencia nueva de deriva de revisión.

## Alcance preservado

- No reimportación de Clientes ni Aseguradoras.
- No fuentes reales GT/CO.
- No cambios en módulos funcionales.
- No cambios en `core/importa.js`, `data/store.js`, Auth o rules.
- No avance a Pólizas, Vehículos, Cobros o Comisiones.
- No producción, `main`, merge, DNS ni hosting productivo.

## Impacto Claude / prototipo reutilizable

```txt
BACKEND_PROTEGIDO_NO_CLAUDE
ACADEMIA_ACTUALIZAR
```

Patrón de Academia: distinguir entre salida de una herramienta cliente y estado autoritativo remoto; el deploy se confirma por revisión lista y tráfico, no solo por exit code.

## Siguiente acción exacta

1. actualizar el contrato del gate a proveedor vigente sin redeploy;
2. retirar del workflow integral la etapa de despliegue de Functions;
3. validar la revisión actual en modo read-only;
4. ejecutar el importador E2E una sola vez;
5. cerrar M1 exclusivamente con evidencia sanitizada `ok:true` y conteos preservados;
6. ante un fallo, congelar y clasificar el primer check real sin regresar a etapas ya cerradas.
