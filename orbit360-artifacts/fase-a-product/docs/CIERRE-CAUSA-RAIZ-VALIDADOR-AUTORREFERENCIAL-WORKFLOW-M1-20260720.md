# Cierre de causa raíz — Validador autorreferencial del workflow M1

Fecha: 2026-07-20  
Bloque: 1 — Cliente 360 + Aseguradoras  
Gate: `importers-e2e-acceptance-lab-v20260720`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción/main/merge: no autorizados

## Evidencia observada

La ejecución `29778772872`, sobre el commit `b1c9724e344025b3ef16e150c48bd636dacf3fae`, completó correctamente:

- checkout por SHA inmutable;
- Node 22;
- preflight contractual `GO_GATE_CONTRACT`.

Falló después en el paso `Validar mecanismo de SHA único`. El job E2E quedó omitido, por lo que no se invocaron el navegador, el proveedor seguro, el importador, el store, la auditoría ni el rollback.

## Clasificación

```txt
PIPELINE_MECHANISM_FAILURE
SELF_REFERENTIAL_WORKFLOW_VALIDATOR
```

No es un defecto de Cliente 360, Aseguradoras, los archivos fuente, el parser, la membresía, los datos ni el proveedor.

## Causa raíz

El workflow validaba su propia estructura mediante búsquedas literales sobre el texto completo del mismo archivo. Por ejemplo, buscaba la cadena `pull_request:` para asegurar que no existiera ese trigger, pero la propia instrucción de validación contenía literalmente esa cadena. El mismo patrón también podía producir falsos positivos o falsos verdes al revisar referencias de checkout y concurrencia.

La causa raíz general es:

> Una validación de estructura no puede basarse en buscar tokens libres dentro del archivo que contiene el propio validador. Debe inspeccionar los bloques y propiedades efectivas que representan la configuración.

## Corrección vinculante

El paso se sustituye por una inspección estructural sin dependencias externas que:

1. extrae únicamente el bloque superior `on`;
2. exige un solo trigger efectivo: `push`;
3. verifica la rama autorizada y que el path esté limitado al propio workflow;
4. obtiene exclusivamente las propiedades YAML `ref:` y exige dos checkouts, ambos fijados a `${{ github.sha }}`;
5. valida el bloque superior `concurrency`, su grupo único y `cancel-in-progress: true`;
6. no busca cadenas prohibidas en el texto completo;
7. no lee secretos ni ejecuta Firebase, navegador o proveedor.

## Regla de no repetición

No se crea un gate paralelo ni se reintenta el run fallido. El cambio del workflow dispara una sola ejecución nueva del mismo gate. Si vuelve a fallar la misma etapa, se detienen los reintentos y se diagnostica únicamente el parser estructural, sin modificar producto, módulos o datos.

## Alcance preservado

- No se reimportan Clientes ni Aseguradoras.
- No se cargan fuentes reales de Guatemala o Colombia.
- No se modifican `core/importa.js`, `data/store.js`, reglas, Auth ni módulos funcionales.
- No se avanza a Pólizas, Vehículos, Cobros o Comisiones.
- No se toca producción, `main`, merge, DNS ni hosting productivo.
- Se preservan 414 clientes, 26 aseguradoras, 77 portales y 7 asesores.

## Criterio de cierre

M1 solo puede cerrarse con evidencia sanitizada del mismo gate que demuestre:

```txt
GO_GATE_CONTRACT
sameHeadAcrossJobs: true
membership ok: true
browserAuthReady: true
activeRoleResolved: true
tenantResolved: true
legalGateSatisfied: true
providerInvoked: true
remoteConfirmationObserved: true
opaqueReferenceObserved: true
readAfterWriteObserved: true
auditSuccessObserved: true
auditFailureObserved: true
noPlaintextSecret: true
rollbackOk: true
ok: true
```

## Impacto Claude / prototipo reutilizable

```txt
REPLICABLE_CLAUDE_ACUMULADO
```

Patrón reusable: los validadores de arquitectura deben inspeccionar estructura o conducta real, no tokens libres que puedan aparecer dentro de comentarios, mensajes o del propio código de validación.

## Impacto en manuales y Academia

- Módulos modificados: ninguno.
- Manuales afectados: metodología de gates y causa raíz.
- Curso/ruta afectada: Dirección / Superadmin / IT.
- Contenido a incorporar: diferencia entre fallo funcional y validador autorreferencial; cómo validar estructura real; regla de detener reintentos.
- Implementación de Academia: diferida para no desplazar el cierre backend crítico.

## Siguiente acción exacta

1. Sustituir el autovalidador textual por la inspección estructural.
2. Permitir que el cambio del workflow dispare una sola ejecución.
3. Leer primero el preflight.
4. Solo con preflight aprobado, evaluar el E2E.
5. Cerrar M1 únicamente con `ok:true`; ante un fallo, congelar y clasificar el primer check real.
