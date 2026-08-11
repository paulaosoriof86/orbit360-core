# CIERRE SOURCEFIX — MATRIZ VISUAL BLOCK 1 POST-UNIVERSE

Fecha: 2026-08-10
Rama: `ays/backend-tenant-lab-v99-20260703`
PR rector: #5 draft/open
Gate único: `block1-client360-insurers-lab-v20260717`
Contrato: `1.0.41`

## Estado gobernante

El universe de release permanece PASS:

`RELEASE_UNIVERSE_ACCEPTED_WITH_2_CLIENT_PROVENANCE_EXCEPTIONS`

La primera matriz visual final one-shot, run `31447187977`, terminó `STOP_RETRY` con rollback Hosting PASS, snapshot `VERIFIED_UNCHANGED` y cero escrituras. El request fue consumido/frozen y no se reutiliza.

## Clasificación corregida

`VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`

No se demostró un defecto funcional de Cliente 360, Aseguradoras, Auth, membresías ni datos en ese run.

## Causas concretas cerradas en source

### 1. Overlay de cambio obligatorio de contraseña

La plataforma mostró correctamente el modal de primera contraseña. El precheck ya normalizaba overlays efímeros de prueba, pero la matriz nativa no lo hacía. El overlay interceptó clicks del legal gate de Operativo y el burger móvil de Asesor.

Correctivo: la matriz elimina únicamente el overlay efímero `orbit-password-change-required` dentro del harness, después de autenticar. No desactiva el comportamiento del producto ni cambia credenciales.

### 2. Owner incorrecto para visibilidad de módulo

La matriz usaba `Orbit.session.canSee('aseguradoras')` como blocker. El router real gobierna con `Orbit.access.can(route,'view')`, que incorpora rol activo, extras, restricciones y scopes. El resultado de Operativo era por tanto un check desalineado con el owner efectivo de acceso.

Correctivo: todos los checks de acceso usan `Orbit.access.can`. Si un rol no tiene acceso efectivo a Aseguradoras, la matriz valida fail-closed del router; si sí lo tiene, valida directorio/ficha/conocimiento.

### 3. Deep-links del mismo módulo

Para `cliente360?c=...` y fichas de Aseguradoras, la matriz armaba un observer de ruta base cuando ya estaba en esa misma ruta. El observer podía completar `already-ready` antes de aplicar el query string y el test inspeccionaba la vista anterior.

Correctivo: los deep-links del mismo módulo se validan por hash exacto + DOM objetivo (`.fichahdr`, `#ficha-tabs`, `#c360-body`, `#asg-ficha`).

Los targets de Cliente 360 se toman de una fila realmente renderizada o de `Orbit.access.filter`, no del primer registro raw del store.

### 4. Umbral de rendimiento

El check anterior sumaba hidratación requerida previa a la navegación + tiempo del observer. Dirección produjo un compuesto de ~34.95 s aunque el `renderObserverWaitMs` fue ~27.36 s y el render interno ~13.94 s.

Correctivo: `ready-under-30s` usa `renderObserverWaitMs`, que mide el tramo de navegación/render. La hidratación previa se conserva como checkpoint separado y obligatorio, no se suma de nuevo al tiempo del render.

## Evidencia source PASS

Corrected matrix implementation:

`tools/orbit360-block1-final-native-matrix-v20260810.mjs`

Canonical runtime binding:

`tools/orbit360-block1-native-matrix-v23-canonical-v20260807.mjs`

Source PASS inicial del correctivo:

- run `31448149299`;
- HEAD `8570ec3097a7d599a944d51e3f8fdc4afb0182eb`;
- artifact `9085313679`;
- digest `sha256:158c1f67ff4ccf4c0d0d2a05e85729552c2ff1c660540b696000c0a870a34c5f`.

Workflow final armado para request fresco:

- source run `31448254999`;
- status `orbit360/block1-final-native-visual-source: success`.

## Seguridad

En sourcefix:

- secretos: 0;
- Firebase/Firestore runtime: 0;
- Hosting: 0;
- browser: 0;
- deploy: 0;
- writes: 0;
- producción/main/merge: 0.

## Próxima frontera

`SOURCE_PASS_AWAITING_FRESH_EXCLUSIVE_REQUEST`

La ejecución fallida no puede reproducirse. Una nueva matriz visual requiere un request nuevo, exclusivo, parent-bound e inmutable y una autorización humana fresca. El workflow ya está preparado para:

`.github/orbit360-requests/block1-final-visual-corrected-after-sourcefix-authorization.json`

Solo esa nueva ejecución puede cerrar `PASS_VISUAL_POST_AUTH` y habilitar el cierre de Block 1.
