# CIERRE MICROBLOQUE 2.5 — STOP VISUAL CON PREVIEW LAB RETENIDO

Fecha local: 2026-08-05 06:24 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate: `GO_LAB_CANDIDATE_VISIBLE`  
Run: `31005103975`  
Job: `92302991333`

## Decisión

```text
Decisión técnica del workflow: GO_LAB_CANDIDATE_VISIBLE
Decisión final tras revisión manual: STOP_VISUAL_EVIDENCE_PREVIEW_RETAINED
Clasificación: PIPELINE_MECHANISM_FAILURE
Clasificación secundaria: VALIDATOR_STALE
```

La diferencia es obligatoria: el workflow técnico terminó correctamente, pero las ocho evidencias visuales no muestran el contenido de los módulos. Todas quedaron cubiertas por el modal `Acuerdos legales`.

## Resultado técnico aprobado

```text
preflight canónico: 32/32 PASS
Functions allowlisted: 4/4 verificadas
Hosting preview LAB: desplegado y retenido
visual exit: 0
integridad exit: 0
snapshot before/after: idénticos
Firestore writes: 0
Auth writes: 0
repetición de 18 escenarios: no
```

URL retenida:

```text
https://ays-orbit-360-lab--orbit360-operational-block12-w8ibrr6w.web.app
```

Artefacto:

```text
artifactId: 8930082733
digest: sha256:b2505e08e2bffa770386958575f233ad7daa6eeeafabb6aaeaadb1f2de8c62c1
expira: 2026-08-19T12:23:48Z
```

## Integridad observada

```text
clientes: 430
aseguradoras: 30
pólizas: 1,375
vehículos: 1,033
recibos esperados: 1,294
cartera: 673
cobros confirmados: 7
memberships: 1
pérdida observada: no
reimportación requerida: no
```

El hash del tenant antes y después fue idéntico.

## Hallazgo de revisión visual

Rutas afectadas:

1. Cliente 360;
2. Aseguradoras;
3. Pólizas;
4. Cobros;
5. Conciliaciones;
6. Ops;
7. Leads;
8. Importar.

En los ocho frames se observó el mismo bloqueo:

```text
Acuerdos legales
Aceptar y continuar
```

Por tanto, los PNG son archivos técnicamente válidos, pero no constituyen evidencia visual aprobable de los módulos.

## Causa raíz

Owner:

```text
tools/orbit360-block12-cumulative-visual-v20260804.mjs
```

El arnés crea un contexto aislado nuevo por ruta. Validaba:

- URL directa;
- autenticación;
- existencia y tamaño del video/frame;
- ausencia de errores de página.

No validaba que el contenido estuviera libre de overlays bloqueantes. Cada contexto nuevo presentó el modal legal, y el capturador clasificó ocho imágenes válidas por bytes como si fueran evidencia válida por contenido.

No se demostró:

- defecto funcional del módulo;
- pérdida o corrupción de datos;
- fallo de Functions;
- fallo de Hosting;
- fallo de integridad;
- fallo de seguridad.

## Root fix source-only

Commit:

```text
6c443d0f40e6874675f8c1980ef0cdb353120031
```

El arnés ahora detecta un modal legal bloqueante y detiene la captura con:

```text
PIPELINE_MECHANISM_FAILURE:ROUTE_<route>_LEGAL_MODAL_BLOCKING_CAPTURE
```

El correctivo no ejecutó navegador, Firebase ni deploy.

## STOP_RETRY

- autorización del Microbloque 2.5 consumida;
- ejecuciones restantes: 0;
- no rerun del run `31005103975`;
- request runtime v4 inmutable;
- URL retenida;
- Functions y Hosting no se redepliegan por este fallo de captura;
- no Rules, reimportación, producción, main o merge.

## Siguiente acción exacta

Microbloque 2.6:

```text
PASS_LEGAL_READINESS_CAPTURE_CONTRACT
SOURCE_ONLY
```

Debe definir y validar cómo satisfacer una sola vez el estado legal necesario para la identidad visual sin escribir en el tenant real ni en Auth. Solo después de ese PASS podrá solicitarse una autorización nueva para una recaptura exclusivamente de navegador contra la URL ya retenida, sin redeploy de Functions ni Hosting.
