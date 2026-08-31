# Orbit 360 A&S — Plan Maestro Congelado de Recuperación Limpia Fase A

Fecha de congelación: 2026-08-31
Rama de recuperación: `recovery/fase-a-clean-20260831`
SHA forense de origen: `9c95f31461f2eabe9804625b5659bee772f5602a`
Repositorio: `paulaosoriof86/orbit360-core`

## 1. Objetivo no negociable

Recuperar y publicar hoy una Fase A estable de Orbit 360 que sirva exactamente la última versión aprobada de cada módulo/capacidad incluida en Fase A, sin volver a desarrollar los módulos, sin reimportar datos durante la recuperación del software y sin seguir acumulando overlays/rootfixes sobre el mecanismo anterior.

La definición de versión correcta es obligatoriamente:

`aceptación aprobada -> source exacto -> dependencia alcanzable -> artefacto inmutable -> preview exacto -> browser E2E -> mismo artefacto promovido -> producción exacta`.

Un SHA de ZIP o la mera presencia de un archivo en el paquete NO son evidencia suficiente de versión correcta.

## 2. Reglas duras congeladas

1. No crear un repositorio nuevo. Este repositorio conserva toda la historia forense y la recuperación vive en una rama limpia independiente.
2. No crear un nuevo proyecto Firebase para esta salida. Se usa el proyecto Firebase actualmente conectado a A&S, con un Hosting preview/channel aislado antes de producción. Una separación futura DEV/STG/PROD podrá evaluarse después del go-live, fuera de este alcance.
3. No crear un proyecto nuevo de ChatGPT como requisito. Ninguna conversación es fuente de verdad. GitHub y los artefactos de CI son la autoridad.
4. No modificar producción durante las iteraciones 0 a 4.
5. No reimportar ni actualizar datos de negocio durante las iteraciones 0 a 5. El dataset operativo se conserva con corte conocido al 2026-07-31 mientras se estabiliza el software.
6. No volver a utilizar `baseline histórico + overlays` como mecanismo normal de publicación.
7. No reconstruir el artefacto después de haberlo certificado. El mismo digest probado en preview es el único que puede promoverse a producción.
8. No reabrir un módulo funcional cerrado para reinterpretarlo. Se reconstruye su última aceptación comprobable y se valida end-to-end.
9. No usar el `index.html` LAB como autoridad productiva. La recuperación produce UN SOLO entrypoint productivo canónico, generado desde el manifiesto aprobado.
10. Todo runtime scratch, screenshots, browser evidence, terminal evidence y archivos temporales deben quedar fuera del árbol de producto/publicación.
11. La rama vieja y sus documentos quedan como historia forense, no como mecanismo activo de release.
12. No se autoriza merge a `main` como requisito de esta salida. `main` no es actualmente autoridad de release.

## 3. Regla de Aseguradoras — corrección explícita

No debe existir ocultamiento accidental de las capacidades operativas de Aseguradoras para roles autorizados.

Roles que deben visualizar y operar el directorio completo, incluyendo usuario, contraseña/revelado y cuentas según el contrato funcional final:

- `Operativo`
- `Admin` / `AdminTenant`
- `SuperAdmin`
- `Dirección` se conserva como rol autorizado existente mientras no exista una instrucción posterior que lo retire.

`Asesor` no se incorpora a esta autorización en esta recuperación salvo aceptación funcional explícita posterior.

La autorización se prueba por capability y rol. No se acepta una solución basada solo en esconder/mostrar DOM.

## 4. Alcance Fase A a reconstruir y certificar transversalmente

Como mínimo:

- Inicio
- Cliente 360
- Aseguradoras
- Ops
- Leads
- Pólizas
- Vehículos
- Recibos y cartera
- Cobros
- roles y scopes
- sincronizaciones y relaciones entre módulos
- login / acceso
- shell / router / navegación
- hidratación de datos
- PWA/service worker solo si no bloquea startup

La iteración 1 debe reconstruir desde evidencia histórica cualquier capacidad adicional que ya hubiese sido formalmente aprobada para Fase A y agregarla al manifiesto antes del build limpio.

## 5. Causa arquitectónica que esta recuperación elimina

La rama histórica tiene dos verdades distintas de entrada:

- el `index.html` de source continúa siendo LAB;
- producción usa un `index.html` materializado/certificado distinto.

Además, el artefacto certificado tiene una superficie de arranque de más de cien scripts directos, bootstrap dinámico adicional, hidratación de varias colecciones antes de mostrar la app y esperas PWA/readiness que pueden prolongar el acceso.

La recuperación elimina esta bifurcación y crea un único entrypoint productivo reproducible.

## 6. Arquitectura de release congelada

### Autoridades únicas

1. `orbit360-recovery-state-v1.json` — único estado mutable de la recuperación.
2. `orbit360-approved-capability-manifest-v1.json` — inventario canónico de capacidades/versiones aprobadas.
3. Este Plan Maestro — proceso y gates, inmutable salvo versión sucesora explícita.

### Flujo

`historia/aprobaciones -> capability manifest -> clean source tree -> build once -> immutable artifact -> preview -> full E2E -> promote same artifact -> postprod smoke -> data refresh separado`.

## 7. Iteraciones cerradas

### ITERACIÓN 0 — FREEZE FORENSE Y AUTORIDAD

Objetivo: impedir que la recuperación dependa del HEAD móvil de la rama histórica.

Entradas:
- SHA `9c95f31461f2eabe9804625b5659bee772f5602a`.
- baseline certificado `9504702901` solo como evidencia histórica, no como base automática del release final.

Tareas:
- congelar rama de recuperación;
- crear estado y manifiesto;
- registrar decisiones duras;
- bloquear en esta rama cualquier mecanismo viejo de overlay/reseal como release path.

Salida PASS:
- rama independiente;
- documentos autoridad presentes;
- SHA de origen fijado.

### ITERACIÓN 1 — RECONSTRUCCIÓN DE ÚLTIMA VERSIÓN APROBADA DE TODOS LOS MÓDULOS FASE A

Objetivo: resolver la pregunta que el mecanismo anterior nunca cerró transversalmente: cuál es la última versión aprobada de cada capability.

Por cada capability:
- módulo/superficie;
- aceptación/run/commit/artefacto de origen;
- archivos implementadores;
- owners/bridges necesarios;
- dependencias;
- rol esperado;
- prueba de aceptación original;
- SHA/blob exacto elegido;
- razón para descartar versiones anteriores/posteriores no aprobadas.

No se permitirá inferir que el baseline actual es el último solo porque el archivo no cambió después.

Salida PASS:
- 100% de capabilities Fase A tienen lineage único y comprobable;
- cero capacidades con dos owners activos ambiguos;
- cero archivos aprobados huérfanos/no alcanzables.

### ITERACIÓN 2 — CLEAN SOURCE + ENTRYPOINT ÚNICO + PERFORMANCE STARTUP

Objetivo: generar una versión productiva coherente y eliminar la bifurcación LAB/producto.

Tareas obligatorias:
- crear árbol de producto limpio;
- crear un único `index.html` productivo canónico desde el capability manifest;
- excluir `backend-lab-*`, `store-firestore-lab*`, `seed` LAB y `auth` LAB del entrypoint productivo;
- absorber overlays aprobados en archivos finales, sin overlay runtime;
- eliminar/suspender owners duplicados o shadowed;
- validar que cada asset aprobado sea alcanzable y ejecutable;
- versionar assets por digest/build;
- separar arranque pre-auth de módulos post-auth cuando sea seguro;
- no exigir que PWA/service worker controle la página para permitir login;
- no bloquear showApp por colecciones opcionales;
- mantener required collections estrictamente en el mínimo necesario para Inicio/Cliente360/Aseguradoras/Ops/Leads/Polizas/Cobros;
- medir startup y eliminar esperas artificiales/seriales no indispensables.

Gate de rendimiento mínimo:
- login visible inmediatamente con shell pre-auth;
- autenticación no espera service worker;
- módulos no esenciales no bloquean el primer render;
- ningún timeout de 30/120 segundos puede ser parte del flujo normal exitoso.

Salida PASS:
- clean source tree;
- entrypoint único;
- dependency/reachability graph PASS;
- startup contract PASS.

### ITERACIÓN 3 — BUILD ÚNICO E INMUTABLE + PREVIEW AISLADO

Objetivo: producir exactamente una candidata.

Tareas:
- build una vez;
- manifest completo con SHA-256 de todos los archivos;
- artifact digest único;
- cero reconstrucción posterior;
- publicar ESE artifact en Firebase Hosting preview/channel del mismo proyecto;
- no tocar producción.

Salida PASS:
- URL preview;
- artifact id/digest;
- readback remoto completo coincide con manifest.

### ITERACIÓN 4 — MATRIZ E2E TRANSVERSAL `APROBADO vs PREVIEW`

Objetivo: certificar semántica real, no solo archivos.

Matriz mínima:
- superficies Fase A x roles aplicables x desktop/tablet/mobile.

Pruebas obligatorias:
- login;
- Inicio;
- Cliente360;
- Aseguradoras;
- Ops;
- Leads;
- Polizas;
- Vehículos;
- Recibos/cartera;
- Cobros;
- relaciones entre cliente/póliza/vehículo/cobros;
- navegación;
- permisos;
- ausencia de controles indebidamente ocultos para Operativo/Admin/SuperAdmin;
- ausencia de controles indebidamente habilitados para roles no autorizados;
- 404/asset failures;
- page errors y console errors relevantes;
- version/digest runtime;
- PWA/service worker no sirve un build anterior;
- datos read-only íntegros antes/después.

Gate:
- 100% PASS en capacidades Fase A;
- cualquier fallo se corrige EN LA CLEAN SOURCE y obliga a nuevo artifact/digest, nunca parche directo en preview/producción.

### ITERACIÓN 5 — PROMOCIÓN A PRODUCCIÓN DEL MISMO ARTEFACTO

Objetivo: promover sin recomposición.

Precondiciones:
- Iteraciones 0-4 PASS;
- artifact preview congelado;
- autorización explícita de producción sobre digest exacto.

Tareas:
- promover exactamente el artifact certificado;
- remote full rehash;
- browser smoke corto;
- login;
- roles clave;
- superficies Fase A;
- integridad before/after;
- rollback automático al último release conocido si falla cualquier gate.

Salida PASS:
- producción sirve exactamente el digest certificado;
- no hay reconstrucción ni overlay;
- Fase A `PRODUCTION_ACCEPTED`.

## 8. Iteración posterior separada — actualización de datos

### ITERACIÓN 6 — DATA REFRESH 2026-08-01 A 2026-08-31

Esta iteración NO bloquea el go-live de software y NO se mezcla con la reparación de release.

Decisión congelada:
- durante Iteraciones 0-5 se trabaja con los datos actuales con corte 2026-07-31;
- después de `PRODUCTION_ACCEPTED`, se incorporan fuentes desde 2026-08-01 hasta 2026-08-31;
- cada fuente se procesa por separado;
- dry-run obligatorio;
- conciliación y deduplicación;
- trazabilidad por registro;
- before/after integrity;
- no inferir datos faltantes entre fuentes;
- ninguna escritura productiva sin autorización explícita del refresh.

Por tanto, NO solicitar datos nuevos a Paula antes de estabilizar el software, salvo que una prueba revele que una capability no puede validarse con el dataset existente.

## 9. Definición de terminado

Orbit Fase A solo se considera terminado cuando simultáneamente:

1. capability manifest completo PASS;
2. clean source PASS;
3. un solo index productivo PASS;
4. artifact inmutable PASS;
5. preview exacto PASS;
6. matriz E2E Fase A PASS;
7. mismo artifact en producción PASS;
8. rehash remoto PASS;
9. postprod browser PASS;
10. integridad de datos before/after PASS;
11. rollback probado/disponible;
12. estado de recuperación cerrado como `PRODUCTION_ACCEPTED`.

## 10. Política anti-loop

- Un fallo funcional no autoriza reabrir infraestructura no relacionada.
- Un fallo de infraestructura no autoriza reescribir módulos aprobados.
- Un fallo de validator no se clasifica como defecto de producto hasta reproducción causal.
- Un fallo después del build nunca se corrige modificando el artefacto; se corrige source y se genera digest nuevo.
- Cada iteración tiene un único gate de salida y un único estado autoridad.
- No existen estados narrativos paralelos en PR bodies/conversaciones.
- No se crean ramas one-shot por cada validación ordinaria.

## 11. Número de iteraciones comprometido

Producción Fase A: 6 iteraciones numeradas 0 a 5.

Actualización de datos al 31 de agosto: Iteración 6 posterior a producción.

No se amplía el número de iteraciones por cada bug encontrado: una corrección permanece dentro de la iteración/gate donde fue detectada. Si un gate no pasa, no se avanza al siguiente.

## 12. Herramientas

- GitHub: mismo repositorio, rama de recovery.
- Firebase: mismo proyecto actual, Hosting preview/channel + producción.
- GitHub Actions: CI reproducible del clean artifact.
- Browser E2E/Playwright: validación real por roles/superficies.
- Codex: recomendado para la consolidación mecánica de lineage, dependency graph y clean source si está disponible conectado a este mismo repositorio; no crea una segunda fuente de verdad.
- ChatGPT: coordinación/análisis; nunca autoridad documental.
