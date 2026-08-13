# Bloque 1 — Causa raíz: integridad incompleta de activos críticos en Hosting

Fecha: 2026-07-21  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`

## Estado

```txt
STOP_THE_LINE_PIPELINE_INTEGRITY_MANIFEST_REQUIRED
```

M1 no está cerrado. La recuperación de datos sí está cerrada y preservada.

## Evidencia que activó el corte

Primera ejecución posterior a la prueba de idempotencia:

```txt
Run: 29878410649
Artifact: 8513852558
Digest: sha256:31b97dacab2de39c83e26dea51f9a31bcfbe765a234df425fe3c185ea46dca00
Error: INSURER_INACTIVE_REASON_MISSING
```

Después se implementó localmente el disparador estructural del directorio y el preflight estático aprobó:

```txt
Run: 29880098539
Artifact: 8514409370
Digest: sha256:4f76d49546560c94f92240e0aac94fe5cf1265ea415edd7fb174cdec5f4234cd
HEAD: a6b6641cc8d090930c8a7e9cfc6ad90ea239ff80
Contrato: 1.0.34
Resultado: GO_GATE_CONTRACT
Checks: 1126/1126
```

La prueba determinista del owner también permaneció aprobada:

```txt
27/27 checks
1 mutación base
1 transformación canónica
0 entregas posteriores del observer
```

La ejecución runtime posterior volvió a producir el mismo código:

```txt
Run: 29880654490
Artifact: 8514643781
Digest: sha256:abf9993db867297046559b5396a81f450df388f1e039a175af0dafa862704550
HEAD: 002ce73108221c62902c784d5f04282aa8eb6ee5
Error: INSURER_INACTIVE_REASON_MISSING
```

Por regla metodológica, la repetición del mismo código después del fix local detuvo los reintentos.

## Clasificación

```txt
PIPELINE_MECHANISM_FAILURE
VALIDATOR_STALE
```

No se clasifica nuevamente como defecto funcional de la tarjeta porque el fix local quedó probado, pero el pipeline no demostró que el navegador hubiese recibido esa revisión.

## Primera etapa real defectuosa

El workflow verificaba de forma exacta un solo archivo:

```txt
/modules/ia.js
```

No comparaba los activos que controlaban la entrega y la estabilidad visual:

```txt
/index.html
/core/router-tenant-config-bootstrap.js
/core/client-insurer-visual-stability-barrier-v20260721.js
/core/client-insurer-visual-contract-v20260720.js
/styles/client-insurer-visual-contract-v20260720.css
/core/pwa.js
/sw.js
/ays-lab-preview.html
```

El Router continuaba solicitando la barrera con:

```txt
client-insurer-visual-stability-barrier-v20260721.js?v=20260721-2
```

Mientras tanto, PWA, Service Worker y preview conservaban el build/cache `20260717-2`. La ejecución podía aprobar la integridad de `modules/ia.js` y aun así abrir el navegador con una barrera, Router o worker anterior.

## Causa raíz confirmada

> El pipeline confundía la integridad de un script auxiliar con la integridad del runtime crítico completo. No existía un manifiesto versionado que obligara a comprobar, antes del navegador, que índice, Router, barrera visual, contrato visual, estilos, PWA, Service Worker, preview e IA coincidieran byte por byte con el HEAD autorizado.

La evidencia runtime no permite afirmar que el navegador recibió la nueva barrera. Por tanto:

```txt
localProductFixInvalidated: false
runtimeReceivedNewBarrierProven: false
```

## Corrección estructural

Se creó:

```txt
tools/orbit360-critical-runtime-integrity-manifest-v20260721.json
```

Release:

```txt
block1-critical-runtime-20260721-4
```

El verificador existente evoluciona de un archivo a un manifiesto completo. Para cada activo debe validar:

1. existencia local;
2. sintaxis cuando corresponde;
3. cierre de owner cuando corresponde;
4. bytes locales;
5. SHA-256 local;
6. bytes remotos;
7. SHA-256 remoto;
8. coincidencia exacta.

El navegador solo podrá abrirse si todos los activos tienen `exactMatch:true`.

También se alinean:

```txt
Barrera visual: 20260721.4
Router / cache-buster visual: 20260721.4
PWA build: 20260721-4
Service Worker build/cache: 20260721-4
Preview critical release: block1-critical-runtime-20260721-4
Contrato del gate: 1.0.35
```

El contrato funcional del Cliente/Aseguradoras se conserva en `20260720.2`; cambia la revisión de entrega, no la API consumida por módulos.

## Datos y entornos tocados

```txt
Firestore operational writes: 0
Secret Manager writes: 0
Vault reads: 0
Reimportaciones: 0
Functions deploy: 0
Rules deploy: 0
Producción: intacta
Clientes: 414 preservados
Aseguradoras: 26 preservadas
Asesores: 7 preservados
Referencias históricas: 91 preservadas
Credenciales: 26 preservadas
Colombia: intacta
```

## Impacto Claude / prototipo reusable

Clasificación:

```txt
REPLICABLE_CLAUDE_ACUMULADO
```

Patrón reusable:

- un fix local no se considera desplegado por cambiar el código fuente;
- el release visual debe tener cache-busters coordinados;
- el navegador se abre solo después de integridad exacta del grafo crítico;
- un verificador parcial no puede declarar estable un runtime completo.

No se comparte:

- secretos;
- URLs privadas;
- datos A&S;
- implementación de credenciales;
- configuración sensible de Firebase.

## Impacto Academia

Academia M1 se actualiza para enseñar:

- preflight local vs bytes desplegados;
- manifiesto de integridad crítica;
- cache-busters coordinados;
- STOP THE LINE cuando un error se repite;
- por qué no se corrigen datos ni UX cuando falla el mecanismo de entrega.

## Siguiente acción exacta

```txt
1. Actualizar contrato 1.0.35, owners, tokens y archivos requeridos.
2. Ejecutar un único preflight estático del manifiesto.
3. No leer secrets, Firestore ni bóveda.
4. No desplegar ni abrir navegador.
5. Aceptar solo GO_GATE_CONTRACT + evidencia estática ok:true.
6. Solo después se podrá autorizar una ejecución runtime separada.
```
