# CIERRE SECURITY_FAILURE — COLISIÓN RULES LAB / SUBSTRATE PRODUCTIVO — RECIBOS/CARTERA 9.1.0

Fecha operativa: 2026-07-30 · Guatemala  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado de partida

Recibos/Cartera 9.1.0 ya estaba en `WRITE_PASS` con:

- `recibosEsperados`: 1293;
- `carteraPrimas`: 673;
- `cobros`: 0;
- `finmovs`: 0;
- históricos exigibles: 32 por Q13,443.48.

La proyección visual read-only había pasado su gate estático. Se autorizó exclusivamente Hosting LAB para publicar ese HEAD y ejecutar la revisión visual.

## Hosting LAB autorizado

Run: `30605735832`.

Resultado:

- deploy único al canal preview `orbit360-ays-lab`: PASS;
- paridad remota de activos críticos: `6/6`;
- producción, Functions, Rules, main y merge: no ejecutados por este bloque;
- revisión visual: FAIL en etapa `hydrate`.

La autorización de Hosting quedó consumida por ese único deploy. No se repitió el deploy.

## Diagnóstico read-only

Run `30605971192` confirmó:

- login Firebase válido;
- blocking legal gate resuelto;
- SDK inicializado;
- `clientes`, `aseguradoras`, `polizas`, `vehiculos`, `recibosEsperados` y `carteraPrimas`: 0 en navegador;
- proyección 9.1.0 no hidratada;
- cero escrituras.

Se probó la hipótesis de carrera de autenticación con replay read-only en run `30606190853`.

Resultado: la segunda autenticación tampoco recuperó snapshots. La hipótesis lifecycle race quedó descartada.

La evidencia del store mostró listeners adjuntos pero errores `Missing or insufficient permissions` en las colecciones canónicas.

## Clasificación definitiva

`SECURITY_FAILURE`.

Código de causa raíz:

`FIRESTORE_PROJECT_WIDE_PRODUCT_RULES_DENY_LEGACY_LAB_TENANTID_PATH`

## Causa raíz

Firebase Hosting preview channels comparten el mismo proyecto Firestore y, por tanto, las mismas Rules globales.

M6 cerró el substrate productivo read-only en el mismo proyecto `ays-orbit-360-lab`. El run M6 `30562624279` ejecutó exitosamente el paso `Publicar Firestore Rules read-only + Hosting`.

Las Rules productivas vigentes autorizan lectura únicamente en la ruta normalizada:

`tenants/{tenantId}/data/{collection}/items/{documentId}`

El frontend LAB heredado y los writers de los módulos posteriores a M6 operan todavía sobre:

`tenantId/{tenantId}/{collection}/{documentId}`

La regla productiva termina con deny-all para esa ruta. Por eso el Hosting LAB publicado era correcto y el usuario estaba autenticado, pero Firestore rechazaba los snapshots.

No es defecto de Recibos/Cartera, datos, writer, paridad Hosting, autenticación ni navegador.

## Remedio mínimo diseñado — todavía NO aplicado

Se diseñó una compatibilidad temporal de mínimo privilegio sobre las Rules productivas, sin abrir la ruta legacy completa.

Condiciones simultáneas propuestas:

1. tenant exacto `alianzas-soluciones`;
2. identidad técnica LAB canónica ya existente;
3. membership activo del tenant;
4. solo lectura;
5. únicamente estas ocho colecciones:
   - `clientes`;
   - `aseguradoras`;
   - `asesores`;
   - `polizas`;
   - `vehiculos`;
   - `recibosEsperados`;
   - `carteraPrimas`;
   - `cobros`;
6. todas las escrituras legacy continúan denegadas;
7. cualquier otra membership activa continúa sin acceso a la ruta legacy;
8. colecciones sensibles y `credentialRefs` continúan denegadas;
9. la ruta productiva normalizada y su read-only actual permanecen sin cambios.

Clasificación del puente: `TEMPORAL_RETIRO + BACKEND_PROTEGIDO_NO_CLAUDE`.

Debe retirarse cuando las colecciones posteriores a M6 estén migradas a la ruta productiva normalizada y el LAB ya no dependa de `tenantId/...`.

## Evidencia estática / emulador

La candidata se genera únicamente en runtime del runner; `firestore.product-readonly.rules` NO fue modificado.

Run final: `30606629580` · SUCCESS.  
Artifact: `8783834911`.  
Digest: `sha256:e647999c9990361f478d9be9fb8bef0c3766a56ede8c800778f13b2e7dd3e950`.

Checks PASS:

- usuario LAB lee colección legacy permitida;
- usuario LAB lee segunda colección legacy permitida;
- escritura legacy: DENIED;
- colección legacy sensible: DENIED;
- otra membership activa sobre legacy: DENIED;
- no autenticado sobre legacy: DENIED;
- lectura productiva normalizada: PRESERVADA;
- escritura productiva: DENIED;
- `credentialRefs`: DENIED;
- deploy: 0;
- Rules reales modificadas: no;
- producción tocada: no.

La candidata inerte quedó identificada por SHA-256:

`a78ad9e7ec3dc7277dda81d10ef223784d762f3b5d52e4040d9436679db7f4eb`

## Incidentes del harness estático — cerrados

Dos fallas de mecanismo ocurrieron antes de obtener la evidencia final:

1. `PIPELINE_MECHANISM_FAILURE`: se comparó Git blob ID contra SHA-256 de contenido;
2. `PIPELINE_MECHANISM_FAILURE`: `firebase-tools` actual requería Java 21+.

Se aplicó STOP_RETRY, se diagnosticaron ambas causas y se corrigieron únicamente los mecanismos correspondientes. La candidata de seguridad no se relajó para lograr PASS.

## Estado

`SECURITY_COMPAT_CANDIDATE_STATIC_PASS`.

No se autoriza ni se ejecuta aún ningún cambio de Rules.

## Siguiente frontera exacta

Se requiere una autorización específica para:

1. incorporar exactamente la compatibilidad mínima probada a `firestore.product-readonly.rules`;
2. ejecutar el gate canónico antes de secretos/Rules;
3. desplegar únicamente Firestore Rules al proyecto existente;
4. verificar que la ruta productiva siga read-only;
5. volver a ejecutar la revisión visual sobre el Hosting LAB ya publicado, **sin segundo deploy de Hosting**;
6. si la visual pasa, cerrar Recibos/Cartera y habilitar recién entonces Cobros/conciliación.

Esa autorización no incluirá Hosting, Functions, Storage, datos, main, merge ni Cobros.
