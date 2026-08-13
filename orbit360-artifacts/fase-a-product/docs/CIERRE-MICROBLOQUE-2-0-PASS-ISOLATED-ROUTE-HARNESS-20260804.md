# CIERRE MICROBLOQUE 2.0 — ARNÉS DE RUTAS AISLADAS

Fecha: 2026-08-04  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate: `PASS_ISOLATED_ROUTE_HARNESS`

## Resultado

```text
PASS_ISOLATED_ROUTE_HARNESS
run: 30971707956
status: ISOLATED_ROUTES_SYNTHETIC_PASS
classification: GO_PIPELINE_MECHANISM
```

## Mecanismo validado

```text
ONE_ISOLATED_BROWSER_CONTEXT_AND_DIRECT_URL_PER_ROUTE
```

Rutas verificadas:

1. Cliente 360;
2. Aseguradoras;
3. Pólizas;
4. Cobros;
5. Conciliaciones;
6. Ops;
7. Leads;
8. Importar.

Para cada ruta se confirmó:

- contexto aislado;
- URL directa;
- video no vacío;
- frame PNG válido;
- cierre independiente.

## Controles anti-reincidencia

No aparecieron los mecanismos prohibidos:

```text
location.hash =
HashChangeEvent(
getComputedStyle(
Page.captureScreenshot
page.screenshot(
newCDPSession(
```

Resultado técnico:

```text
routeCount: 8
elapsedMs: 7,302
inPageHashNavigationUsed: false
screenshotApiUsed: false
cdpScreenshotUsed: false
networkAccess: false
firebaseCommandsExecuted: false
firestoreWrites: 0
authWrites: 0
deployExecuted: false
productionTouched: false
```

## Decisión metodológica

La evidencia ya está sellada y no se repite. El request tenía una sola ejecución autorizada y fue consumido con PASS.

No se crea otro workflow, request, capturador o variante visual. La siguiente ejecución debe usar este mismo mecanismo dentro de una entrega LAB read-only.

## Siguiente acción exacta

Microbloque 2.1:

1. ejecutar el preflight contractual antes de secretos;
2. desplegar únicamente las cuatro Functions LAB allowlisted;
3. desplegar un solo Hosting preview LAB;
4. tomar snapshot A&S before;
5. abrir las ocho rutas con contexto aislado y URL directa;
6. tomar snapshot A&S after;
7. exigir integridad idéntica y cero escrituras;
8. retener la URL si producto e integridad pasan;
9. no repetir los 18 escenarios funcionales ya cerrados;
10. no eliminar la candidata por un fallo exclusivo de captura.

Gate siguiente:

```text
GO_LAB_CANDIDATE_VISIBLE
```

Este siguiente microbloque usa Firebase/Hosting LAB y por tanto queda sujeto a autorización explícita de despliegue LAB. Producción, Rules, main y merge permanecen prohibidos.
