# Cierre — Solución definitiva de lectura canónica y owner único

Fecha: 2026-08-01  
Gate: `block7-canonical-store-cumulative-adapter-static-v20260801`  
Contrato: `7.10.0`

## Veredicto

```text
CANONICAL_STORE_CUMULATIVE_ADAPTER_STATIC_CLOSED
GO_STATIC_CANONICAL_STORE_ADAPTER
```

PASS aceptado:

```text
run: 30732429713
job: 91455058689
artifact: 8828406898
artifact digest: sha256:69b839474c08c3e01c4c65b8899a331d788921e25be3acda935f0c94a76c9a4e
HEAD: 0203a2adb2dd0173c23c4a7d275ae340bd3bc0f6
preflight: 17/17
controles estáticos: 48/48
```

La evidencia equivalente más reciente también fue auditada:

```text
run: 30732451326
job: 91455115850
artifact: 8828413796
artifact digest: sha256:6abbd30d2abeab57abe6cd5f7d1e34fa449646709b5dca6b21ef1f387797bf72
HEAD: 5f3ec91e827b7b3ecb8a4fb4d8c493268632f9a4
preflight: 17/17
controles estáticos: 48/48
```

Esta segunda ejecución fue redundante y se clasificó como `PIPELINE_MECHANISM_DUPLICATE_STATIC_REPLAY`. No abrió secrets, Firestore, runtime ni navegador y no produjo escrituras. El disparador por push quedó eliminado, el despacho manual quedó bloqueado, el request quedó consumido y no se admiten nuevas ejecuciones del gate 7.10.

## Causa raíz

La plataforma tenía dos problemas estructurales relacionados:

1. El adaptador LAB presentaba como canónica una ruta que aún resolvía las siete colecciones migradas en `tenantId/{tenant}/{collection}`.
2. El bridge de Recibos y Cartera abría listeners Firestore y mantenía un cache paralelo fuera de `Orbit.store`.

La consecuencia era una arquitectura con varios propietarios de lectura. Cada módulo podía recibir datos desde una ruta o cache diferente, lo que favorecía correcciones aisladas, inconsistencias visuales y regresiones difíciles de reproducir.

## Solución aplicada

`Orbit.store` quedó como propietario único de lectura para el frontend acumulativo.

Las siete colecciones selladas por el gate 7.9 se resuelven en:

```text
tenants/{tenantId}/data/{collection}/items
```

Las colecciones todavía no migradas conservan temporalmente su ruta heredada, pero la decisión se toma una sola vez por colección:

```text
tenantId/{tenantId}/{collection}
```

No se mezclan dos autoridades dentro de una misma colección.

## Contrato preservado

La API pública continúa completa:

```text
all
get
where
find
insert
update
remove
on
_emit
pref
setPref
init
reseed
raw
```

También permanecen las extensiones de suscripción y diagnóstico ya utilizadas por los módulos.

## Calidad y seeds

Los cinco seeds canónicos permanecen físicamente disponibles para auditoría, pero quedan excluidos de forma central de:

```text
all / get / where / find / raw
```

La exclusión no filtra ni modifica `REQUIERE_VALIDACION`. Los estados de calidad continúan visibles y utilizables por permisos, gestiones y Academia.

## Owner único de lectura

El nuevo bridge visual de Recibos y Cartera:

```text
lee únicamente Orbit.store
listeners Firestore directos: 0
cache paralelo: no
reemplazo de métodos Orbit.store: no
```

El bridge anterior `backend-lab-receipts-portfolio-projection-v910.js` permanece en el repositorio como evidencia histórica, pero ya no se carga en runtime.

## Módulos y continuidad

```text
módulos rastreados: 62
módulos activos validados: 52
módulos dormidos: 10
violaciones Firestore en módulos activos: 0
```

El importador inicial LAB que contiene un fallback directo está clasificado como `TEMPORAL_RETIRO`: no está cargado por `index.html`, no aparece en loaders activos y tiene cero referencias de runtime.

No se modificó ningún módulo para obtener el PASS.

## Primer intento inválido

El primer intento falló con dos hallazgos que no eran defectos del producto:

- el scanner interpretó la palabra `localStorage` de un comentario como ejecución;
- el scanner trató un módulo dormido y no cargado como parte del grafo runtime.

Clasificación:

```text
VALIDATOR_STALE
```

Se corrigió el universo del validador antes de la segunda ejecución. No se modificaron archivos de producto para complacer el scanner.

## Replay de pipeline corregido

Después del PASS aceptado, una actualización del request coincidió con el cierre del lifecycle y produjo una ejecución estática redundante. La evidencia fue equivalente y no tuvo capacidades externas ni impacto de producto o datos.

Clasificación:

```text
PIPELINE_MECHANISM_DUPLICATE_STATIC_REPLAY
```

Correctivos definitivos:

```text
request consumido
workflow sin trigger por push
manual dispatch bloqueado
lifecycle cerrado
additionalExecutionsAllowed: false
```

## Delta de runtime

El cambio funcional quedó limitado exactamente a cinco archivos:

```text
orbit360-platform/index.html
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-canonical-view-sync.js
orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js
orbit360-platform/data/store-firestore-lab.local.js
```

Los 62 módulos y los 10 archivos de estilos permanecieron sin cambios.

## Nuevo manifiesto acumulativo

```text
archivos rastreados: 309
index: 1
modules: 62
core: 183
styles: 10
data: 53

pathDigest:
517056dee1200503b2e7295a333cb804bc71271bbaa87847fa762da025f276f1

contentDigest:
83cc01dacf180b8ca9693df7117030228479992d6db4c59fab53def2e94acafd

indexDigest:
b57b6581ee02d2dde42a8a2c1272d57f19b7ad6809d13a1d25111f3d71a96074
```

Este manifiesto sustituye el sello anterior de 308 archivos. Toda visualización futura debe usar esta candidata o un descendiente auditado.

## Seguridad

```text
secrets: no
Firestore read: no
Firestore writes: 0
operational writes: 0
reimportación: no
runtime: no
navegador: no
preview: no
deploy: no
producción: no
main: no
merge: no
```

## Próximo bloque

El siguiente trabajo no debe dividirse en nuevas verificaciones de datos ni microautorizaciones. Corresponde un solo bloque macro:

```text
LAB_CANONICAL_RUNTIME_AND_SINGLE_CUMULATIVE_VISUAL_REVIEW
```

Debe reutilizar el digest canónico del gate 7.9 y la solución 7.10, probar el runtime completo en modo read-only y entregar una única revisión visual acumulativa de Clientes, Aseguradoras, Pólizas, Vehículos, Recibos, Cartera y Cobros. Producción y cualquier deploy siguen siendo un límite de riesgo separado.
